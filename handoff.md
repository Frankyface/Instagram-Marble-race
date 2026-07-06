# Handoff — Followers Marble Race
_Last updated: 2026-07-06 · Current stage: Stage 2 — Rendering Pipeline (starting)_

## 🎯 Goals
Stage 1 formally verified complete (12/12 explicit acceptance criteria PASS — see `staging/stage-1-core-engine/overview.md`'s Verification Report). Now starting Stage 2 — build the Remotion rendering pipeline that turns a manifest into a shareable video.

## 📍 Current State
Python engine lives in `engine/` (own venv, pymunk/pytest/Pillow installed). Core race engine is built and tested:
- `raceengine/models.py` — immutable dataclasses (Racer, TrackConfig, RaceConfig w/ a `gates` field reserved for Stage 4, Frame, RaceEvent, RaceManifest, etc.)
- `raceengine/track.py` — procedural staggered-peg track generator (pymunk static geometry), deterministic per seed
- `raceengine/physics.py` — pymunk simulation loop; 120Hz physics stepped down to 30fps manifest samples; marbles freeze in place once they cross the finish line (fixed a real bug where finished marbles free-fell forever)
- `raceengine/events.py` — builds `marble_finish`/`race_complete` events + placements (`collision`/`gate_pass`/`panel_reset` reserved, unused)
- `raceengine/manifest.py` — assembles + JSON-serializes the manifest (`schemaVersion: 1`)
- `sources/base.py` + `sources/local_folder.py` — `FollowerSource` Protocol + a Stage 1 stub reading a local image folder
- `scripts/run_sample_race.py` — CLI: runs one race against `fixtures/avatars/` (40 generated placeholder PNGs) and writes a manifest JSON
- 27 tests, 98% coverage (`pytest --cov`), all passing (2 added by code review: track-width and negative-obstacle-count validation)

Empirical finding worth knowing: on a 4000-unit track with 30 marbles and default obstacle density, ~13% stall (don't reach the finish line) within a 60s time budget on one tested seed. The stall/timeout safety net handles this correctly (stragglers get placed, ranked by progress) — this isn't a bug, just real physics contention worth being aware of when tuning track length/duration later.

## 📂 Files I'm Working On
- `engine/raceengine/` — core engine package (done for Stage 1 scope)
- `engine/sources/` — FollowerSource interface + local-folder stub (done for Stage 1 scope; Stage 3 adds the real adapters)
- `engine/tests/` — full test suite (done for Stage 1 scope)
- `engine/scripts/run_sample_race.py` — sample-race CLI (done)

## ✅ Things I've Changed
- 2026-07-06: Formally verified Stage 1 against 12 explicit, checkable acceptance criteria (written into `staging/stage-1-core-engine/overview.md` before running them). All 12 PASS with concrete evidence (test/coverage output, a real double-run diff for determinism, direct manifest inspection for the finish-freeze and stall-safety-net behavior, a grep confirming zero engine-side coupling to any concrete `FollowerSource`). Full report in that file's "Verification Report" section.
- 2026-07-06: Ran `/code-review` (medium effort, 8 finder angles) on Stage 1. One important correction: `feature-race-engine.md` originally overclaimed that `RaceConfig.gates` was "the literal seam Stage 4 will consult" — review caught that nothing actually reads `config.gates`, `physics.simulate()`'s loop has no generic threshold hook, and finished-marble removal is incompatible with panel-reset's "reposition, don't remove" semantics. Doc corrected to say plainly that brackets (Stage 5) are engine-ready today but elimination (Stage 4) will need real changes to `physics.py`, not just filling in a blank. Also fixed: a stale draft manifest schema in `feature-event-system.md` still said `avatarRef` instead of the real `avatarPath` field; added validation guards in `track.py` for a track narrower than one marble and negative obstacle row/column counts; added a missing `-> None` return annotation. Deferred as low-priority/acceptable for now: simultaneous-finish tie-break uses input-list order rather than sub-tick arrival order; `manifest_to_dict` hand-rolls the dataclass→dict conversion (a field added to a model without updating this function would silently not appear in the manifest); the per-step racer scan in `physics.py` doesn't shrink as racers finish (fine at 30 racers, worth revisiting if follower counts grow much larger).
- 2026-07-06: Stage 1 core race engine built end-to-end (see Current State above). All open questions in `feature-race-engine.md`, `feature-physics-sim.md`, and `feature-event-system.md` resolved and documented inline in those files, with the real ones (bracket seeding, gate-quota schedule) carried forward to Stages 4-5.
- 2026-07-06: Git remote `origin` set to https://github.com/Frankyface/Instagram-Marble-race.git; local branch renamed `master` → `main`. Push is a manual step (see `help.md`).
- 2026-07-06: Project scaffolded (CLAUDE.md, docs/master_plan.md, 5-stage plan under staging/, help.md) from the kickoff interview.

## ❌ Tried But Failed
- Initial physics implementation let finished marbles keep free-falling past the (wall-less) end of the track — one marble drifted to y≈1.5 million over a 60s race. Harmless to placement/results logic, but would've rendered badly in Stage 2 and bloated the manifest. Fixed by freezing a marble's position and removing its body from the simulation the instant it crosses the finish line.

## ➡️ Next Up
1. Start Stage 2 (Rendering Pipeline) — see `staging/stage-2-rendering-pipeline/overview.md`. First step there: install Node.js + scaffold a Remotion project (flagged in `help.md`, blocks this stage).
2. When Stage 4 (Elimination) starts: budget real design time for `physics.py`'s loop restructuring and the finish-handling body-lifecycle change — see the corrected "Extension hook points" note in `feature-race-engine.md`. Don't assume `RaceConfig.gates` existing means the hard part is done.

## 🔗 Pointer
→ Current stage folder: `staging/stage-2-rendering-pipeline/` · Active feature file: `staging/stage-2-rendering-pipeline/feature-remotion-setup.md` · Previous stage (`staging/stage-1-core-engine/`) formally verified complete, 12/12 criteria PASS.
