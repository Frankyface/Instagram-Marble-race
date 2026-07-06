"""Race manifest assembly and the JSON contract handed off to the Stage 2 renderer.

SCHEMA_VERSION is bumped whenever the wire shape changes, since the manifest is the
seam between two independently-evolving language ecosystems (Python simulation,
TypeScript/Remotion renderer).
"""
from __future__ import annotations

import json
from pathlib import Path

from raceengine.models import (
    Frame,
    Placement,
    Racer,
    RaceEvent,
    RaceManifest,
)

SCHEMA_VERSION = 1


def build_manifest(
    race_id: str,
    seed: int,
    fps: int,
    racers: tuple[Racer, ...],
    frames: tuple[Frame, ...],
    events: tuple[RaceEvent, ...],
    results: tuple[Placement, ...],
) -> RaceManifest:
    return RaceManifest(
        schema_version=SCHEMA_VERSION,
        race_id=race_id,
        seed=seed,
        fps=fps,
        racers=tuple(racers),
        frames=tuple(frames),
        events=tuple(events),
        results=tuple(results),
    )


def manifest_to_dict(manifest: RaceManifest) -> dict:
    return {
        "schemaVersion": manifest.schema_version,
        "raceId": manifest.race_id,
        "seed": manifest.seed,
        "fps": manifest.fps,
        "racers": [
            {"id": racer.id, "username": racer.username, "avatarPath": racer.avatar_path}
            for racer in manifest.racers
        ],
        "frames": [
            {
                "t": frame.t,
                "positions": [
                    {"id": pos.id, "x": pos.x, "y": pos.y} for pos in frame.positions
                ],
            }
            for frame in manifest.frames
        ],
        "events": [
            {"t": event.t, "type": event.type, "payload": event.payload}
            for event in manifest.events
        ],
        "results": [{"id": placement.id, "place": placement.place} for placement in manifest.results],
    }


def write_manifest(manifest: RaceManifest, path: Path) -> None:
    path.write_text(json.dumps(manifest_to_dict(manifest), indent=2), encoding="utf-8")
