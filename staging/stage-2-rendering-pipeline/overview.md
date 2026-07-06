# Stage 2 — Rendering Pipeline

## Goal
Turn a Stage 1 race manifest into a finished, shareable vertical MP4 using Remotion — simple 2D visuals (flat marbles with avatar textures, basic track), a podium/results screen, and background music via the event-driven audio layer.

## Features in this stage
- `feature-remotion-setup.md` — project scaffolding, manifest-loading, avatar image handling.
- `feature-video-composition.md` — the actual visual composition: track rendering, marble rendering, camera-follow/continuous-scroll, podium/results screen.
- `feature-audio-layer.md` — event-driven audio system; v1 wires up background music only.

## Definition of Done
- [ ] A Stage 1 race manifest renders into a vertical (9:16) MP4 with visible marbles (avatar-textured circles), a basic track, and continuous camera-follow scrolling.
- [ ] Video ends on a clear results/podium screen.
- [ ] Background music plays under the full race, looping/trimmed to the race's actual length.
- [ ] Audio system is event-driven (subscribes to the Stage 1 event stream) even though only music is wired up — SFX should be addable later without touching this stage's core structure.
- [ ] Output MP4 is genuinely shareable — correct aspect ratio/resolution for Instagram Reels/Stories.
