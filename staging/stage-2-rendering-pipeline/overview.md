# Stage 2 — Rendering Pipeline

## Goal
Turn a Stage 1 race manifest into a finished, shareable vertical MP4 using Remotion — simple 2D visuals (flat marbles with avatar textures, basic track), a podium/results screen, and background music via the event-driven audio layer.

## Features in this stage
- `feature-remotion-setup.md` — project scaffolding, manifest-loading, avatar image handling.
- `feature-video-composition.md` — the actual visual composition: track rendering, marble rendering, camera-follow/continuous-scroll, podium/results screen.
- `feature-audio-layer.md` — event-driven audio system; v1 wires up background music only.

## Definition of Done
- [x] A Stage 1 race manifest renders into a vertical (9:16) MP4 with visible marbles (avatar-textured circles), a basic track, and continuous camera-follow scrolling. Verified: 1080x1920 h264, confirmed via ffprobe and extracted frames.
- [x] Video ends on a clear results/podium screen. Verified: full 30-racer ranked leaderboard visible in the extracted podium frame.
- [x] Background music plays under the full race, looping/trimmed to the race's actual length. Verified: AAC audio track spans the full 65s output (a placeholder silent track for now - see `help.md`; real track sourcing still needed from the user).
- [x] Audio system is event-driven (subscribes to the Stage 1 event stream) even though only music is wired up — SFX should be addable later without touching this stage's core structure. Built as an `AudioSubscriber` array in `src/audio.ts`.
- [x] Output MP4 is genuinely shareable — correct aspect ratio/resolution for Instagram Reels/Stories. 1080x1920 (9:16) confirmed.

**Stage 2 rendering pipeline is functionally complete.** See `handoff.md` for the full checkpoint summary and what's next.
