"""FollowerSource that races the COMMENTERS of a single Instagram post.

Constructed with a post URL (not an account handle), mirroring LocalFolderSource's
"the source carries its own target" pattern, so `fetch()` stays uniform with the
rest of the FollowerSource family and the engine/renderer need no changes.

Uses `instagrapi` (the private mobile-API client). We originally built this on
`instaloader`, but against current Instagram its comment/metadata endpoints are
blocked (web GraphQL returns "execution error", the mobile fallback returns a
generic "fail") even with a valid session - while instagrapi's fuller mobile-app
emulation succeeds. Auth is by a browser `sessionid` (IG_SESSIONID), which avoids
the fresh-login throttle that a username/password login trips.

`instagrapi` and `requests` are imported lazily (only inside the methods that hit
the network), so this module - and its test suite - import fine without them
installed. The creds live in a local `.env` (gitignored), never committed.
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Mapping, Optional
from urllib.parse import urlparse

from raceengine.models import Racer

logger = logging.getLogger(__name__)

_AVATAR_SUFFIX = ".jpg"
# Matches the shortcode segment of a /p/, /reel/, or /tv/ post URL path.
_POST_PATH_RE = re.compile(r"/(?:p|reel|tv)/([A-Za-z0-9_-]+)")
# Instagram serves avatars only from these CDN domains; anything else is refused
# before we fetch it (defence-in-depth against a malformed/hostile API response).
_ALLOWED_AVATAR_HOSTS = ("cdninstagram.com", "fbcdn.net")
_IMAGE_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")  # JPEG, PNG


@dataclass(frozen=True)
class Owner:
    """A commenter, normalised out of an instagrapi Comment's `user`."""

    userid: int
    username: str
    profile_pic_url: str


class PostUnavailableError(RuntimeError):
    """The post is private, deleted, or otherwise not fetchable."""


def extract_shortcode(url: str) -> str:
    """Pull the shortcode out of a /p/, /reel/, or /tv/ Instagram post URL.

    Validates that the URL is actually a post URL (not a profile URL or garbage)
    rather than blindly taking the last path segment.
    """
    match = _POST_PATH_RE.search(urlparse(url).path)
    if not match:
        raise ValueError(
            f"Not an Instagram post URL (expected /p/, /reel/, or /tv/ in the path): {url!r}"
        )
    return match.group(1)


class PostCommentersSource:
    """Races the commenters of one post. Satisfies the FollowerSource Protocol.

    By default: one marble per unique commenter (deduped by user id), top-level
    comments, no cap. `extra_entries` lets you hand a specific commenter bonus
    marbles (same face/name, distinct marble ids).
    """

    def __init__(
        self,
        post_url: str,
        *,
        cache_dir: Path,
        sessionid: Optional[str] = None,
        client: Optional[object] = None,
        max_commenters: Optional[int] = None,
        extra_entries: Optional[Mapping[str, int]] = None,
    ) -> None:
        self._url = post_url
        self._shortcode = extract_shortcode(post_url)  # validates it is a post URL
        self._cache_dir = Path(cache_dir)
        self._max_commenters = max_commenters
        self._extra_entries = {k.lower(): v for k, v in (extra_entries or {}).items()}
        self._sessionid = sessionid or os.environ.get("IG_SESSIONID", "")
        self._client = client

    def fetch(self, limit: Optional[int] = None) -> tuple[Racer, ...]:
        if self._client is None and not self._sessionid:
            raise ValueError(
                "No Instagram session configured (set IG_SESSIONID or pass a client); "
                "a logged-in session is required to read a post's comments."
            )
        cap = self._effective_cap(limit)
        client = self._ensure_client()
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        owners = self._load_owners(client, cap)
        return self._build_racers(owners)

    # -- pure logic (network-free, unit-tested directly) ----------------------

    def _effective_cap(self, limit: Optional[int]) -> Optional[int]:
        caps = [c for c in (limit, self._max_commenters) if c is not None]
        return min(caps) if caps else None

    def _dedupe(self, owners: Iterable[Owner], cap: Optional[int]) -> List[Owner]:
        """Deduplicate commenters by user id, preserving first-seen order, stopping
        once `cap` unique owners are found."""
        if cap is not None and cap <= 0:
            return []
        seen: set = set()
        result: List[Owner] = []
        for owner in owners:
            if owner.userid in seen:
                continue
            seen.add(owner.userid)
            result.append(owner)
            if cap is not None and len(result) >= cap:
                break
        return result

    def _build_racers(self, owners: Iterable[Owner]) -> tuple[Racer, ...]:
        racers: List[Racer] = []
        for owner in owners:
            avatar_path = self._ensure_avatar(owner)
            if avatar_path is None:
                continue  # no usable avatar -> drop this commenter rather than crash
            base_id = f"ig-{owner.userid}"
            avatar = str(avatar_path)
            racers.append(Racer(id=base_id, username=owner.username, avatar_path=avatar))
            # extra marbles for a boosted commenter: same face/name, unique ids
            for n in range(self._extra_entries.get(owner.username.lower(), 0)):
                racers.append(
                    Racer(id=f"{base_id}-x{n + 2}", username=owner.username, avatar_path=avatar)
                )
        return tuple(racers)

    def _ensure_avatar(self, owner: Owner) -> Optional[Path]:
        dest = self._cache_dir / f"{owner.userid}{_AVATAR_SUFFIX}"
        if dest.exists():
            return dest
        try:
            self._download_avatar(owner, dest)
        except Exception as exc:  # noqa: BLE001 - a failed avatar must not kill the race
            logger.warning(
                "Skipping @%s (%s): could not fetch avatar: %s",
                owner.username,
                owner.userid,
                exc,
            )
            return None
        return dest

    # -- network / instagrapi (lazy imports, injected in tests) ---------------

    def _ensure_client(self) -> object:
        if self._client is None:
            from instagrapi import Client

            client = Client()
            client.login_by_sessionid(self._sessionid)
            self._client = client
        return self._client

    def _load_owners(self, client: object, cap: Optional[int]) -> List[Owner]:
        from instagrapi.exceptions import MediaNotFound

        # URL -> media_pk is a pure parse in instagrapi; a URL that slips past
        # extract_shortcode but that instagrapi can't parse raises ValueError/IndexError.
        try:
            media_pk = client.media_pk_from_url(self._url)
        except (ValueError, IndexError, TypeError) as exc:
            raise PostUnavailableError(f"Could not resolve a post from URL {self._url!r}.") from exc
        # A genuinely missing/private post surfaces as MediaNotFound; rate-limit and
        # other transient errors are intentionally left to propagate to the caller.
        try:
            comments = client.media_comments(media_pk, amount=0)  # amount=0 -> all
        except MediaNotFound as exc:
            raise PostUnavailableError(
                f"Post {self._shortcode} is private, deleted, or unavailable."
            ) from exc

        owners: List[Owner] = []
        for comment in comments:
            user = comment.user
            try:
                userid = int(user.pk)  # numeric -> unique ids + safe filenames
            except (TypeError, ValueError):
                # One malformed commenter must not sink the whole race.
                logger.warning("Skipping commenter with non-numeric id: %r", getattr(user, "pk", None))
                continue
            owners.append(
                Owner(userid=userid, username=user.username, profile_pic_url=str(user.profile_pic_url))
            )
        return self._dedupe(owners, cap)

    def _download_avatar(self, owner: Owner, dest: Path) -> None:
        """Fetch the avatar bytes into our own flat cache (predictable filenames).

        Only fetches from Instagram's CDN over HTTPS, and only caches a body that
        actually looks like an image - so an empty/HTML error body is never cached
        as a `.jpg` that would then be served forever by the dest.exists() check.
        """
        import requests

        url = owner.profile_pic_url
        parsed = urlparse(url)
        host = parsed.hostname or ""
        allowed_host = any(host == h or host.endswith("." + h) for h in _ALLOWED_AVATAR_HOSTS)
        if parsed.scheme != "https" or not allowed_host:
            raise ValueError(f"Refusing to fetch avatar from untrusted URL: {url!r}")

        # allow_redirects=False: the host allowlist only vets the initial URL, so
        # following a redirect could reach an internal/untrusted host (SSRF). Instagram
        # avatar CDN URLs are served directly, so refusing redirects costs nothing here.
        response = requests.get(url, timeout=30, allow_redirects=False)
        response.raise_for_status()
        content = response.content
        if not content or not content.startswith(_IMAGE_MAGIC):
            raise ValueError("Avatar response was empty or not a JPEG/PNG image")
        dest.write_bytes(content)
