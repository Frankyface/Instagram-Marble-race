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

# Bonus marbles for specific commenters (user-provided). Values are EXTRA marbles
# beyond each person's base entry, so a total of "N" here means N-1. Each extra is a
# distinct marble (unique id) sharing the same face/name.
EXTRA_ENTRIES = {
    "jamessheil0": 1,             # total 2
    "_finnhughes": 1,            # total 2
    "alexbubyn": 1,              # total 2
    "abygail_wilson": 2,        # total 3
    "nk_fortyish_and_fitish": 5,  # total 6 (corrected from "nk_fortish_and_fitish")
    "brandon_sangster": 1,      # total 2
    "j.bak3s01": 3,             # total 4
    "emma_beirness": 1,          # total 2
    "luke_howardd": 2,           # total 3
    "e.dewar04": 2,              # total 3
}


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


def _apply_extra_entries(racers: tuple, extra: dict) -> tuple:
    """Add bonus marbles for the commenters in `extra` (same face/name, unique ids).
    Re-applying is idempotent: entries already suffixed with -x are skipped as sources."""
    from raceengine.models import Racer

    extra_lower = {k.lower(): v for k, v in extra.items()}
    out: list = []
    for racer in racers:
        if "-x" in racer.id:  # already an extra; don't multiply extras of extras
            out.append(racer)
            continue
        out.append(racer)
        for n in range(extra_lower.get(racer.username.lower(), 0)):
            out.append(
                Racer(id=f"{racer.id}-x{n + 2}", username=racer.username, avatar_path=racer.avatar_path)
            )
    return tuple(out)


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
    # Track tuning: big marbles (visible) on a long, busy course. It's long enough
    # to be a real race and given enough time that (nearly) everyone actually crosses
    # the line, so placements are real finish-order rather than depth-ranked stragglers.
    parser.add_argument("--width", type=float, default=900.0)
    parser.add_argument("--length", type=float, default=4000.0)
    parser.add_argument("--marble-radius", type=float, default=32.0)
    parser.add_argument("--rows", type=int, default=14, help="peg rows (course complexity)")
    parser.add_argument("--max-duration", type=float, default=45.0)
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

    base_count = len(racers)
    racers = _apply_extra_entries(racers, EXTRA_ENTRIES)
    if len(racers) != base_count:
        print(f"Applied extra entries: {base_count} commenters -> {len(racers)} marbles.")

    track = TrackConfig(
        width=args.width,
        length=args.length,
        marble_radius=args.marble_radius,
        obstacle_radius=args.marble_radius * 0.7,
        obstacle_rows=args.rows,
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
