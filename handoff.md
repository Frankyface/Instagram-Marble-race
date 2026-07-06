# Handoff — Followers Marble Race
_Last updated: 2026-07-06 · Current stage: Stage 3 — Real Data Sources (first adapter built)_

## 🎯 Goals
Stages 1 (engine) and 2 (renderer) are built and verified — a real 30-racer manifest renders end-to-end into a shareable vertical MP4. Stage 3 (real Instagram data) is now underway: the first adapter — `PostCommentersSource` (races a post's commenters via `instaloader`) — is built and unit-tested. Next: a live run once the user supplies burner-account creds, then the official-export and instagrapi follower adapters.

## 🆕 Most recent work (Stage 3 — commenters adapter)
At the user's request, added a `FollowerSource` that races the **commenters of one post** (not followers), using `instaloader`. Ran a feasibility research workflow first (12 agents, verified against the real instaloader docs — all core mechanics confirmed; login mandatory; 429 rate-limiting certain; account-ban risk real-but-undocumented). Then built:
- `engine/sources/post_commenters.py` — `PostCommentersSource` + `extract_shortcode()` + `PostUnavailableError`. Constructor takes a post URL (mirrors `LocalFolderSource`'s "source carries its target" pattern — zero interface change). `instaloader` imported lazily so the module + test suite work without it installed.
- Per the user's two adjustments: **no cap** by default (include all ~90 commenters), and an **`extra_entries`** option to add bonus marbles for a specific commenter (same face/name, unique marble ids like `ig-<userid>-x2`).
- `engine/tests/test_post_commenters.py` — 24 tests, 97% module coverage, fake `instaloader` injected via `sys.modules` so nothing hits the live API.
- Docs: `staging/stage-3-data-sources/feature-commenters-adapter.md`, updated stage-3 `overview.md`, `help.md` (burner creds + `.env` vars + `pip install instaloader`).
- **Blocked on the user for a live run**: `pip install instaloader` + burner Instagram creds in `.env` (`IG_USERNAME`/`IG_PASSWORD`/optional `IG_2FA_CODE`). Also still no CLI that goes URL → simulate → render in one shot (natural next step once creds exist).

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

## ➡️ Next Up
1. **Live-test the commenters adapter** once the user provides burner creds + installs instaloader (see `help.md`). Then build a small CLI/flag that goes post URL → `PostCommentersSource.fetch()` → `run_race()` → render, so a real commenter race can be produced end-to-end.
2. Build the other two Stage 3 adapters: official Meta export parser + instagrapi follower scraper.
3. Still needed from the user: a real royalty-free background music track (current one is a silent placeholder) — swap-in point is `renderer/src/audio.ts`'s `backgroundMusic` subscriber, no restructuring needed.
4. When Stage 4 (Elimination) starts: budget real design time for `physics.py`'s loop restructuring and the finish-handling body-lifecycle change — see `feature-race-engine.md`'s corrected "Extension hook points" note.
5. When real event-timed SFX are added (Stage 4+): `AudioCue` needs a per-cue timing field and `RaceComposition` needs per-cue `<Sequence>` wrapping — see the corrected note in `feature-audio-layer.md`.

## 🔗 Pointer
→ Current stage folder: `staging/stage-3-data-sources/` · Active feature file: `staging/stage-3-data-sources/feature-commenters-adapter.md` (built; live run pending user creds) · Stages 1 & 2 complete and verified.
