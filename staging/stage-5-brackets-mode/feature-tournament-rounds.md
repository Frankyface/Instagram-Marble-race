# Feature: Bracket Tournament Rounds

## What it is
The multi-race composition layer: groups followers into brackets, runs each bracket as an independent Stage 1 single race, advances the top X finishers per bracket, and repeats for a configurable number of rounds until a final race crowns the overall winner.

## Why it matters
Per the kickoff interview, brackets are explicitly "just single races where X number from each bracket advances to the final race(s), with the ability to pick the number of rounds" — this feature is pure composition on top of Stage 1, not new race-simulation logic.

## Behavior
- Input: full follower list, bracket size (marbles per bracket), advancement count X per bracket, number of rounds.
- Splits followers into brackets (grouping strategy TBD — see Open Questions), runs each as an independent Stage 1 race.
- Collects the top X finishers per bracket, regroups them into the next round's brackets, repeats until one final race remains.
- Produces one combined race manifest (or a sequence of manifests) representing the whole tournament, for Stage 2 to render as a single video.

## Open Questions
- Bracket seeding/grouping — random assignment, or some other logic (e.g. grouped by when they followed, alphabetical)? Kickoff interview didn't specify.
- Does the combined-tournament manifest need a new top-level schema (a sequence of race manifests + round metadata), or can it reuse Stage 1's single-race manifest schema repeated per round?
- What happens if the follower count doesn't divide evenly into brackets (e.g. 105 followers, bracket size 20) — does the last bracket just run smaller, or do we pad/adjust bracket sizes?
- How is the number of rounds chosen — fixed by the user upfront (e.g. "3 rounds"), or derived automatically from total follower count + bracket size + advancement count X?
