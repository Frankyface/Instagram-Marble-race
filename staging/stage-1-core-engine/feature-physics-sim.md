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

## Open Questions
- What frame rate should the manifest sample at — match Remotion's likely output FPS (e.g. 30 or 60) directly, or decouple physics-step rate from manifest sample rate?
- How many marbles can the simulation handle before performance or visual clarity (overlapping marbles) becomes a problem? Needs empirical testing — this bounds how many followers a race can realistically include.
- Do we need a "minimum viable chaos" tuning pass (friction/restitution/track-obstacle placement) to make races feel fair/fun, or is a first-pass default physics config good enough for Stage 1's definition of done?
