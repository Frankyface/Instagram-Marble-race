"""Immutable data models shared across the race engine.

`id` is used consistently for racer identifiers (Racer, FramePosition, FinishRecord,
Placement) to match the race-manifest JSON schema documented in
staging/stage-1-core-engine/feature-event-system.md.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional


@dataclass(frozen=True)
class Vec2:
    x: float
    y: float


@dataclass(frozen=True)
class Racer:
    id: str
    username: str
    avatar_path: str


@dataclass(frozen=True)
class Obstacle:
    """A single static peg obstacle in the track."""

    position: Vec2
    radius: float


@dataclass(frozen=True)
class TrackConfig:
    width: float
    length: float
    wall_thickness: float = 20.0
    marble_radius: float = 15.0
    obstacle_rows: int = 12
    obstacles_per_row: int = 6
    obstacle_radius: float = 12.0
    seed: int = 0


@dataclass(frozen=True)
class Gate:
    """Reserved for Stage 4 (elimination mode). Not consulted by Stage 1's engine yet."""

    position_y: float
    quota: int


@dataclass(frozen=True)
class RaceConfig:
    track: TrackConfig
    seed: int = 0
    fps: int = 30
    physics_hz: int = 120
    max_duration_s: float = 60.0
    gates: tuple[Gate, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class FramePosition:
    id: str
    x: float
    y: float


@dataclass(frozen=True)
class Frame:
    t: float
    positions: tuple[FramePosition, ...]


EventType = Literal["marble_finish", "race_complete", "collision", "gate_pass", "panel_reset"]


@dataclass(frozen=True)
class RaceEvent:
    t: float
    type: EventType
    payload: dict


@dataclass(frozen=True)
class Placement:
    id: str
    place: int


@dataclass(frozen=True)
class FinishRecord:
    id: str
    t: Optional[float]  # None if the racer never crossed the finish line (stall/timeout)


@dataclass(frozen=True)
class SimulationResult:
    frames: tuple[Frame, ...]
    finish_order: tuple[str, ...]
    finish_records: tuple[FinishRecord, ...]
    stalled: bool


@dataclass(frozen=True)
class RaceManifest:
    schema_version: int
    race_id: str
    seed: int
    fps: int
    racers: tuple[Racer, ...]
    frames: tuple[Frame, ...]
    events: tuple[RaceEvent, ...]
    results: tuple[Placement, ...]
