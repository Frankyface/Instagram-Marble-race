"""Stage 1 placeholder FollowerSource: treats every image in a folder as one racer.

Stands in for real Instagram data until Stage 3's official-export and instagrapi
adapters exist. Implements the same FollowerSource interface they will, so swapping
sources later requires no changes to the race engine or renderer.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from raceengine.models import Racer

_IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg")


class LocalFolderSource:
    def __init__(self, folder: Path) -> None:
        self._folder = Path(folder)

    def fetch(self, limit: Optional[int] = None) -> tuple[Racer, ...]:
        paths = sorted(
            path for path in self._folder.iterdir() if path.suffix.lower() in _IMAGE_SUFFIXES
        )
        if limit is not None:
            paths = paths[:limit]
        return tuple(
            Racer(id=f"local-{index}", username=path.stem, avatar_path=str(path))
            for index, path in enumerate(paths)
        )
