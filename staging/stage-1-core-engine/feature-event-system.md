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
- Manifest schema (draft, superseded by the actual shape in "Implementation" below): `{ raceId, seed, racers: [{id, avatarRef}], frames: [{t, positions: [{id, x, y}]}], events: [{t, type, payload}], results: [{id, place}] }`
- Manifest is written to a single JSON file per race; Stage 2 reads it with no other coupling to Stage 1's Python code.

## Implementation (Stage 1 checkpoint)
`raceengine/events.py` builds the event stream + placements from a `SimulationResult`; `raceengine/manifest.py` assembles and serializes the manifest. Actual wire shape (camelCase keys, matches the draft below):
`{ schemaVersion, raceId, seed, fps, racers: [{id, username, avatarPath}], frames: [{t, positions: [{id, x, y}]}], events: [{t, type, payload}], results: [{id, place}] }`.
Verified end-to-end: `scripts/run_sample_race.py` writes a real manifest to `engine/output/sample_race.json`.

## Open Questions — resolved
- **Schema versioning**: yes — `schemaVersion: 1` (constant `SCHEMA_VERSION` in `manifest.py`), bumped whenever the wire shape changes.
- **File format**: single flat JSON file for v1 (confirmed fine at 30 racers / 1800 frames — file is a few MB at most, not unwieldy). Chunking/compression deferred until it's an actual problem.
- **Shared schema validation**: deferred. Not needed yet — Stage 1 has no TypeScript consumer to keep honest. Revisit when Stage 2's Remotion loader is built; a shared JSON Schema (or a TS type generated from it) becomes worth adding once both sides exist.
