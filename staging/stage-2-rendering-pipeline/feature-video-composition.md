# Feature: Video Composition (Track, Marbles, Camera, Podium)

## What it is
The actual visual composition: rendering the track, the marbles (avatar-textured circles) moving frame-by-frame per the manifest, a camera that follows the leader in a continuous scroll, and a final podium/results screen.

## Why it matters
This is the "does it actually look like a marble race" feature — and per the kickoff interview, it's explicitly meant to stay simple (flat 2D, no chasing polish) since it was flagged as the biggest risk.

## Behavior
- Track rendered as simple flat 2D geometry, matching Stage 1's track definition.
- Each marble = a circle with its avatar image texture, positioned per-frame from the manifest.
- Camera continuously scrolls to keep the current leader in frame (no hard cuts within a single race) — matches Stage 1's camera-follow/leader definition.
- After `race_complete`, cut to a results/podium screen — full placement list per the v1 scope decision (not just top 3).
- Output framed for vertical (9:16) Reels/Stories format throughout.

## Implementation (Stage 2 checkpoint)
Built: `Track.tsx` (flat 2D walls + peg obstacles), `Marble.tsx` (avatar-textured circle, gold ring on the current leader), `camera.ts` (leader = largest-y marble per Stage 1's resolved metric; vertical scroll offset keeps the leader ~1/3 down the frame), `Podium.tsx` (full ranked results). All wired together in `RaceComposition.tsx`, switching from race view to podium view once `frameIndex >= manifest.frames.length`. Verified visually via extracted frames from a real 30-racer render.

## Open Questions — resolved
- **Podium visual treatment**: a simple ranked list (not a literal podium graphic with stands) - matches the "keep the renderer simple" mandate. Full 30-place leaderboard fits the fixed video height via dynamically-computed row height (`availableHeight / results.length`), with gold/silver/bronze accent colors on the top 3 for a bit of distinction without added complexity.
- **Marble z-ordering**: rendered in `manifest.racers` order every frame (stable, deterministic, no flicker). Doesn't matter functionally for v1 - purely a "don't jitter between frames" concern, which stable ordering solves.
- **Readability floor**: not hit a problem at 30 marbles (confirmed via real render - individual marbles are small at 1080px width / 800 track-width scale, but avatar colors remain distinguishable). Not tested past 30; revisit if a future race needs a much larger field.
