"""FollowerSource that races the COMMENTERS of a single Instagram post.

Constructed with a post URL (not an account handle), mirroring LocalFolderSource's
"the source carries its own target" pattern, so `fetch()` stays uniform with the
rest of the FollowerSource family and the engine/renderer need no changes.

Requires a logged-in instaloader session at run time - Instagram gates both
comment retrieval and HD profile pictures behind login. Credentials come from the
environment (IG_USERNAME / IG_PASSWORD / optional IG_2FA_CODE); a local `.env` is
the intended place for them (already gitignored), never committed.

`instaloader` is imported lazily (only inside the methods that actually hit the
network), so this module - and its test suite - import fine without instaloader
installed. Install it (declared in pyproject) before an actual live run.
"""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Iterable, List, Mapping, Optional, Protocol
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


class CommentOwner(Protocol):
    userid: object
    username: str
    profile_pic_url: str


class CommentReply(Protocol):
    owner: CommentOwner


class Comment(Protocol):
    owner: CommentOwner
    answers: Iterable[CommentReply]


class RawResponse(Protocol):
    content: bytes


class LoaderContext(Protocol):
    def get_raw(self, url: str) -> RawResponse: ...


class Loader(Protocol):
    context: LoaderContext

    def load_session_from_file(self, username: str) -> None: ...
    def login(self, user: str, password: str) -> None: ...
    def two_factor_login(self, code: str) -> None: ...
    def save_session_to_file(self) -> None: ...


class PostUnavailableError(RuntimeError):
    """The post is private, deleted, or otherwise not fetchable."""


def extract_shortcode(url: str) -> str:
    """Pull the shortcode out of a /p/, /reel/, or /tv/ Instagram post URL.

    Validates that the URL is actually a post URL (not a profile URL or garbage)
    rather than blindly taking the last path segment - instaloader ships no URL
    parser of its own.
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
    comments only, no cap. `extra_entries` lets you hand a specific commenter
    bonus marbles (same face/name, distinct marble ids).
    """

    def __init__(
        self,
        post_url: str,
        *,
        cache_dir: Path,
        ig_username: Optional[str] = None,
        loader: Optional[Loader] = None,
        include_replies: bool = False,
        max_commenters: Optional[int] = None,
        extra_entries: Optional[Mapping[str, int]] = None,
    ) -> None:
        self._shortcode = extract_shortcode(post_url)
        self._cache_dir = Path(cache_dir)
        self._include_replies = include_replies
        self._max_commenters = max_commenters
        self._extra_entries = {k.lower(): v for k, v in (extra_entries or {}).items()}
        self._username = ig_username or os.environ.get("IG_USERNAME", "")
        self._loader: Optional[Loader] = loader

    def fetch(self, limit: Optional[int] = None) -> tuple[Racer, ...]:
        if not self._username:
            raise ValueError(
                "No Instagram username configured (set IG_USERNAME or pass ig_username); "
                "login is required to read a post's comments."
            )
        cap = self._effective_cap(limit)
        self._ensure_loader()
        self._ensure_login()
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        owners = self._load_owners(cap)
        return self._build_racers(owners)

    # -- pure logic (network-free, unit-tested directly) ----------------------

    def _effective_cap(self, limit: Optional[int]) -> Optional[int]:
        caps = [c for c in (limit, self._max_commenters) if c is not None]
        return min(caps) if caps else None

    def _collect_owners(
        self, comments: Iterable[Comment], cap: Optional[int]
    ) -> List[CommentOwner]:
        """Deduplicate commenters (and optionally reply authors) by user id,
        preserving first-seen order, stopping once `cap` unique owners are found."""
        if cap is not None and cap <= 0:
            return []
        seen: set = set()
        owners: List[CommentOwner] = []
        for comment in comments:
            candidates: List[CommentOwner] = [comment.owner]
            if self._include_replies:
                candidates.extend(answer.owner for answer in comment.answers)
            for owner in candidates:
                if owner.userid in seen:
                    continue
                seen.add(owner.userid)
                owners.append(owner)
                if cap is not None and len(owners) >= cap:
                    return owners
        return owners

    def _build_racers(self, owners: Iterable[CommentOwner]) -> tuple[Racer, ...]:
        racers: List[Racer] = []
        for owner in owners:
            try:
                user_id = int(owner.userid)  # numeric -> unique ids + safe filenames
            except (TypeError, ValueError):
                logger.warning("Skipping commenter with non-numeric id: %r", owner.userid)
                continue
            avatar_path = self._ensure_avatar(owner, user_id)
            if avatar_path is None:
                continue  # no usable avatar -> drop this commenter rather than crash
            base_id = f"ig-{user_id}"
            avatar = str(avatar_path)
            racers.append(Racer(id=base_id, username=owner.username, avatar_path=avatar))
            # extra marbles for a boosted commenter: same face/name, unique ids
            for n in range(self._extra_entries.get(owner.username.lower(), 0)):
                racers.append(
                    Racer(id=f"{base_id}-x{n + 2}", username=owner.username, avatar_path=avatar)
                )
        return tuple(racers)

    def _ensure_avatar(self, owner: CommentOwner, user_id: int) -> Optional[Path]:
        dest = self._cache_dir / f"{user_id}{_AVATAR_SUFFIX}"
        if dest.exists():
            return dest
        try:
            self._download_avatar(owner, dest)
        except Exception as exc:  # noqa: BLE001 - a failed avatar must not kill the race
            logger.warning(
                "Skipping @%s (%s): could not fetch avatar: %s",
                getattr(owner, "username", "?"),
                user_id,
                exc,
            )
            return None
        return dest

    # -- network / instaloader (lazy imports, patched in tests) ---------------

    def _ensure_loader(self) -> Loader:
        if self._loader is None:
            import instaloader

            self._loader = instaloader.Instaloader(quiet=True)
        return self._loader

    def _ensure_login(self) -> None:
        """Reuse a saved session if present; otherwise log in once and persist it.

        The password is read from the environment only when a fresh login is
        unavoidable, and never stored anywhere but instaloader's own session file.
        """
        from instaloader.exceptions import TwoFactorAuthRequiredException

        loader = self._ensure_loader()
        try:
            loader.load_session_from_file(self._username)
            logger.info("Loaded saved instaloader session for %s", self._username)
            return
        except FileNotFoundError:
            pass

        password = os.environ.get("IG_PASSWORD")
        if not password:
            raise ValueError(
                "No saved instaloader session and IG_PASSWORD is not set; cannot log in."
            )
        try:
            loader.login(self._username, password)
        except TwoFactorAuthRequiredException:
            code = os.environ.get("IG_2FA_CODE")
            if not code:
                raise
            loader.two_factor_login(code)
        loader.save_session_to_file()

    def _load_owners(self, cap: Optional[int]) -> List[CommentOwner]:
        from instaloader import Post
        from instaloader.exceptions import (
            PrivateProfileNotFollowedException,
            QueryReturnedNotFoundException,
            TooManyRequestsException,
        )

        loader = self._ensure_loader()
        try:
            post = Post.from_shortcode(loader.context, self._shortcode)
            return self._collect_owners(post.get_comments(), cap)
        except (PrivateProfileNotFollowedException, QueryReturnedNotFoundException) as exc:
            raise PostUnavailableError(
                f"Post {self._shortcode} is private, deleted, or unavailable."
            ) from exc
        except TooManyRequestsException:
            logger.warning("Rate limited (429) while reading comments for %s", self._shortcode)
            raise

    def _download_avatar(self, owner: CommentOwner, dest: Path) -> None:
        """Fetch the avatar bytes into our own flat cache (predictable filenames).

        Only fetches from Instagram's CDN over HTTPS, and only caches a body that
        actually looks like an image - so an empty/HTML error body (e.g. a soft
        rate-limit page) is never cached as a `.jpg` that would then be served
        forever by the dest.exists() short-circuit.
        """
        url = owner.profile_pic_url
        parsed = urlparse(url)
        host = parsed.hostname or ""
        allowed_host = any(host == h or host.endswith("." + h) for h in _ALLOWED_AVATAR_HOSTS)
        if parsed.scheme != "https" or not allowed_host:
            raise ValueError(f"Refusing to fetch avatar from untrusted URL: {url!r}")

        content = self._ensure_loader().context.get_raw(url).content
        if not content or not content.startswith(_IMAGE_MAGIC):
            raise ValueError("Avatar response was empty or not a JPEG/PNG image")
        dest.write_bytes(content)
