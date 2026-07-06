# Handoff — Followers Marble Race
_Last updated: 2026-07-06 · Current stage: Stage 3 — Real Data Sources (commenters adapter WORKING, live-verified)_

## 🎯 Goals
Stages 1 (engine) and 2 (renderer) are built and verified. Stage 3 (real Instagram data) has its first adapter working **end-to-end live**: `PostCommentersSource` races a post's commenters. A real run produced the project's first fully-real video (73 real commenters). Next: the official Meta-export and instagrapi *follower* adapters (the two other planned Stage 3 sources).

## 🆕 Most recent work (Stage 3 — commenters adapter, live-verified)
Added a `FollowerSource` that races the **commenters of one post** (not followers). The journey and final state:
- Ran a feasibility research workflow (12 agents) first, then built the adapter on **`instaloader`** per the docs.
- **Live run revealed instaloader is blocked by current Instagram**: its comment/metadata endpoints return `"execution error"` / generic `"fail"` even with a valid session (own-profile reads worked, so not auth/rate-limit). Diagnosed thoroughly (web GraphQL doc_id query + mobile fallback both rejected).
- **Switched the adapter to `instagrapi`** (the project's other planned library), whose fuller mobile-app emulation works. Rewrote `engine/sources/post_commenters.py` around it. Pure logic (extract_shortcode, dedupe, build_racers, extra_entries, avatar host/image guards) preserved; network methods now use instagrapi + `requests`.
- **Auth is via a browser `sessionid`** (`IG_SESSIONID` in gitignored `.env`), not username/password — a fresh `login()` got throttled (`401 "please wait a few minutes"`); the browser session carries the trust tokens that get through. (browser_cookie3 auto-import failed on Chrome's app-bound encryption, so the user copied the sessionid manually from DevTools.)
- Per the user's two adjustments: **no cap** by default (the real run pulled 73), and **`extra_entries`** to add bonus marbles for a specific commenter (unique ids like `ig-<userid>-x2`).
- `engine/scripts/run_commenter_race.py` — CLI: post URL → fetch commenters+avatars → simulate → manifest. Then the existing renderer produces the MP4.
- **Live result**: 73 real commenters fetched, avatars downloaded, raced, rendered to `renderer/output/commenter_race.mp4` (1080×1920, 65s, real faces + full ranked podium). Winner `@casswalden`.
- `engine/tests/test_post_commenters.py` — 18 tests, 95% coverage, fake instagrapi client + monkeypatched `requests.get` (no live API in tests). Full engine suite 45 tests / 97%.
- Deps: `pyproject.toml` now declares `instagrapi` (dropped `instaloader`). `.env` uses `IG_SESSIONID`.

## 📍 Current State
**Python engine** (`engine/`, own venv):
- `raceengine/` — track generator, pymunk physics sim (marbles freeze at the finish line), event stream, manifest assembly. Manifest now includes track geometry (`TrackInfo`: width/length/obstacles) — added mid-Stage-2 once the renderer revealed it needed this; bumped `schemaVersion` to 2.
- `sources/` — `FollowerSource` Protocol + a local-folder placeholder adapter (Stage 3 adds the real ones).
- `scripts/run_sample_race.py` — CLI producing a real manifest at `engine/output/sample_race.json`.
- 27 tests, 98% coverage, all passing.

**Remotion renderer** (`renderer/`, own `node_modules`):
- `src/` — pure, side-effect-free composition code: `RaceComposition.tsx` (ties everything together), `components/Track.tsx`, `components/Marble.tsx` (avatar-textured circle, CSS-cropped), `components/Podium.tsx` (full ranked results), `camera.ts` (leader-follow scroll), `audio.ts` (event-driven subscriber array, music-only in v1), `types.ts`/`schema.ts` (manifest typing).
- `scripts/render.mjs` — plain Node script (NOT bundled) that reads a manifest JSON, copies avatars into `public/avatars/`, and drives Remotion's programmatic render API.
- Verified end-to-end: `node scripts/render.mjs` against the real Stage 1 sample manifest produced a 1080x1920 h264 MP4, 65s (1950 frames = 1800 race + 150 podium), with a full-length AAC audio track. Visually confirmed via extracted frames — track/marbles/camera-follow look correct mid-race, and the podium shows all 30 racers ranked with avatars.

**Real architectural finding from Stage 2**: Remotion bundles everything in `renderer/src/` for the browser/headless-Chrome context — no `fs`/`path` access anywhere in there, including inside `calculateMetadata`. This is now documented in `CLAUDE.md` and is why manifest-loading/avatar-copying lives in `scripts/render.mjs` instead of inside the composition.

## 📂 Files I'm Working On
- `engine/raceengine/models.py`, `manifest.py`, `race.py`, `physics.py` — extended for `TrackInfo` (done)
- `renderer/src/` — full composition (done for Stage 2 scope)
- `renderer/scripts/render.mjs` — render entrypoint (done)

## ✅ Things I've Changed
- 2026-07-06: Ran `/code-review` (medium effort, 8 finder angles) on Stage 2. Fixed: a real crash path (empty-`frames` manifest indexed `frames[-1]` → crash inside `getCameraOffsetY`, now guarded in `RaceComposition.tsx`); a real visual bug (`Track.tsx`'s walls were drawn inset by the full `wallThickness` from the track edge, but pymunk's wall Segments are centered on the track boundary lines — walls now correctly centered, matching where marbles actually collide); consolidated `camera.ts`'s two independent "find the leader" scans (`getLeaderY` + `getLeaderId`, flagged independently by 4 of the 8 review angles) into one `getLeader()`; memoized `Track`/`Podium` with `React.memo` (were rebuilding ~30 static DOM nodes every single frame - 1800 times for Track, 150 for Podium - for zero visual change); added real structural validation in `render.mjs` (racers/frames/track presence, not just `schemaVersion`) so a malformed manifest fails with a clear message instead of crashing deep inside a component; converted `types.ts` from `interface` to `type` per the project's TS conventions. Also corrected two docs: `feature-remotion-setup.md` overstated avatar copying as "regenerated per render" when it's actually skip-if-cached (a real, documented limitation now); `feature-audio-layer.md` overstated "no restructuring needed" for future SFX — true for another whole-duration audio layer, not for genuinely event-timed SFX (no per-cue timing field exists yet). Deferred as acceptable for now: `schema.ts`'s Zod schema is still a type-level formality (`z.any()` cast) rather than real runtime validation — the new `render.mjs` checks cover the practical risk this created.
- 2026-07-06: Stage 2 rendering pipeline built end-to-end (see Current State above). Extended the Stage 1 manifest schema to `schemaVersion: 2` (added `track` geometry) after discovering Remotion needs it — resolved all three of `feature-remotion-setup.md`'s open questions (avatar cropping via CSS not Python, avatars copied into `public/avatars/` by the render script, a wrapper script is required not optional) plus `feature-video-composition.md`'s and `feature-audio-layer.md`'s open questions. All documented inline in those files.
- 2026-07-06: Formally verified Stage 1 against 12 explicit, checkable acceptance criteria — all 12 PASS. Full report in `staging/stage-1-core-engine/overview.md`.
- 2026-07-06: Ran `/code-review` on Stage 1; corrected an overclaim about Stage 4/elimination readiness in `feature-race-engine.md` (brackets are engine-ready, elimination is not - see that file for specifics); fixed a stale doc, added validation guards.
- 2026-07-06: Project scaffolded and Git remote set up (see prior entries in git history / `help.md`).

## ❌ Tried But Failed
- Stage 1: finished marbles free-falling forever past the finish line (fixed by freezing position + removing the body from the simulation).
- Stage 2: assumed `calculateMetadata` could read files via `node:fs` since it "runs in Node" — wrong. Everything in `src/` is webpack-bundled for the browser render context; `node:`-scheme imports aren't handled by webpack's defaults, and even bare `fs`/`path` imports fail to resolve (no Node polyfills configured). Fixed by moving all file I/O into `scripts/render.mjs`, a plain unbundled Node script that passes fully-resolved data into the composition as `inputProps`.
- Stage 2: `zod` installed at its latest (4.4.3) initially — Remotion 4.0.485 requires exactly 4.3.6 and warns loudly about version mismatches. Pinned to the exact required version.

## ➡️ Next Up — Stage 6 (Web App + Level Editor) is the current focus
User decisions (2026-07-06): **browser-first (physics ported to JS/planck.js), one cohesive web app (editor + URL→video flow together), personal use (one IG session, no auth).** Planning done; keystone started. This session is very long — continue Stage 6 in a fresh session using `new_session_prompt.md`. Full plan: `staging/stage-6-web-editor-app/overview.md`.

Build order:
1. Scaffold `web/` as Vite + React + TS; add `planck` (JS physics) + `@remotion/player`. (`web/` today holds only the keystone: `src/level/types.ts` + `levels/classic-funnel.json` + README.)
2. W2 JS physics (planck.js): Level + N marbles → frame positions + events, same race-manifest shape the Python engine produces. Re-tune fresh in JS; don't chase pymunk parity.
3. W3 app shell: load a level → run sim → play via Remotion Player in-browser.
4. W4 canvas level editor (palette pieces → compiled to walls/pegs).
5. W5 thin local Python `/commenters` API wrapping `engine/sources/post_commenters.py`.
6. W6 MP4 export — reuse the Node Remotion renderer (`renderer/`).

Hard constraint: the Instagram fetch (instagrapi) and MP4 encoding stay server-side; everything else client-side.

### Lower priority / carried
- Refresh `IG_SESSIONID` in `engine/.env` when it expires (`help.md`).
- Real royalty-free music track (swap `renderer/src/audio.ts`'s `backgroundMusic` src).
- Stages 4 (elimination) / 5 (brackets) on the Python engine; the other two Stage 3 adapters — none block Stage 6.

## 🔗 Pointer
→ Current stage folder: `staging/stage-6-web-editor-app/` · Active feature file: `staging/stage-6-web-editor-app/feature-level-format.md` (keystone; `web/src/level/types.ts` implements the draft). Stages 1–2 complete/verified; Stage 3 commenters adapter working + live-verified.
