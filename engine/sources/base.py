"""The common interface every follower-data source implements (Repository Pattern).

Stage 1 ships one implementation (LocalFolderSource, a placeholder). Stage 3 adds
the official Meta export parser and the instagrapi adapter alongside it - the race
engine and renderer only ever depend on this Protocol, never on a concrete source.
"""
from __future__ import annotations

from typing import Optional, Protocol

from raceengine.models import Racer


class FollowerSource(Protocol):
    def fetch(self, limit: Optional[int] = None) -> tuple[Racer, ...]:
        """Return the racers to use for a race, in no particular order."""
        ...
