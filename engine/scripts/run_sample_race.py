"""CLI: run one sample race against local placeholder avatars and write a manifest JSON.

Run fixtures/generate_placeholder_avatars.py first if fixtures/avatars/ is empty.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from raceengine.manifest import write_manifest  # noqa: E402
from raceengine.models import RaceConfig, TrackConfig  # noqa: E402
from raceengine.race import run_race  # noqa: E402
from sources.local_folder import LocalFolderSource  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--avatars", type=Path, default=Path(__file__).parent.parent / "fixtures" / "avatars"
    )
    parser.add_argument("--count", type=int, default=30)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument(
        "--output", type=Path, default=Path(__file__).parent.parent / "output" / "sample_race.json"
    )
    args = parser.parse_args()

    source = LocalFolderSource(args.avatars)
    racers = source.fetch(limit=args.count)
    if not racers:
        raise SystemExit(
            f"No avatar images found in {args.avatars} - "
            f"run fixtures/generate_placeholder_avatars.py first."
        )

    track = TrackConfig(width=800, length=4000, seed=args.seed)
    config = RaceConfig(track=track, seed=args.seed)
    manifest = run_race(race_id="sample-race-1", racers=racers, config=config)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_manifest(manifest, args.output)

    winner = next(p for p in manifest.results if p.place == 1)
    winner_username = next(r.username for r in racers if r.id == winner.id)
    print(
        f"Race complete: {len(racers)} racers, {len(manifest.frames)} frames, "
        f"winner={winner_username} -> {args.output}"
    )


if __name__ == "__main__":
    main()
