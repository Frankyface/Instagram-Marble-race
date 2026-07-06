# Help Needed — Followers Marble Race
_Things only I (the human) can do. Check off as completed._

## Blocks Stage 1 (Core Race Engine)
- [ ] None — Stage 1 only needs local placeholder images + a Python environment, nothing external.

## Blocks Stage 2 (Rendering Pipeline)
- [x] Node.js (v24.15.0) + npm (11.16.0) confirmed installed. Remotion project scaffolded manually in `renderer/` rather than via the interactive `npx create-video@latest` wizard (not usable in a non-interactive shell) — same end result, hand-written `package.json`/`remotion.config.ts`/`src/Root.tsx`.
- [x] Rendering pipeline built and verified end-to-end (`node scripts/render.mjs`) — real 30-racer manifest renders into a 1080x1920 MP4 with track/marbles/camera-follow/podium and an audio track.
- [ ] **Pick/source a real royalty-free looping background music track** for the video's audio bed — e.g. YouTube Audio Library, Pixabay Music, or a licensed source. Confirm it's safe to use on a video posted to Instagram. A silent placeholder (`renderer/public/audio/background.wav`, generated locally) stands in for now; once you have a real track, replace that file (keep the `.wav` extension, or update the `src` field in `renderer/src/audio.ts`'s `backgroundMusic` subscriber if using a different format like `.mp3`) — no other code changes needed.

## Blocks Stage 3 (Real Data Sources)
- [ ] **Commenters path (instaloader — BUILT, needs creds to run live)**: The `PostCommentersSource` adapter is built and unit-tested. To actually run it against a real post, you need to:
  1. `cd engine && .venv/Scripts/python.exe -m pip install instaloader` (declared in `pyproject.toml`; not yet installed — I can run this for you when you're ready).
  2. Decide which Instagram account logs in — **strongly recommend a secondary/burner account**, not your primary, because of the (real but undocumented) account-ban risk of unofficial scraping. Comment retrieval and HD avatars both require login.
  3. Put its creds in a local `.env` (already gitignored, never committed):
     ```
     IG_USERNAME=your_burner_handle
     IG_PASSWORD=your_burner_password
     # IG_2FA_CODE=123456   # only if the account has 2FA, and only for the first login
     ```
     After the first successful login, instaloader saves a session file and reuses it — you won't need the password on later runs.
- [ ] **Official export path**: Go to Instagram → Settings → "Download Your Information," request a JSON export of your account data (includes your followers list). This can take a few hours to a day for Instagram to generate — request it early since the official-export adapter needs a real export to build against.
- [ ] **instagrapi path**: Decide which Instagram account you're willing to use for the unofficial *follower* scraper (same ban/flag considerations as the burner above). Creds go in the same local `.env`.

## Blocks GitHub setup
- [x] Repo created manually at [github.com/Frankyface/Instagram-Marble-race](https://github.com/Frankyface/Instagram-Marble-race) (`gh` CLI isn't installed locally, so this was done via the GitHub web UI instead of `gh repo create`).
- [x] Local repo initialized, all scaffold files committed, remote `origin` set to this repo, local branch renamed `master` → `main` to match.
- [ ] **Push the initial commit** — this is the one step left for you to run manually (kept manual on purpose rather than auto-pushed):
  ```
  cd "Followers Marble Race"
  git push -u origin main
  ```
  If GitHub prompts for auth (no `gh` installed to handle it), use a personal access token as the password, or set up the GitHub CLI (`gh auth login`) / Git Credential Manager first.
- [ ] Optional: install `gh` CLI (`winget install --id GitHub.cli`) so future repo operations (PRs, issues) can be automated instead of manual.

## Blocks 6-12mo horizon (web app, scheduled posting)
- [ ] Not needed yet — revisit once v1 (all 3 modes) is working. Will likely need: a hosting account (e.g. Vercel/Fly.io) for the web app, and Instagram Graph API / Meta Developer app approval for scheduled posting (this has its own review process — worth starting early once you're ready to pursue it, since Meta's app review can take time).
