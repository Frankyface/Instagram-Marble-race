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

## Open Questions
- What visual treatment for the podium/results screen — just a ranked list of avatars + names, or a literal podium graphic (1st/2nd/3rd stands) plus a scrollable list below for the rest?
- How should marble overlap/occlusion be handled visually when many marbles cluster together (z-ordering by placement? by ID? doesn't matter much for v1)?
- Any minimum "readability" floor on marble size vs. avatar count — e.g. if 100 marbles are racing, do avatars need to shrink to the point they're unrecognizable, and is that acceptable for v1?
