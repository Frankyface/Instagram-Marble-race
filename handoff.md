# Handoff — Followers Marble Race
_Last updated: 2026-07-06 · Current stage: Stage 2 — Rendering Pipeline (functionally complete)_

## 🎯 Goals
Stage 1 (core race engine) and Stage 2 (Remotion rendering pipeline) are both built and verified. A real 30-racer manifest now renders end-to-end into a shareable vertical MP4 with track/marbles/camera-follow, a full results screen, and a background-music track. Next goal is Stage 3 — replace placeholder avatars with real Instagram follower data via the two pluggable `FollowerSource` adapters.

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
1. Start Stage 3 (Real Data Sources) — see `staging/stage-3-data-sources/overview.md`. Needs the human to request a Meta data export and decide on an instagrapi account (both flagged in `help.md`).
2. Still needed from the user: a real royalty-free background music track (current one is a silent placeholder) — swap-in point is `renderer/src/audio.ts`'s `backgroundMusic` subscriber, no restructuring needed.
3. When Stage 4 (Elimination) starts: budget real design time for `physics.py`'s loop restructuring and the finish-handling body-lifecycle change — see `feature-race-engine.md`'s corrected "Extension hook points" note.
4. When real event-timed SFX are added (Stage 4+): `AudioCue` needs a per-cue timing field and `RaceComposition` needs per-cue `<Sequence>` wrapping — see the corrected note in `feature-audio-layer.md`.

## 🔗 Pointer
→ Current stage folder: `staging/stage-2-rendering-pipeline/` (functionally complete) · Next stage folder: `staging/stage-3-data-sources/` · Active feature file once Stage 3 starts: `staging/stage-3-data-sources/feature-official-export-adapter.md`
