"""Tests for race-event stream and placement construction from a SimulationResult."""
from raceengine.events import build_events, build_results
from raceengine.models import FinishRecord, Frame, FramePosition, SimulationResult


def _result(finish_order, finish_times, stalled=False):
    frames = (Frame(t=1.0, positions=tuple(FramePosition(id=rid, x=0, y=0) for rid in finish_order)),)
    records = tuple(FinishRecord(id=rid, t=finish_times.get(rid)) for rid in finish_order)
    return SimulationResult(
        frames=frames,
        finish_order=tuple(finish_order),
        finish_records=records,
        obstacles=(),
        stalled=stalled,
    )


def test_build_events_emits_a_finish_event_per_finisher_in_order():
    # Arrange
    result = _result(["a", "b"], {"a": 1.2, "b": 1.5})
    # Act
    events = build_events(result)
    # Assert
    finish_events = [e for e in events if e.type == "marble_finish"]
    assert [e.payload["id"] for e in finish_events] == ["a", "b"]


def test_build_events_ends_with_a_race_complete_event():
    # Arrange
    result = _result(["a", "b"], {"a": 1.0, "b": 1.2})
    # Act
    events = build_events(result)
    # Assert
    assert events[-1].type == "race_complete"


def test_build_events_skips_finish_event_for_stalled_non_finishers():
    # Arrange
    result = _result(["a", "b"], {"a": 1.0}, stalled=True)
    # Act
    events = build_events(result)
    # Assert
    finish_events = {e.payload["id"] for e in events if e.type == "marble_finish"}
    assert finish_events == {"a"}


def test_build_results_assigns_sequential_places_in_finish_order():
    # Arrange
    result = _result(["a", "b", "c"], {"a": 1.0, "b": 1.1, "c": 1.2})
    # Act
    results = build_results(result)
    # Assert
    assert [(r.id, r.place) for r in results] == [("a", 1), ("b", 2), ("c", 3)]
