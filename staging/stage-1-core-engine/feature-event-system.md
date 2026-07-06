# Feature: Race-Event Stream & Manifest Export

## What it is
The event-driven backbone of the whole engine: every notable race occurrence (marble finishes, gate passed, panel reset, collision — even if unused until later stages) gets emitted as a structured event, and the full race (positions + events + results) is serialized into a single JSON "race manifest" file.

## Why it matters
This is the seam the whole architecture depends on:
- Remotion (Stage 2) consumes the manifest, not the simulation code directly.
- Audio (Stage 2) subscribes to the same event stream — music now, SFX later, without rework.
- Elimination (Stage 4) and brackets (Stage 5) both need well-defined events (gate-pass, panel-reset, race-complete) to hook into.

## Behavior
- Event types to define now (even if only `finish` and `race_complete` actually fire in Stage 1): `marble_finish`, `race_complete`, `collision` (reserved for future SFX), `gate_pass` (reserved for Stage 4), `panel_reset` (reserved for Stage 4).
- Manifest schema (draft): `{ raceId, seed, racers: [{id, avatarRef}], frames: [{t, positions: [{id, x, y}]}], events: [{t, type, payload}], results: [{id, place}] }`
- Manifest is written to a single JSON file per race; Stage 2 reads it with no other coupling to Stage 1's Python code.

## Open Questions
- Should the manifest schema be versioned from day one (e.g. a `schemaVersion` field), given it's the contract between two different language ecosystems that will evolve independently?
- Is a single flat JSON file the right format for large marble counts (could get big with many frames × many marbles), or should frame data be chunked/compressed?
- Where do the reserved-but-unused event types (`collision`, `gate_pass`, `panel_reset`) get validated — do we want a shared JSON Schema file both Python and TypeScript validate against, to keep the two sides honest as the format evolves?
