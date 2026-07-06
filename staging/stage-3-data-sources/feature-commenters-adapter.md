# Feature: Post Commenters Adapter (instagrapi)

## What it is
A `FollowerSource` that races the **commenters of one Instagram post** (rather than an account's followers). You give it a post URL; it pulls the post's comments, downloads each commenter's profile photo, and returns one `Racer` per commenter — the "comment to enter the race" format.

Built as `engine/sources/post_commenters.py` (`PostCommentersSource`), with `engine/tests/test_post_commenters.py`. Driven end-to-end by `engine/scripts/run_commenter_race.py`.

## Status — WORKING, live-verified ✅
A real end-to-end run succeeded: fed a real post URL, fetched **73 real commenters**, downloaded their profile photos, simulated the race, and rendered a 1080×1920 MP4 with music showing every commenter's avatar + a full ranked results screen. This is the first fully real (non-placeholder) video the project has produced.

## Library: instaloader → instagrapi (important)
Originally built on `instaloader` (per the feasibility research, which confirmed the API shape *from the docs*). But **against live Instagram, instaloader's comment/metadata endpoints are blocked**: the web GraphQL query returns `{"errors":[{"message":"execution error"}]}` and the mobile fallback returns a generic `"fail"` — even with a valid, logged-in session (own-profile reads worked fine, so it wasn't auth or rate-limit). Switched to **`instagrapi`**, whose fuller mobile-app emulation gets through where instaloader can't. instagrapi was already the project's planned library for the follower scraper, so this consolidates on one library.

## How it works
1. `extract_shortcode(url)` — pure; validates it's a `/p//reel//tv/` URL.
2. Auth: `Client().login_by_sessionid(IG_SESSIONID)` — a **browser sessionid** (copied from a logged-in Chrome/Firefox session). This is the key to reliability: a browser session carries trust tokens that a fresh username/password login lacks, so it sidesteps the "suspicious new-device login" throttle (a fresh `login()` got `401 "please wait a few minutes"` on everything).
3. `client.media_pk_from_url(url)` → `client.media_comments(media_pk, amount=0)` (all comments).
4. Each `comment.user` → normalized `Owner(userid, username, profile_pic_url)`, deduped by user id.
5. Each `profile_pic_url` downloaded (HTTPS + Instagram-CDN-host + image-magic validated) into a local cache; `Racer(id="ig-<userid>", username, avatar_path)` built per commenter.

## Configuration (constructor)
- `post_url`, `cache_dir`.
- `sessionid` / env `IG_SESSIONID` (the browser session token; lives in gitignored `.env`).
- `max_commenters=None` — **no cap by default** (per the user: all commenters; the real run pulled 73). `fetch(limit)` can tighten per-call.
- `extra_entries: Mapping[str, int]` — **"add extra marbles of the same commenter."** Maps a username (case-insensitive) → bonus marbles; each extra is a distinct marble (`ig-<userid>-x2`, `-x3`, …) sharing the same face/name, unique id.

## Error handling
- Private/deleted/unavailable post (`MediaNotFound` / `ClientNotFoundError`) → `PostUnavailableError`.
- A commenter whose avatar can't be fetched (or comes back non-image) is logged and skipped.

## Tests
18 unit tests, 95% module coverage. Inject a fake instagrapi client + monkeypatch `requests.get`, so the suite runs green **without hitting the live API** and without needing real creds.

## Known constraints / open items
- **Fragile by nature.** This is unofficial private-API scraping; Instagram can break instagrapi (as it already broke instaloader) at any time. If a future run fails, expect to update instagrapi and/or re-import a fresh browser session.
- **Auth via browser sessionid.** A fresh `login(user, pass)` on this account got throttled; the working path is importing a logged-in browser session's `sessionid`. Session tokens expire — you'll periodically re-copy one.
- **Replies not included.** Top-level comments only (matches the user's choice). Reply authors would need extra instagrapi calls; deferred.
- **Consent/ToS.** Scraping via a logged-in session violates Instagram's ToS (accepted risk for a personal tool). Putting commenters' photos in a shareable video is a separate consent consideration if posted publicly — the user's call.
