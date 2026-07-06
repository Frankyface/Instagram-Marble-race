"""Integration tests for the top-level single continuous-scroll race entrypoint."""
from raceengine.models import Racer, RaceConfig, TrackConfig
from raceengine.race import run_race


def _make_racers(n: int) -> tuple:
    return tuple(
        Racer(id=f"r{i}", username=f"user{i}", avatar_path=f"/fake/{i}.png") for i in range(n)
    )


def test_run_race_produces_full_results_covering_every_racer():
    # Arrange
    racers = _make_racers(12)
    config = RaceConfig(track=TrackConfig(width=800, length=1500, seed=9), seed=9, max_duration_s=15)
    # Act
    manifest = run_race(race_id="test-race", racers=racers, config=config)
    # Assert
    assert len(manifest.results) == len(racers)
    assert {p.id for p in manifest.results} == {r.id for r in racers}


def test_run_race_is_deterministic_given_the_same_seed():
    # Arrange
    racers = _make_racers(6)
    config = RaceConfig(track=TrackConfig(width=800, length=1200, seed=3), seed=3, max_duration_s=15)
    # Act
    first = run_race(race_id="race-a", racers=racers, config=config)
    second = run_race(race_id="race-a", racers=racers, config=config)
    # Assert
    assert first.frames == second.frames
    assert first.results == second.results


def test_run_race_ends_with_a_race_complete_event():
    # Arrange
    racers = _make_racers(5)
    config = RaceConfig(track=TrackConfig(width=800, length=1000, seed=4), seed=4, max_duration_s=15)
    # Act
    manifest = run_race(race_id="race-b", racers=racers, config=config)
    # Assert
    assert manifest.events[-1].type == "race_complete"
