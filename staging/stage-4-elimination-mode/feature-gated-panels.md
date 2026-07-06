# Feature: Gated Panel Resets

## What it is
The elimination mechanic: a gate allows only X marbles through; once hit, the race "jumps to a new panel" and all remaining (non-eliminated) marbles restart at the top of a new track section. Composed on top of the Stage 1 single-race primitive rather than a separate engine.

## Why it matters
Per the kickoff interview, elimination is explicitly meant to be "the same race, cut into panels with a gate" — not a rewrite of the race engine. Getting the composition right here validates that Stage 1's extension seams (flagged as an open question in Stage 1) were actually built correctly.

## Behavior
- A gate is defined with a position (on the track) and a quota (X marbles allowed through).
- Marbles that don't make it through the gate before the quota is hit are eliminated (removed from the race, not just left behind).
- On quota-hit: fire a `gate_pass`/`panel_reset` event, and reset all surviving marbles to the top of the next panel (a new track section, potentially the same track reused).
- Repeats across as many panels as configured, until a final panel produces the overall winner(s).

## Open Questions
- Are eliminated marbles shown "falling away"/removed visually in Stage 2's renderer, or just instantly gone at the panel cut?
- Is the "new panel" always a fresh/different track layout, or can it reuse the same track shape as prior panels?
- Does the gate quota shrink each panel (e.g. 50 → 20 → 5 → 1), and if so, is that schedule configurable or a fixed default?
