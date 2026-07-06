"""Top-level entrypoint for a single continuous-scroll race - the core primitive.

Elimination (Stage 4) and brackets (Stage 5) both compose on top of run_race():
elimination re-invokes it per panel with the surviving racers, brackets re-invoke it
per bracket/round. This function itself never changes for either mode.
"""
from __future__ import annotations

from raceengine.events import build_events, build_results
from raceengine.manifest import build_manifest
from raceengine.models import Racer, RaceConfig, RaceManifest, TrackInfo
from raceengine.physics import simulate


def run_race(race_id: str, racers: tuple[Racer, ...], config: RaceConfig) -> RaceManifest:
    """Simulate one race and return its manifest.

    Pure function: the same racers + config (including seed) always produces the
    same manifest.
    """
    result = simulate(racers, config)
    events = build_events(result)
    results = build_results(result)
    track = TrackInfo(
        width=config.track.width,
        length=config.track.length,
        wall_thickness=config.track.wall_thickness,
        marble_radius=config.track.marble_radius,
        obstacles=result.obstacles,
    )
    return build_manifest(
        race_id=race_id,
        seed=config.seed,
        fps=config.fps,
        track=track,
        racers=racers,
        frames=result.frames,
        events=events,
        results=results,
    )
