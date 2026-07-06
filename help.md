# Help Needed — Followers Marble Race
_Things only I (the human) can do. Check off as completed._

## Blocks Stage 1 (Core Race Engine)
- [ ] None — Stage 1 only needs local placeholder images + a Python environment, nothing external.

## Blocks Stage 2 (Rendering Pipeline)
- [ ] Install Node.js + set up a Remotion project (`npx create-video@latest`) — needed before any rendering work starts.
- [ ] Pick/source a royalty-free looping background music track (or a small library of a few tracks) for the video's audio bed — e.g. YouTube Audio Library, Pixabay Music, or a licensed source. Confirm it's safe to use on a video posted to Instagram.

## Blocks Stage 3 (Real Data Sources)
- [ ] **Official export path**: Go to Instagram → Settings → "Download Your Information," request a JSON export of your account data (includes your followers list). This can take a few hours to a day for Instagram to generate — request it early since Stage 3 needs a real export to build the parser against.
- [ ] **instagrapi path**: Decide which Instagram account you're willing to use for the unofficial scraper (understand the ban/flag risk before committing — consider a secondary/burner account rather than your primary one). Have its login credentials ready — they'll go in a local `.env` file (already covered by `.gitignore`), never committed to the repo.

## Blocks GitHub setup
- [ ] Decide: should the GitHub repo be **public or private**? (Recommend private, since it may end up containing Instagram-account-adjacent config even if credentials themselves stay out of git.)
- [ ] Confirm the repo name (defaulting to `followers-marble-race` unless you want something else).
- [ ] If `gh` CLI isn't installed/authenticated when we get there, run `gh auth login` first, or create the repo manually at github.com and share the remote URL.

## Blocks 6-12mo horizon (web app, scheduled posting)
- [ ] Not needed yet — revisit once v1 (all 3 modes) is working. Will likely need: a hosting account (e.g. Vercel/Fly.io) for the web app, and Instagram Graph API / Meta Developer app approval for scheduled posting (this has its own review process — worth starting early once you're ready to pursue it, since Meta's app review can take time).
