# Stage 5 — Brackets Mode

## Goal
Add the multi-race tournament composition on top of the Stage 1 core race engine: followers split into bracket groups, each group races independently, the top X from each bracket advance to a final (with a configurable number of rounds).

## Features in this stage
- `feature-tournament-rounds.md` — bracket grouping, per-bracket races, advancement logic, and configurable rounds feeding into a final.

## Definition of Done
- [ ] Followers can be split into N bracket groups (grouping logic defined — see Open Questions).
- [ ] Each bracket runs as an independent single race (reusing Stage 1's engine unmodified).
- [ ] Top X finishers from each bracket advance to the next round; this repeats for a configurable number of rounds down to a final race.
- [ ] The full bracket tournament renders (via Stage 2) as one coherent video — multiple races back-to-back, ending on the final race's podium.

## Open Questions (stage-level)
- Does the whole tournament render as a single continuous video (all bracket races + final, back to back), or as one video per round? Kickoff interview implies one shareable output, but worth confirming before building the renderer side.
