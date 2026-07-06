"""Procedural vertical marble-race track: a staggered peg course between two side walls.

y increases downward (matches typical video/canvas coordinate conventions), so a
marble's y position directly doubles as its race progress - the leader is simply
whoever has the largest y. This is Stage 1's resolution of the "camera-follow metric"
open question in feature-race-engine.md.
"""
from __future__ import annotations

import random

import pymunk

from raceengine.models import Obstacle, TrackConfig, Vec2


def _validate(config: TrackConfig) -> None:
    if config.width < config.marble_radius * 2:
        raise ValueError(
            f"track width ({config.width}) must be at least 2x marble_radius "
            f"({config.marble_radius}) or marbles can't fit between the walls"
        )
    if config.obstacle_rows < 0 or config.obstacles_per_row < 0:
        raise ValueError("obstacle_rows and obstacles_per_row must be >= 0")


def generate_obstacles(config: TrackConfig) -> tuple[Obstacle, ...]:
    """Deterministically generate staggered peg obstacles, seeded by config.seed."""
    _validate(config)
    rng = random.Random(config.seed)
    margin = config.obstacle_radius * 2
    usable_width = max(config.width - 2 * margin, 0.0)
    buffer = config.marble_radius * 6
    usable_length = max(config.length - 2 * buffer, 0.0)
    row_spacing = usable_length / (config.obstacle_rows + 1) if config.obstacle_rows else 0.0
    col_spacing = usable_width / config.obstacles_per_row if config.obstacles_per_row else 0.0
    jitter_range = col_spacing * 0.15

    obstacles = []
    for row in range(config.obstacle_rows):
        row_y = buffer + row_spacing * (row + 1)
        stagger = col_spacing / 2 if row % 2 else 0.0
        for col in range(config.obstacles_per_row):
            base_x = margin + stagger + col_spacing * col + col_spacing / 2
            jitter = rng.uniform(-jitter_range, jitter_range)
            x = min(max(base_x + jitter, margin), config.width - margin)
            obstacles.append(Obstacle(position=Vec2(x=x, y=row_y), radius=config.obstacle_radius))
    return tuple(obstacles)


def build_space(config: TrackConfig) -> tuple[pymunk.Space, tuple[Obstacle, ...]]:
    """Build a pymunk.Space containing the track's static side walls and peg obstacles."""
    space = pymunk.Space()
    # Moderate gravity keeps the pack bunched (several marbles on screen at once)
    # while still flowing down a long, busy course to real finishes.
    space.gravity = (0, 1200)

    static_body = space.static_body
    half_thickness = config.wall_thickness / 2

    left_wall = pymunk.Segment(static_body, (0, 0), (0, config.length), half_thickness)
    right_wall = pymunk.Segment(
        static_body, (config.width, 0), (config.width, config.length), half_thickness
    )
    for wall in (left_wall, right_wall):
        wall.friction = 0.4
        wall.elasticity = 0.3
    space.add(left_wall, right_wall)

    obstacles = generate_obstacles(config)
    for obstacle in obstacles:
        shape = pymunk.Circle(static_body, obstacle.radius, (obstacle.position.x, obstacle.position.y))
        shape.friction = 0.4
        shape.elasticity = 0.5
        space.add(shape)

    return space, obstacles
