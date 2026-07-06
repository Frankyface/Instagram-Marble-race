# Stage 1 — Core Race Engine

## Goal
Stand up the single continuous-scroll race primitive — the physics simulation, the event stream, and the JSON race manifest export — against a handful of local placeholder avatar images. No real Instagram data, no rendering, no elimination/brackets yet. This stage exists purely to prove the core engine works before anything else builds on it.

## Features in this stage
- `feature-race-engine.md` — the continuous-scroll race primitive itself (track, marbles, camera-follow, finish condition).
- `feature-physics-sim.md` — the `pymunk`-based physics simulation (marble bodies, collisions, track geometry).
- `feature-event-system.md` — the race-event stream (finish, collision, gate-pass placeholder, etc.) and the JSON race-manifest export format.

## Definition of Done
- [ ] A single race, given N placeholder avatar images, simulates from start to finish deterministically (same seed → same result).
- [ ] The race exports a valid JSON race manifest: frame-by-frame marble positions + a race-event stream + final placements.
- [ ] Camera-follow logic (tracking the leader) is implemented and its output is part of the manifest (or derivable from it).
- [ ] Manifest schema is documented well enough that Stage 2 (rendering) can consume it without touching Stage 1 code.
