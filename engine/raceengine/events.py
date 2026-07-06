"""Builds the race-event stream and final placements from a raw SimulationResult.

Only `marble_finish` and `race_complete` fire in Stage 1. `collision`, `gate_pass`,
and `panel_reset` are reserved event types (see models.EventType) that Stage 2's audio
layer and Stage 4's elimination mode will emit against later - this module is the
seam neither of those stages should need to restructure.
"""
from __future__ import annotations

from raceengine.models import Placement, RaceEvent, SimulationResult


def build_events(result: SimulationResult) -> tuple[RaceEvent, ...]:
    finish_times = {record.id: record.t for record in result.finish_records}

    events = [
        RaceEvent(t=finish_times[racer_id], type="marble_finish", payload={"id": racer_id})
        for racer_id in result.finish_order
        if finish_times.get(racer_id) is not None
    ]

    final_time = result.frames[-1].t if result.frames else 0.0
    events.append(RaceEvent(t=final_time, type="race_complete", payload={}))
    return tuple(events)


def build_results(result: SimulationResult) -> tuple[Placement, ...]:
    return tuple(
        Placement(id=racer_id, place=index + 1)
        for index, racer_id in enumerate(result.finish_order)
    )
