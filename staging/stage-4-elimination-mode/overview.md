# Stage 4 — Elimination Mode

## Goal
Add the gated panel-reset mechanic on top of the Stage 1 core race engine: when X marbles pass through a gate, the race jumps to a new panel and the remaining marbles restart at the top of a new track section.

## Features in this stage
- `feature-gated-panels.md` — the gate/panel mechanic itself, composed on top of the single-race primitive.

## Definition of Done
- [ ] A race can be configured with one or more gates, each with a pass-through quota (X marbles).
- [ ] When a gate's quota is hit, the race manifest reflects a panel transition — remaining marbles reset to the top of a new panel/track section.
- [ ] The manifest's event stream includes `gate_pass` and `panel_reset` events (reserved in Stage 1, actually fired now).
- [ ] Stage 2's renderer can play back an elimination race's panel transitions coherently (even if the visual treatment of a panel-cut is basic for v1).

## Open Questions (stage-level)
- How many panels/gates does a typical elimination race have, and is this configurable per-race or a fixed default for v1?
