# Feature: Core Race Engine (Single Continuous-Scroll Race)

## What it is
The core primitive everything else composes on top of: one race, one track, marbles enter at the top, physics carries them down/through the track, camera follows the leader in a continuous scroll (no cuts) until the race finishes. First marble across the finish line wins; the full field gets a final placement order.

## Why it matters
Elimination and brackets are both defined as configuration on top of this primitive (per the kickoff interview) — get this right once, and both later modes are additive, not rewrites.

## Behavior
- Input: a list of "racers" (each with an avatar image reference + an ID), a track definition, a random seed.
- Output: a race manifest — frame-by-frame positions for every marble, a finish-order list, and a race-event stream.
- The "leader" for camera-follow purposes = the marble furthest along the track (needs a concrete metric — see Open Questions).
- Race ends when either all marbles finish, or a defined timeout/stall condition is hit (marbles stuck forever shouldn't hang the sim).

## Implementation (Stage 1 checkpoint)
Built in `engine/`: `raceengine.race.run_race(race_id, racers, config) -> RaceManifest` is the pure-function entrypoint (`raceengine/race.py`). Track is a vertical channel of static pymunk walls + staggered peg obstacles (`raceengine/track.py`), physics stepping + finish detection lives in `raceengine/physics.py`, event/results assembly in `raceengine/events.py`, JSON export in `raceengine/manifest.py`. 27 tests passing, 98% coverage. Verified end-to-end via `scripts/run_sample_race.py` against 40 generated placeholder avatars (`fixtures/`).

## Open Questions — resolved
- **Camera-follow / progress metric**: simple vertical Y position. The track is a straight vertical channel (y increases downward, matching typical video/canvas coordinate conventions), so "furthest along" = largest y. Chosen over arc-length for simplicity; revisit only if a future track shape becomes non-monotonic (loops, branches).
- **Track shape (v1)**: a single procedurally-generated staggered peg/obstacle course (Pachinko-style), parametrized by `TrackConfig` (width, length, obstacle rows/columns, seed). Deterministic per seed. A library of alternate shapes is a nice-to-have, not needed for Stage 1's done criteria.
- **Stall/timeout**: `RaceConfig.max_duration_s` bounds total sim time; any racer who hasn't crossed the finish line by then is marked `stalled` and placed after all finishers, ordered by descending Y (how far they got). Empirically, on a 4000-unit track with default obstacle density, ~13% of a 30-marble field stalled within a 60s budget on one seed — real physics contention, not a bug (see feature-physics-sim.md).
- **Extension hook points for Stage 4/5 — corrected after code review**: these two modes are NOT equally ready.
  - **Brackets (Stage 5) are genuinely ready**: `run_race()` is a pure function of `(race_id, racers, config)` with no hidden state — Stage 5 can call it repeatedly with partitioned racer lists and different `race_id`s today, no engine changes needed.
  - **Elimination (Stage 4) is NOT actually hooked yet** — `RaceConfig.gates: tuple[Gate, ...]` exists in the schema but is a placeholder only: nothing in `physics.py`, `events.py`, or `race.py` reads `config.gates`. This was originally (incorrectly) documented as "the literal seam Stage 4 will consult" — a code review caught that this overclaimed readiness. Concretely, Stage 4 will require real changes, not just filling in a blank:
    1. `physics.simulate()`'s loop currently has exactly two hardcoded exit conditions (all finished / time budget hit) with no generic threshold mechanism — gate-crossing detection needs a new check alongside the finish-line check, likely restructured into something more general than two inline conditionals.
    2. Finished marbles are frozen and their pymunk body/shape is **permanently removed** from the space (see feature-physics-sim.md). Elimination's panel-reset needs the opposite for marbles that don't clear a gate: reposition them back to the top of a new panel, not remove them. This is a different body-lifecycle model and will likely replace rather than reuse today's finish-handling code path.
    3. `TrackConfig`/`build_space()` generate one contiguous track per call — there's no concept of multiple panels/segments yet. Stage 4 will most likely compose multiple single-panel `build_space()` calls at an orchestration layer above `physics.py`, rather than this needing to change, but that's an assumption to confirm when Stage 4 starts.

## Open Questions — still open
- None blocking for Stage 1's own done criteria. Carried forward: gate-quota mechanism + body-repositioning-on-panel-reset (Stage 4, now known to need real engine work, not just config), bracket seeding/grouping (Stage 5, engine-ready).
