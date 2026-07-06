"""Tests for procedural track generation."""
import pytest

from raceengine.models import TrackConfig
from raceengine.track import build_space, generate_obstacles


def test_generate_obstacles_is_deterministic_for_same_seed():
    # Arrange
    config = TrackConfig(width=800, length=4000, seed=42)
    # Act
    first = generate_obstacles(config)
    second = generate_obstacles(config)
    # Assert
    assert first == second


def test_generate_obstacles_differs_for_different_seeds():
    # Arrange
    config_a = TrackConfig(width=800, length=4000, seed=1)
    config_b = TrackConfig(width=800, length=4000, seed=2)
    # Act
    obstacles_a = generate_obstacles(config_a)
    obstacles_b = generate_obstacles(config_b)
    # Assert
    assert obstacles_a != obstacles_b


def test_generate_obstacles_returns_the_configured_count():
    # Arrange
    config = TrackConfig(width=800, length=4000, obstacle_rows=5, obstacles_per_row=4, seed=1)
    # Act
    obstacles = generate_obstacles(config)
    # Assert
    assert len(obstacles) == 20


def test_generate_obstacles_stay_within_track_width():
    # Arrange
    config = TrackConfig(width=800, length=4000, seed=7)
    # Act
    obstacles = generate_obstacles(config)
    # Assert
    assert all(0 <= o.position.x <= config.width for o in obstacles)


def test_generate_obstacles_rejects_a_track_narrower_than_one_marble():
    # Arrange - width less than 2x marble_radius means marbles can't fit between walls
    config = TrackConfig(width=20, length=4000, marble_radius=15, seed=1)
    # Act / Assert
    with pytest.raises(ValueError):
        generate_obstacles(config)


def test_generate_obstacles_rejects_negative_row_or_column_counts():
    # Arrange
    config = TrackConfig(width=800, length=4000, obstacle_rows=-1, seed=1)
    # Act / Assert
    with pytest.raises(ValueError):
        generate_obstacles(config)


def test_build_space_adds_two_walls_plus_one_shape_per_obstacle():
    # Arrange
    config = TrackConfig(width=800, length=4000, obstacle_rows=3, obstacles_per_row=4, seed=1)
    # Act
    space, obstacles = build_space(config)
    # Assert
    assert len(space.shapes) == 2 + len(obstacles)
