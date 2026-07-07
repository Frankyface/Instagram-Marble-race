# Handoff — Followers Marble Race
_Last updated: 2026-07-07 · Current stage: Stage 6 — Web App + Level Editor (PIVOTED to coloured-balls; **S0–S6 BUILT + VERIFIED** — working app: editor + live preview + MP4 export. S7–S10 remain.)_

## 🏗️ Build status (2026-07-07) — S0–S6 done, verified in-browser
The coloured-balls web app is **built and working** in `web/` (branch `stage-6/web-app`, uncommitted). Verified via `vitest` (21 tests) + `npm run build` + live browser preview (python http.server on `web/dist`, screenshots).
- **S0** ✅ Vite 8 + React 19 + TS scaffold; GitHub Pages Actions workflow (`.github/workflows/deploy-pages.yml`); relative `base:"./"` (repo-name-agnostic). Build clean, renders in browser. NOT yet pushed/deployed (awaiting user go).
- **S1** ✅ Level format ported + Zod schema (`web/src/level/schema.ts`); validates `classic-funnel.json`, round-trips, rejects bad input. 8 tests.
- **S2** ✅ Deterministic Rapier core (`web/src/race/engine.ts`, `@dimforge/rapier2d-compat`); fixed 1/60 dt, mulberry32 seed. Tests: bit-identical two-run determinism, seed sensitivity, 16/16 + 48/48 finish. `cameraTargetY` (monotonic) in the frame.
- **S3** ✅ Shared `render()` (`web/src/render/render.ts`) + camera (`camera.ts`); resolution-parameterized (scale test passes) + camera-follows-leader.
- **S4** ✅ Live preview (`web/src/app/raceController.ts` rAF fixed-timestep + `RacePreview.tsx`); ball-count 2–64 (default 16); OKLCH golden-ratio colours (`render/colors.ts`, culori). Verified: 16 & 40 balls race live, distinct colours.
- **S5** ✅ Client-side MP4 export (`web/src/export/exportMp4.ts`, WebCodecs + Mediabunny). Verified in-browser: real 1080×1920 H.264 MP4, dur = frames/60 (frame-identical to preview), ~1.9s encode for a 4s video, 2.8 MB download. Dry-run gate (`probeMp4Support`) works. NO SharedArrayBuffer needed.
- **S6** ✅ react-konva editor (`web/src/editor/Editor.tsx` + `model.ts`); palette (peg / peg-row / funnel / wall), drag-move, delete, pan (wheel), Test Race (compile→Zod→race), Save/Load JSON. Verified: added a peg row → Test Race → raced the edited level (frame count changed). Model: 5 tests.
- Bundle ≈ 2.5 MB / 869 kB gzip (Rapier base64 wasm ~730 kB gzip + Konva). Code-splitting deferred to S8.

**Known minor items / deferred:** Rapier `World` ctor logs a harmless "deprecated parameters" console warning. Editor re-seeds from the current level on each open (no undo/redo or autosave yet — S6b/S6c). Bundle not code-split. `web/README.md` still describes the OLD (pre-build) plan.


## 🎯 Goals
**PIVOTED (2026-07-07).** Ship ONE static browser web app: a visual **track/level editor** + **live race preview** + **client-side MP4 export**, where the racers are N plain **distinctly-coloured balls** (default 16, adjustable 2–64, no names/avatars). Hosted on **GitHub Pages** (static only — no server). Full scope includes **elimination + brackets**, **camera-follows-leader** scroll, **silent** v1. Built in the existing repo's `web/`. The old Instagram-avatar concept and its Python/Remotion pipeline are **retired** (kept only as reference). Stages 1–3 (Python engine, Remotion renderer, commenters adapter) are historical context below.

## 🆕 Most recent work (2026-07-07 — PROJECT PIVOT to a coloured-balls web app)
Marbles are no longer Instagram avatars — they are N plain, distinctly-coloured balls (default 16, adjustable 2–64, no identity). The Instagram/`instagrapi` fetch pipeline is **retired entirely** (no server-side anything). Deliverable = ONE static browser web app (editor + live preview + client-side MP4 export) on **GitHub Pages** (static only, no custom headers). User-locked scope: **elimination + brackets**, **camera-follows-leader**, **silent** v1, in the existing repo's `web/`.

A research+design workflow (5 research lenses + synthesis + adversarial critique) **verified the hard constraint**: client-side H.264 MP4 export works on GitHub Pages via **WebCodecs `VideoEncoder` + Mediabunny** — needs only HTTPS, NOT cross-origin isolation/SharedArrayBuffer (so Pages' inability to set COOP/COEP is a non-issue). `ffmpeg.wasm` fast path is blocked on Pages (needs SharedArrayBuffer); single-thread is fallback-only. Locked stack: **Vite + React + TS**, **Rapier2D** (`@dimforge/rapier2d-compat` — deterministic single-thread, base64-inlined wasm; beats planck.js now that pymunk-parity is moot), **hand-written Canvas 2D** with ONE shared `render()` for preview AND export, **react-konva** palette editor, **`culori`** OKLCH auto-distinct ball colours, **Zod** validation, `mulberry32` seeded PRNG.

Critique verdict **SOUND-WITH-FIXES** (all baked into the plan): (1) Firefox `isConfigSupported()` false-positives for H.264 → gate export on a real **one-frame encode dry-run**, not the probe. (2) `VideoFrame.close()` every frame + `encodeQueueSize` backpressure (OOM footgun). (3) `render()` must be **fully resolution-parameterized** (level-units × scale, no pixel literals) or preview ≠ 1080×1920 export. (4) WebM fallback is a **labelled degraded** path, never a silent swap. (5) editor split into 4 sub-stages incl. tall-level **pan/zoom**. Full plan: `staging/stage-6-web-editor-app/overview.md`.

## 🗂️ Earlier work (Stage 3 — commenters adapter, live-verified) — HISTORICAL (pipeline now retired)
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
- 2026-07-06 (entries + fairness + batch): (1) **Spawn-order fairness fix** in `physics.py` — marbles now get a seeded-shuffled spawn slot, so the first-listed racer no longer always lands in the top row (a permanent head start that made the same marble win every seed). Different seeds now yield different winners. (2) **Extra entries** — `run_commenter_race.py` has an `EXTRA_ENTRIES` dict (user-provided bonus marbles for specific commenters, same face/name + unique ids) applied to both fetch and resim paths. 73 commenters → 92 marbles. (3) **Defaults retuned for the larger field** — width 900, 14 rows, 45s (92 marbles clog at the old 720/18/32). Now 76-83/92 finish per seed, so the top-25 podium is real. Generated 5 seed manifests + rendered 5 videos to `renderer/output/batch/race_1..5.mp4`.
- 2026-07-06 (race quality pass, user feedback): (1) **Accurate results** — added sub-step finish-time interpolation in `physics.py` so marbles crossing in the same physics step get distinct, correctly-ordered times (was tie-broken by list order); and made the course finishable so the visible top-25 are all real finishers, not depth-ranked stragglers. (2) **Longer + more complex course** — `run_commenter_race.py` defaults now length 4000 / 18 peg rows, with tuned physics (gravity 1200, moderate bounce) to keep the pack bunched; all adjustable via flags. (3) **Camera fixed** — `camera.ts` now follows the live leader (excludes marbles frozen at the finish line, so it no longer locks onto the winner), scrolls only downward (monotonic), and frames the leader near the BOTTOM so the chasing pack fills the view above (was keeping the leader 1/3 down, wasting the lower frame on empty course). (4) **Podium zoom + scroll** — `Podium.tsx` shows a large, readable top-25 and auto-scrolls through them over the podium phase (was 73 tiny rows crammed on one screen). Re-verified via a real render (42/73 finish, winner @philliy_27, pack visible mid-race, podium readable). Physics tuning is empirical — easy to keep dialing via the run flags + the two elasticity/gravity constants.
- 2026-07-06: Ran `/code-review` (medium effort, 8 finder angles) on Stage 2. Fixed: a real crash path (empty-`frames` manifest indexed `frames[-1]` → crash inside `getCameraOffsetY`, now guarded in `RaceComposition.tsx`); a real visual bug (`Track.tsx`'s walls were drawn inset by the full `wallThickness` from the track edge, but pymunk's wall Segments are centered on the track boundary lines — walls now correctly centered, matching where marbles actually collide); consolidated `camera.ts`'s two independent "find the leader" scans (`getLeaderY` + `getLeaderId`, flagged independently by 4 of the 8 review angles) into one `getLeader()`; memoized `Track`/`Podium` with `React.memo` (were rebuilding ~30 static DOM nodes every single frame - 1800 times for Track, 150 for Podium - for zero visual change); added real structural validation in `render.mjs` (racers/frames/track presence, not just `schemaVersion`) so a malformed manifest fails with a clear message instead of crashing deep inside a component; converted `types.ts` from `interface` to `type` per the project's TS conventions. Also corrected two docs: `feature-remotion-setup.md` overstated avatar copying as "regenerated per render" when it's actually skip-if-cached (a real, documented limitation now); `feature-audio-layer.md` overstated "no restructuring needed" for future SFX — true for another whole-duration audio layer, not for genuinely event-timed SFX (no per-cue timing field exists yet). Deferred as acceptable for now: `schema.ts`'s Zod schema is still a type-level formality (`z.any()` cast) rather than real runtime validation — the new `render.mjs` checks cover the practical risk this created.
- 2026-07-06: Stage 2 rendering pipeline built end-to-end (see Current State above). Extended the Stage 1 manifest schema to `schemaVersion: 2` (added `track` geometry) after discovering Remotion needs it — resolved all three of `feature-remotion-setup.md`'s open questions (avatar cropping via CSS not Python, avatars copied into `public/avatars/` by the render script, a wrapper script is required not optional) plus `feature-video-composition.md`'s and `feature-audio-layer.md`'s open questions. All documented inline in those files.
- 2026-07-06: Formally verified Stage 1 against 12 explicit, checkable acceptance criteria — all 12 PASS. Full report in `staging/stage-1-core-engine/overview.md`.
- 2026-07-06: Ran `/code-review` on Stage 1; corrected an overclaim about Stage 4/elimination readiness in `feature-race-engine.md` (brackets are engine-ready, elimination is not - see that file for specifics); fixed a stale doc, added validation guards.
- 2026-07-06: Project scaffolded and Git remote set up (see prior entries in git history / `help.md`).

## ❌ Tried But Failed
- **Turning off ball-ball collision (user request) — dead end with the peg course.** Tried group filter (no ball-ball collision) + many physics tunings (frictionless pegs/walls, high bounce, sideways spawn kick, small/sparse pegs, more time). Result: round pegs need marbles bumping each other to stay moving; without ball-ball collisions a large fraction settle and FREEZE on the pegs (verified: at 60s, all 38 non-finishers frozen). Video looked sparse/broken (only 2-3 marbles ever visible, half frozen). Reverted to collision-ON. The correct fix if the "pass through each other" look is wanted: an ANGLED-DEFLECTOR course (a marble on a frictionless slope can't come to rest) — needs the ramp geometry (model + manifest + renderer), which ties in with the Stage 6 level editor.
- Stage 1: finished marbles free-falling forever past the finish line (fixed by freezing position + removing the body from the simulation).
- Stage 2: assumed `calculateMetadata` could read files via `node:fs` since it "runs in Node" — wrong. Everything in `src/` is webpack-bundled for the browser render context; `node:`-scheme imports aren't handled by webpack's defaults, and even bare `fs`/`path` imports fail to resolve (no Node polyfills configured). Fixed by moving all file I/O into `scripts/render.mjs`, a plain unbundled Node script that passes fully-resolved data into the composition as `inputProps`.
- Stage 2: `zod` installed at its latest (4.4.3) initially — Remotion 4.0.485 requires exactly 4.3.6 and warns loudly about version mismatches. Pinned to the exact required version.

## ➡️ Next Up — Stage 6 (Coloured-Balls Web App + Level Editor), build starting
Research + plan locked (SOUND-WITH-FIXES). Full plan + decisions + risks: `staging/stage-6-web-editor-app/overview.md`.

Locked stack: Vite + React + TS · Rapier2D (`@dimforge/rapier2d-compat`) · Canvas 2D shared `render()` · WebCodecs + **Mediabunny** MP4 export · **react-konva** editor · `culori` OKLCH ball colours · Zod · `mulberry32` seed.

Build order (each stage independently verifiable):
- **S0** Static Vite+React+TS scaffold auto-deployed to the live GitHub Pages URL (base = repo subpath, 404.html SPA fallback, Actions `deploy-pages`).
- **S1** Port the Level format + Zod schema; validate + round-trip `web/levels/classic-funnel.json`.
- **S2** Deterministic Rapier core (fixed 1/60 dt, `mulberry32` seed) — two runs assert bit-identical positions; all balls finish within a frame cap.
- **S3** Shared, **resolution-parameterized** `render(ctx,state,frame)` (Canvas 2D) + camera-follows-leader scroll.
- **S4** Live preview (rAF fixed-timestep accumulator) + ball-count control (default 16, 2–64) + OKLCH auto-distinct colours.
- **S5** 1080×1920 MP4 export (Mediabunny/WebCodecs) — verified frame-identical to preview; `VideoFrame.close()` + backpressure; Firefox one-frame dry-run gate.
- **S6a–d** react-konva editor: place/move + tall-level pan/zoom → transform/snap → undo/redo/autosave/import-export → `compileToLevel` (Zod). End-to-end author → Test Race → Export.
- **S7** Cross-browser hardening + labelled WebM (or single-thread ffmpeg.wasm) fallback; codec dry-run detection.
- **S8** Perf (64-ball export) + intentional (non-template) UI design pass + QA on the live Pages build.
- **S9** Elimination mode: gates cut the race into panels (quota passes a gate → panel reset, survivors restart) — sim + editor gate authoring + panel-transition camera/render.
- **S10** Brackets mode: multiple races, top-X advance across configurable rounds → final; stitched into one exported video.

Milestone order: single-race app end-to-end (**S0–S8**) ships first; **S9** (elimination) then **S10** (brackets) layer on the same continuous-race primitive.

### Retired (kept only as reference — do NOT put on the web hot path)
- Python `pymunk` engine (`engine/`), Node Remotion renderer (`renderer/`), `instagrapi`/FollowerSource fetch, avatar textures, precomputed JSON race-manifest.

### Carried / later
- Audio (music, then event SFX) is a post-v1 fast-follow — it touches the exporter (adds an AudioEncoder track). Sim should still emit a race-event stream so SFX slot in later.

## 🔗 Pointer
→ Current stage folder: `staging/stage-6-web-editor-app/` · **S0–S6 built + verified** (see Build status above). Active work: **S7** (cross-browser hardening + labelled WebM/ffmpeg fallback), then **S8** (perf incl. Rapier code-split + design pass + QA), **S9** (elimination/gates), **S10** (brackets). Run `web/`: `npm --prefix web run dev` (or build + serve `web/dist`); tests `npm --prefix web test`. Deploy: push branch→main + enable GitHub Pages (awaiting user authorization). Python engine / Remotion renderer / instagrapi are retired-as-reference.
