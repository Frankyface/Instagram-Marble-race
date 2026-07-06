"""pymunk-driven simulation loop for a single continuous-scroll race.

Marbles spawn stacked above the track (negative y) and fall in under gravity.
A racer "finishes" the moment its center crosses the track's finish line (y >= length).
If the configured time budget runs out before everyone finishes, the race stalls
gracefully: stragglers are still placed, ordered by how far they got.
"""
from __future__ import annotations

import random

import pymunk

from raceengine.models import (
    Frame,
    FramePosition,
    FinishRecord,
    Racer,
    RaceConfig,
    SimulationResult,
)
from raceengine.track import build_space


def _spawn_marble_bodies(
    space: pymunk.Space, racers: tuple[Racer, ...], config: RaceConfig
) -> tuple[dict, dict]:
    """Place racers in staggered rows above the track (y < 0) so they fall in at the start."""
    rng = random.Random(config.seed)
    track = config.track
    radius = track.marble_radius
    mass = 1.0
    moment = pymunk.moment_for_circle(mass, 0, radius)

    per_row = max(1, int(track.width // (radius * 2.5)))
    spawn_margin = radius * 1.5

    bodies = {}
    shapes = {}
    for index, racer in enumerate(racers):
        row = index // per_row
        col = index % per_row
        x = spawn_margin + col * (radius * 2.5) + rng.uniform(-radius * 0.3, radius * 0.3)
        x = min(max(x, radius), track.width - radius)
        y = -radius * 2 - row * (radius * 2.5)

        body = pymunk.Body(mass, moment)
        body.position = (x, y)
        shape = pymunk.Circle(body, radius)
        shape.friction = 0.4
        shape.elasticity = 0.4
        space.add(body, shape)
        bodies[racer.id] = body
        shapes[racer.id] = shape
    return bodies, shapes


def simulate(racers: tuple[Racer, ...], config: RaceConfig) -> SimulationResult:
    track = config.track
    space, obstacles = build_space(track)
    bodies, shapes = _spawn_marble_bodies(space, racers, config)

    physics_dt = 1.0 / config.physics_hz
    steps_per_sample = max(1, round(config.physics_hz / config.fps))
    finish_y = track.length
    max_steps = int(config.max_duration_s * config.physics_hz)

    finish_times: dict = {}
    frozen_positions: dict = {}
    frames: list = []
    t = 0.0
    step = 0

    while step < max_steps:
        for _ in range(steps_per_sample):
            if step >= max_steps:
                break
            # Capture pre-step y so a finish can be timed to the exact fraction of
            # this step at which the marble crossed the line - otherwise every marble
            # crossing in the same step gets an identical time and ties break by
            # list order (arbitrary), which made the top placements inaccurate.
            prev_y = {
                racer.id: bodies[racer.id].position.y
                for racer in racers
                if racer.id not in finish_times
            }
            space.step(physics_dt)
            step += 1
            t += physics_dt
            for racer in racers:
                if racer.id in finish_times:
                    continue
                body = bodies[racer.id]
                y = body.position.y
                if y >= finish_y:
                    y0 = prev_y.get(racer.id, y)
                    frac = 1.0 if y <= y0 else max(0.0, min(1.0, (finish_y - y0) / (y - y0)))
                    finish_times[racer.id] = (t - physics_dt) + physics_dt * frac
                    # Freeze exactly at the finish line (not wherever it overshot to),
                    # so it doesn't free-fall past the wall-less end of the track.
                    frozen_positions[racer.id] = FramePosition(
                        id=racer.id, x=body.position.x, y=finish_y
                    )
                    space.remove(body, shapes[racer.id])

        positions = tuple(
            frozen_positions.get(
                racer.id,
                FramePosition(
                    id=racer.id, x=bodies[racer.id].position.x, y=bodies[racer.id].position.y
                ),
            )
            for racer in racers
        )
        frames.append(Frame(t=round(t, 4), positions=positions))

        if len(finish_times) == len(racers):
            break

    finished_order = sorted(finish_times, key=lambda rid: finish_times[rid])
    stalled = len(finish_times) < len(racers)

    stragglers: list = []
    if stalled:
        remaining = [racer.id for racer in racers if racer.id not in finish_times]
        stragglers = sorted(remaining, key=lambda rid: bodies[rid].position.y, reverse=True)

    finish_order = tuple(finished_order + stragglers)
    finish_records = tuple(
        FinishRecord(id=racer.id, t=finish_times.get(racer.id)) for racer in racers
    )

    return SimulationResult(
        frames=tuple(frames),
        finish_order=finish_order,
        finish_records=finish_records,
        obstacles=obstacles,
        stalled=stalled,
    )
