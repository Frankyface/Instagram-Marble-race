# Feature: Physics Simulation (pymunk)

## What it is
The `pymunk` (Chipmunk2D) physics layer underneath the race engine — marble bodies, track collision geometry, gravity, restitution/friction tuning so the race looks and feels like an actual marble race (some randomness/chaos, not a predictable sort-by-Y-position).

## Why it matters
This is what makes the outcome feel legitimate/fun rather than scripted — the marbles need real physical interaction (bumping, funneling, occasionally getting stuck/unstuck) for the race to be watchable.

## Behavior
- Each marble = a `pymunk` circle body with a radius, mass, friction, and restitution.
- Track = static `pymunk` collision geometry (walls, funnels, obstacles) matching whatever track shape the race-engine feature settles on.
- Simulation steps at a fixed timestep for determinism (same seed + same inputs → same race result, every run).
- Positions are sampled every frame (or every N physics steps, matching the target video frame rate) and written into the race manifest.

## Implementation (Stage 1 checkpoint)
`raceengine/physics.py`: marbles spawn stacked above the track (y < 0) and fall in under gravity `(0, 900)`. Determinism verified by test (`test_simulate_is_deterministic_for_the_same_seed`) — same racers + config always produce byte-identical frames. A real bug surfaced and got fixed during this stage: marbles that crossed the finish line kept free-falling forever (no wall exists past the track's end), so one marble drifted to y≈1.5 million by the end of a 60s race — harmless to placement logic, but would've rendered badly in Stage 2 and bloated the manifest. Fixed by freezing a marble's position and removing its body from the simulation the instant it finishes (`test_simulate_freezes_a_racers_position_once_it_finishes`).

## Open Questions — resolved
- **Frame rate**: decoupled. Physics steps at 120Hz (`RaceConfig.physics_hz`) for simulation accuracy; positions are sampled into the manifest at 30fps (`RaceConfig.fps`) via a steps-per-sample accumulator. 30fps chosen as a sensible default matching common Reels/video frame rates — easy to bump to 60 later without touching the physics step rate.
- **Marble count / scaling**: tested at 30 marbles end-to-end (`scripts/run_sample_race.py`), runs instantly, no performance issues. Overlap/readability at higher counts (e.g. 100+) is a Stage 2 rendering concern more than a physics one — not yet tested past 30, revisit if Stage 2's readability open question demands a hard cap.
- **Minimum viable chaos**: shipped with first-pass defaults (marble friction 0.4/elasticity 0.5, obstacle friction 0.4/elasticity 0.6) — no dedicated tuning pass done. Empirically produces real variance (winner wasn't seed-order-predictable) and a genuine ~13% stall rate on a 4000-unit/30-marble track within a 60s budget, which the stall/timeout safety net (feature-race-engine.md) handles correctly. Good enough for Stage 1's done criteria; a tuning pass is future polish, not a blocker.
