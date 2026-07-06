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

## Open Questions
- What determines "furthest along the track" for camera-follow and finish-order purposes — arc length along a track spline, simple vertical (Y) position, or distance-to-finish-line? Needs a concrete, code-able definition before physics work starts.
- What track shape(s) does v1 support — a single fixed track layout, or a small library of track shapes to pick from? (Kickoff interview didn't lock this down.)
- What's the stall/timeout condition if marbles get stuck (e.g., wedged against track geometry)? Need a max-frame-count or a "no progress in N seconds" rule.
- How does this primitive expose the "hook points" that elimination (gate/panel logic) and brackets (multi-race composition) will need in Stages 4-5? Worth sketching the extension seams now even though those modes aren't built yet, so Stage 1 doesn't accidentally paint us into a corner.
