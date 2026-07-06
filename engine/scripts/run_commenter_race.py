"""Run a full commenter race: post URL -> commenters -> simulate -> manifest JSON.

Reads a browser Instagram session from a local `.env` (IG_SESSIONID), fetches the
post's commenters + avatars via instagrapi, runs the race, and writes a manifest
the renderer can turn into a video.

    .venv/Scripts/python.exe scripts/run_commenter_race.py <post_url> [--limit N]

Then render it:
    cd ../renderer && node scripts/render.mjs --manifest ../engine/output/commenter_race.json
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_ENGINE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ENGINE_ROOT))


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader (avoids a python-dotenv dependency). Existing env wins.

    Only loads our own `IG_*` keys, so a stray/tampered `.env` can't inject
    environment like PATH or HTTP_PROXY that would affect the process.
    """
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key.startswith("IG_"):
            continue
        value = value.strip().strip('"').strip("'")  # tolerate quoted values
        os.environ.setdefault(key, value)


def _racers_from_manifest(path: Path) -> tuple:
    """Reconstruct racers from an existing manifest so we can re-simulate (re-tune
    the track) using already-cached avatars, WITHOUT re-hitting Instagram."""
    import json

    from raceengine.models import Racer

    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return tuple(
        Racer(id=r["id"], username=r["username"], avatar_path=r["avatarPath"])
        for r in data["racers"]
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", nargs="?", help="Instagram post URL (/p/, /reel/, or /tv/)")
    parser.add_argument("--limit", type=int, default=None, help="cap on number of commenters")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument(
        "--resim",
        type=Path,
        default=None,
        help="re-simulate from an existing manifest's racers (skips the live fetch)",
    )
    # Track tuning: big marbles + a short track make a legible sprint where the
    # first marble across the line is clearly the winner.
    parser.add_argument("--width", type=float, default=720.0)
    parser.add_argument("--length", type=float, default=3200.0)
    parser.add_argument("--marble-radius", type=float, default=32.0)
    parser.add_argument("--max-duration", type=float, default=20.0)
    parser.add_argument(
        "--output", type=Path, default=_ENGINE_ROOT / "output" / "commenter_race.json"
    )
    parser.add_argument(
        "--cache", type=Path, default=_ENGINE_ROOT / "output" / "commenter-avatars"
    )
    args = parser.parse_args()

    _load_dotenv(_ENGINE_ROOT / ".env")

    from raceengine.manifest import write_manifest
    from raceengine.models import RaceConfig, TrackConfig
    from raceengine.race import run_race

    if args.resim is not None:
        racers = _racers_from_manifest(args.resim)
        print(f"Re-simulating from {args.resim} ({len(racers)} racers, no live fetch).")
    else:
        if not args.url:
            raise SystemExit("Provide a post URL, or --resim <manifest> to re-simulate.")
        from sources.post_commenters import PostCommentersSource

        source = PostCommentersSource(args.url, cache_dir=args.cache)
        print(f"Fetching commenters for {args.url} ...")
        racers = source.fetch(limit=args.limit)
        if not racers:
            raise SystemExit("No commenters fetched (empty post, or all avatars failed).")
        print(f"Fetched {len(racers)} racers.")

    track = TrackConfig(
        width=args.width,
        length=args.length,
        marble_radius=args.marble_radius,
        obstacle_radius=args.marble_radius * 0.7,
        obstacle_rows=9,
        obstacles_per_row=5,
        seed=args.seed,
    )
    config = RaceConfig(track=track, seed=args.seed, max_duration_s=args.max_duration)
    manifest = run_race(race_id="commenter-race-1", racers=racers, config=config)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_manifest(manifest, args.output)

    finishers = sum(1 for e in manifest.events if e.type == "marble_finish")
    winner = next(p for p in manifest.results if p.place == 1)
    winner_name = next(r.username for r in racers if r.id == winner.id)
    print(
        f"Race done: {len(manifest.frames)} frames ({len(manifest.frames) / config.fps:.1f}s), "
        f"{finishers}/{len(racers)} finished, winner=@{winner_name} -> {args.output}"
    )


if __name__ == "__main__":
    main()
