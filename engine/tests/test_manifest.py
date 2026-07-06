"""Tests for race manifest assembly and JSON (de)serialization."""
import json

from raceengine.manifest import SCHEMA_VERSION, build_manifest, manifest_to_dict, write_manifest
from raceengine.models import (
    Frame,
    FramePosition,
    Obstacle,
    Placement,
    Racer,
    RaceEvent,
    TrackInfo,
    Vec2,
)


def _sample_manifest():
    racers = (Racer(id="a", username="alice", avatar_path="/a.png"),)
    frames = (Frame(t=0.0, positions=(FramePosition(id="a", x=1.0, y=2.0),)),)
    events = (RaceEvent(t=0.0, type="race_complete", payload={}),)
    results = (Placement(id="a", place=1),)
    track = TrackInfo(
        width=800.0,
        length=4000.0,
        wall_thickness=20.0,
        marble_radius=15.0,
        obstacles=(Obstacle(position=Vec2(x=100.0, y=200.0), radius=12.0),),
    )
    return build_manifest(
        race_id="race-1",
        seed=1,
        fps=30,
        track=track,
        racers=racers,
        frames=frames,
        events=events,
        results=results,
    )


def test_build_manifest_stamps_the_current_schema_version():
    # Arrange / Act
    manifest = _sample_manifest()
    # Assert
    assert manifest.schema_version == SCHEMA_VERSION


def test_manifest_to_dict_produces_the_documented_wire_shape():
    # Arrange
    manifest = _sample_manifest()
    # Act
    data = manifest_to_dict(manifest)
    # Assert
    assert data["schemaVersion"] == SCHEMA_VERSION
    assert data["racers"][0] == {"id": "a", "username": "alice", "avatarPath": "/a.png"}
    assert data["frames"][0] == {"t": 0.0, "positions": [{"id": "a", "x": 1.0, "y": 2.0}]}
    assert data["events"][0] == {"t": 0.0, "type": "race_complete", "payload": {}}
    assert data["results"][0] == {"id": "a", "place": 1}
    assert data["track"] == {
        "width": 800.0,
        "length": 4000.0,
        "wallThickness": 20.0,
        "marbleRadius": 15.0,
        "obstacles": [{"x": 100.0, "y": 200.0, "radius": 12.0}],
    }


def test_write_manifest_round_trips_through_json(tmp_path):
    # Arrange
    manifest = _sample_manifest()
    output_path = tmp_path / "manifest.json"
    # Act
    write_manifest(manifest, output_path)
    loaded = json.loads(output_path.read_text(encoding="utf-8"))
    # Assert
    assert loaded == manifest_to_dict(manifest)
