# Feature: Post Commenters Adapter (instaloader)

## What it is
A `FollowerSource` that races the **commenters of one Instagram post** (rather than an account's followers). You give it a post URL; it pulls the post's comments, downloads each commenter's profile photo, and returns one `Racer` per commenter — the "comment to enter the race" format.

Built as `engine/sources/post_commenters.py` (`PostCommentersSource`), with `engine/tests/test_post_commenters.py`. Added at the user's request during Stage 3; uses `instaloader` (not the `instagrapi` library the follower adapter will use).

## Why it matters
It's a more engagement-driving format than racing followers, and it validated that the `FollowerSource` interface generalizes cleanly to a *different racer population* with **zero interface change** — the source carries its own target (a URL) in the constructor, exactly like `LocalFolderSource` carries a folder, so `fetch(limit) -> tuple[Racer, ...]` stays uniform.

## How it works (verified against instaloader docs — see the feasibility research)
1. `extract_shortcode(url)` — pure function; pulls the shortcode from `/p/`, `/reel/`, or `/tv/` URLs (strips query/hash).
2. Login (mandatory — comments + HD avatars are login-gated): reuse a saved session file if present, else `login()` with env creds, handling 2FA.
3. `Post.from_shortcode(context, shortcode)` → `post.get_comments()` → each `PostComment.owner` is a full `Profile`.
4. Dedup commenters by user id, download each `profile_pic_url` into a local cache dir, build `Racer(id="ig-<userid>", username, avatar_path)`.

## Configuration (constructor)
- `post_url` — the target post.
- `cache_dir` — where avatars are downloaded (predictable `<userid>.jpg` filenames; re-runs of the same post cost ~0 new requests).
- `ig_username` / env `IG_USERNAME`, `IG_PASSWORD`, optional `IG_2FA_CODE`.
- `include_replies=False` — top-level comments only by default; `True` also pulls reply authors.
- `max_commenters=None` — **no cap by default** (per the user: include all ~90 commenters; ~1 request each sits inside one rate-limit window). `fetch(limit)` can tighten it per-call.
- `extra_entries: Mapping[str, int]` — **"add extra marbles of the same commenter."** Maps a username (case-insensitive) to bonus marbles; each extra is a distinct marble (`ig-<userid>-x2`, `-x3`, …) sharing the same face/name but a unique id so the physics/render don't collide.

## Error handling
- Private/deleted/unavailable post → `PostUnavailableError`.
- HTTP 429 → instaloader self-throttles and retries; if it still surfaces, it propagates so the caller can back off.
- A commenter whose avatar can't be fetched is logged and skipped (doesn't crash the race).

## Status
- **Done:** adapter + 29 unit tests (99% module coverage). Tests use a fake `instaloader` injected via `sys.modules`, so the suite runs green **without instaloader installed** and never touches the live API.
- **Reviewed:** ran a 3-angle code review (correctness / security-credentials / conventions). Security/credential handling came back clean (password never logged or committed, `.env` gitignored). Fixes applied from the review: `extract_shortcode` now validates the URL is a real `/p//reel//tv/` post URL (via `urllib.parse`) instead of blindly taking the last path segment; `fetch(limit=0)` correctly returns zero racers (was an off-by-one returning one); `userid` is coerced to int (guarantees unique marble ids + prevents any path-traversal, skips non-numeric); avatar downloads are restricted to Instagram CDN hosts over HTTPS and validated as real JPEG/PNG bytes before caching (so an empty/HTML error body is never cached as a permanent broken `.jpg`); duck-typed params replaced with proper `Protocol`s.
- **Blocked on the user for a live run:** (a) `pip install instaloader` into the engine venv (declared in `pyproject.toml`, not yet installed); (b) a burner Instagram account's creds in a local `.env`. See `help.md`.

## Open Questions
- **Live behavior unverified.** The feasibility research confirmed the API shape from docs, but two things need checking against the installed version on first live run: whether `get_comments()` is iterate-once vs a resumable `NodeIterator`, and whether reading `profile_pic_url` really costs ~1 request per commenter (drives the realistic max-commenters number). Neither affects correctness, only run time / rate-limit budget.
- **Live-run wiring.** There's no CLI yet that goes URL → commenters → simulate → render in one command (the existing `run_sample_race.py` uses `LocalFolderSource`). A small script analogous to it — or a `--source commenters --url ...` flag — is the natural next step once creds exist.
- **Consent/ToS.** Scraping via a logged-in session violates Instagram's ToS (user's accepted risk for a personal tool). Separately, putting commenters' photos in a shareable video is a consent question if the output is ever posted publicly — worth the user deciding their own line (e.g. only their own posts, honor opt-outs).
- **`userid` attribute.** Dedup/filenames use `owner.userid`; the research confirmed `Profile.username` explicitly but flagged `userid` as conventional-verify-on-version. Confirm on first live run.
