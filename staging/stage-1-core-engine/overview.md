# Stage 1 — Core Race Engine

## Goal
Stand up the single continuous-scroll race primitive — the physics simulation, the event stream, and the JSON race manifest export — against a handful of local placeholder avatar images. No real Instagram data, no rendering, no elimination/brackets yet. This stage exists purely to prove the core engine works before anything else builds on it.

## Features in this stage
- `feature-race-engine.md` — the continuous-scroll race primitive itself (track, marbles, camera-follow, finish condition).
- `feature-physics-sim.md` — the `pymunk`-based physics simulation (marble bodies, collisions, track geometry).
- `feature-event-system.md` — the race-event stream (finish, collision, gate-pass placeholder, etc.) and the JSON race-manifest export format.

## Definition of Done — formal acceptance criteria

Each criterion below is written to be independently checkable (a command to run, or a document to read, with an unambiguous pass/fail outcome) — not a subjective "looks done." A verification pass against these lives in the "Verification Report" section further down, dated and re-run whenever this stage's code changes materially.

| ID | Criterion | Verification method |
|---|---|---|
| C1 | Full test suite passes with zero failures/errors | `pytest` (from `engine/`) exits with all tests passed, no failures/errors |
| C2 | Test coverage meets the project's 80% minimum (`testing.md`) | `pytest --cov=raceengine --cov=sources --cov-report=term-missing` reports ≥80% on both packages |
| C3 | A sample race runs end-to-end and emits a valid manifest | `scripts/run_sample_race.py` exits 0; the written JSON parses, and contains every required top-level key (`schemaVersion`, `raceId`, `seed`, `fps`, `racers`, `frames`, `events`, `results`) matching the wire shape documented in `feature-event-system.md` |
| C4 | Every racer receives a placement | `len(manifest.results) == len(manifest.racers)`, and the set of racer ids in `results` exactly matches the set in `racers` (no one dropped, no duplicates) |
| C5 | The manifest ends with a `race_complete` event | `manifest.events[-1].type == "race_complete"` |
| C6 | Physics is deterministic per seed | Running the identical `(racers, config)` twice produces byte-identical `frames` and `results` — checked both by unit test and by an actual double-run-and-diff of real CLI output (not just in-process test) |
| C7 | Finished marbles freeze at the finish line (no runaway free-fall) | In a real manifest, every finisher's `y` in frames after its finish event stays within a small margin of `track.length` — no marble drifts to an unbounded value after finishing |
| C8 | The stall/timeout safety net still produces full placements | On a track/duration combination where not everyone finishes, `finish_order` (and therefore `results`) still covers every racer — stragglers ranked by descending y, not dropped or left unranked |
| C9 | `FollowerSource` is genuinely pluggable, not hardcoded | Nothing under `raceengine/` (the engine package) imports `sources` or any concrete source class — the engine only ever depends on a `tuple[Racer, ...]`, confirmed by grep |
| C10 | Input validation guards reject malformed track configs | `TrackConfig` narrower than one marble diameter, and negative obstacle row/column counts, both raise `ValueError` rather than silently producing a broken track |
| C11 | Brackets-ready vs. elimination-not-yet is honestly documented | `feature-race-engine.md` explicitly states `run_race()` is bracket-ready today (pure function, no engine changes needed), and separately states elimination is NOT yet hooked in — naming the concrete gaps (unused `gates` field, no generic threshold mechanism in `physics.py`'s loop, finish-removal incompatible with panel-reset) |
| C12 | No unresolved CRITICAL/HIGH findings from the last `/code-review` | Every actionable finding from the Stage 1 review is either fixed (with a test) or explicitly logged as a deliberate, low-priority deferral in `handoff.md` — none silently dropped |

**Camera-follow / progress metric** (context, not a separate checkable criterion): resolved as "largest Y position," directly derivable from any frame's positions without a dedicated field — covered implicitly by C3/C7.

## Verification Report — 2026-07-06

All 12 criteria run against the current `engine/` code. **Result: 12/12 PASS.**

| ID | Result | Evidence |
|---|---|---|
| C1 | **PASS** | `pytest`: 27 passed, 0 failed, 0 errors |
| C2 | **PASS** | `pytest --cov`: 98% overall (`raceengine` 99-100% per file, `sources` 100% on the concrete implementation; `sources/base.py`'s 0% is the unexecuted `Protocol` interface body, not a real gap) |
| C3 | **PASS** | `run_sample_race.py` exited 0; output JSON parsed and contained all 8 required top-level keys |
| C4 | **PASS** | 30 racers in, 30 results out; racer-id set == result-id set |
| C5 | **PASS** | `events[-1].type == "race_complete"` confirmed on real output |
| C6 | **PASS** | Two independent CLI runs (`run_a.json`, `run_b.json`), same seed: `frames`, `results`, and `events` all byte-identical |
| C7 | **PASS** | Real manifest: 26/30 finished, 0 post-finish y-violations, max y anywhere = 4016.37 (track length 4000 — no runaway) |
| C8 | **PASS** | 4 stragglers, all present in `results`; places form a contiguous 1..30 with no gaps/duplicates |
| C9 | **PASS** | `grep -r "sources\|FollowerSource\|LocalFolderSource" raceengine/` → no matches |
| C10 | **PASS** | Both malformed configs (too-narrow track, negative `obstacle_rows`) raised `ValueError` when checked directly, not just via test |
| C11 | **PASS** | `feature-race-engine.md`'s "Extension hook points" section explicitly separates brackets (ready) from elimination (not ready, gaps named) |
| C12 | **PASS** | `handoff.md`'s 2026-07-06 entry accounts for every review finding — fixed items and deferred items both named, nothing silently dropped |

**Stage 1 is formally verified complete.** Proceeding to Stage 2 (Rendering Pipeline).
