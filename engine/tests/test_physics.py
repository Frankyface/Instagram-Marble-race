"""Tests for the pymunk-driven race simulation loop."""
from raceengine.models import Racer, RaceConfig, TrackConfig
from raceengine.physics import simulate


def _make_racers(n: int) -> tuple:
    return tuple(
        Racer(id=f"r{i}", username=f"user{i}", avatar_path=f"/fake/{i}.png") for i in range(n)
    )


def test_simulate_is_deterministic_for_the_same_seed():
    # Arrange
    racers = _make_racers(10)
    config = RaceConfig(track=TrackConfig(width=800, length=2000, seed=5), seed=5, max_duration_s=10)
    # Act
    first = simulate(racers, config)
    second = simulate(racers, config)
    # Assert
    assert first.frames == second.frames
    assert first.finish_order == second.finish_order


def test_simulate_produces_a_finish_order_covering_every_racer():
    # Arrange
    racers = _make_racers(8)
    config = RaceConfig(track=TrackConfig(width=800, length=1500, seed=1), seed=1, max_duration_s=10)
    # Act
    result = simulate(racers, config)
    # Assert
    assert set(result.finish_order) == {r.id for r in racers}


def test_simulate_all_racers_finish_on_a_short_enough_track():
    # Arrange
    racers = _make_racers(6)
    config = RaceConfig(track=TrackConfig(width=800, length=1200, seed=2), seed=2, max_duration_s=15)
    # Act
    result = simulate(racers, config)
    # Assert
    assert result.stalled is False
    assert all(rec.t is not None for rec in result.finish_records)


def test_simulate_stalls_gracefully_when_the_track_is_too_long_for_the_time_budget():
    # Arrange
    racers = _make_racers(4)
    config = RaceConfig(
        track=TrackConfig(width=800, length=100_000, seed=3), seed=3, max_duration_s=0.5
    )
    # Act
    result = simulate(racers, config)
    # Assert
    assert result.stalled is True
    assert len(result.finish_order) == len(racers)


def test_simulate_freezes_a_racers_position_once_it_finishes():
    # Arrange - a short track so racers finish well before the time budget runs out
    racers = _make_racers(6)
    config = RaceConfig(track=TrackConfig(width=800, length=1200, seed=2), seed=2, max_duration_s=15)
    # Act
    result = simulate(racers, config)
    finish_times = {rec.id: rec.t for rec in result.finish_records}
    # Assert - once a racer's finish time has passed, its recorded y no longer changes
    for racer in racers:
        finish_t = finish_times[racer.id]
        positions_after_finish = [
            pos
            for frame in result.frames
            if frame.t > finish_t
            for pos in frame.positions
            if pos.id == racer.id
        ]
        ys = {pos.y for pos in positions_after_finish}
        assert len(ys) <= 1, f"{racer.id} kept moving after finishing: {ys}"


def test_simulate_samples_frames_at_the_configured_fps():
    # Arrange
    racers = _make_racers(3)
    config = RaceConfig(
        track=TrackConfig(width=800, length=1200, seed=1), seed=1, fps=30, max_duration_s=15
    )
    # Act
    result = simulate(racers, config)
    # Assert - allow for the +/-0.00005 rounding applied to each frame's timestamp
    deltas = [b.t - a.t for a, b in zip(result.frames, result.frames[1:])]
    assert all(abs(d - 1 / 30) < 2e-4 for d in deltas)
