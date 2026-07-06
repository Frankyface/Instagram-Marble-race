"""Tests for PostCommentersSource. No live Instagram access - all network/instaloader
touchpoints are patched, injected, or pre-seeded, so the suite runs without instaloader
installed."""
import sys
import types
from dataclasses import dataclass, field

import pytest

from sources.post_commenters import (
    PostCommentersSource,
    PostUnavailableError,
    extract_shortcode,
)


_JPEG = b"\xff\xd8\xff" + b"fake-jpeg-body"


@dataclass
class FakeOwner:
    userid: object
    username: str
    profile_pic_url: str = "https://scontent.cdninstagram.com/pic.jpg"


@dataclass
class FakeReply:
    owner: FakeOwner


@dataclass
class FakeComment:
    owner: FakeOwner
    answers: list = field(default_factory=list)


def _source(tmp_path, **kwargs):
    kwargs.setdefault("cache_dir", tmp_path)
    kwargs.setdefault("ig_username", "tester")
    return PostCommentersSource("https://www.instagram.com/p/DaGvb2blZts/", **kwargs)


def _seed_avatars(tmp_path, *userids):
    for uid in userids:
        (tmp_path / f"{uid}.jpg").write_bytes(b"fake-avatar")


# ---- extract_shortcode ------------------------------------------------------


def test_extract_shortcode_from_standard_post_url():
    assert extract_shortcode("https://www.instagram.com/p/DaGvb2blZts/") == "DaGvb2blZts"


def test_extract_shortcode_strips_query_string():
    url = "https://www.instagram.com/p/DaGvb2blZts/?utm_source=ig_web_copy_link&igsh=abc"
    assert extract_shortcode(url) == "DaGvb2blZts"


def test_extract_shortcode_handles_reel_and_tv_and_no_trailing_slash():
    assert extract_shortcode("https://www.instagram.com/reel/ABC123def/") == "ABC123def"
    assert extract_shortcode("https://www.instagram.com/tv/XyZ_9-8/") == "XyZ_9-8"
    assert extract_shortcode("https://www.instagram.com/p/DaGvb2blZts") == "DaGvb2blZts"


def test_extract_shortcode_rejects_non_post_urls():
    for bad in (
        "",
        "not a url at all!",
        "https://www.instagram.com/",  # no post path
        "https://www.instagram.com/p/",  # prefix only, no shortcode
        "https://www.instagram.com/some_username/",  # profile URL, not a post
    ):
        with pytest.raises(ValueError):
            extract_shortcode(bad)


# ---- _collect_owners: dedup / cap / replies ---------------------------------


def test_collect_owners_dedupes_repeat_commenters_preserving_order(tmp_path):
    source = _source(tmp_path)
    comments = [
        FakeComment(FakeOwner(1, "alice")),
        FakeComment(FakeOwner(2, "bob")),
        FakeComment(FakeOwner(1, "alice")),  # alice again
    ]
    owners = source._collect_owners(comments, cap=None)
    assert [o.userid for o in owners] == [1, 2]


def test_collect_owners_respects_cap(tmp_path):
    source = _source(tmp_path)
    comments = [FakeComment(FakeOwner(i, f"u{i}")) for i in range(5)]
    owners = source._collect_owners(comments, cap=3)
    assert len(owners) == 3


def test_collect_owners_returns_empty_for_zero_cap(tmp_path):
    source = _source(tmp_path)
    comments = [FakeComment(FakeOwner(1, "alice")), FakeComment(FakeOwner(2, "bob"))]
    assert source._collect_owners(comments, cap=0) == []


def test_effective_cap_takes_the_smaller_of_limit_and_max(tmp_path):
    source = _source(tmp_path, max_commenters=2)
    assert source._effective_cap(5) == 2  # max_commenters wins
    assert source._effective_cap(1) == 1  # limit wins
    assert source._effective_cap(None) == 2  # only max_commenters set
    assert _source(tmp_path, max_commenters=None)._effective_cap(None) is None


def test_collect_owners_excludes_reply_authors_by_default(tmp_path):
    source = _source(tmp_path)
    comments = [FakeComment(FakeOwner(1, "alice"), answers=[FakeReply(FakeOwner(3, "carol"))])]
    owners = source._collect_owners(comments, cap=None)
    assert [o.userid for o in owners] == [1]


def test_collect_owners_includes_reply_authors_when_enabled(tmp_path):
    source = _source(tmp_path, include_replies=True)
    comments = [FakeComment(FakeOwner(1, "alice"), answers=[FakeReply(FakeOwner(3, "carol"))])]
    owners = source._collect_owners(comments, cap=None)
    assert [o.userid for o in owners] == [1, 3]


# ---- _build_racers: base + extras + skip ------------------------------------


def test_build_racers_one_marble_per_owner(tmp_path):
    _seed_avatars(tmp_path, 1, 2)
    source = _source(tmp_path)
    racers = source._build_racers([FakeOwner(1, "alice"), FakeOwner(2, "bob")])
    assert [r.id for r in racers] == ["ig-1", "ig-2"]
    assert [r.username for r in racers] == ["alice", "bob"]
    assert all(r.avatar_path.endswith(".jpg") for r in racers)


def test_build_racers_adds_extra_entries_with_unique_ids(tmp_path):
    _seed_avatars(tmp_path, 1)
    source = _source(tmp_path, extra_entries={"Alice": 2})  # case-insensitive
    racers = source._build_racers([FakeOwner(1, "alice")])
    # 1 base + 2 extras = 3 marbles for alice
    assert [r.id for r in racers] == ["ig-1", "ig-1-x2", "ig-1-x3"]
    assert {r.username for r in racers} == {"alice"}
    assert len({r.id for r in racers}) == 3  # ids are unique
    assert len({r.avatar_path for r in racers}) == 1  # same face


def test_build_racers_skips_commenter_with_no_downloadable_avatar(tmp_path):
    _seed_avatars(tmp_path, 1)  # only alice has an avatar on disk

    def _fail_download(owner, dest):
        raise OSError("no avatar")

    source = _source(tmp_path)
    source._download_avatar = _fail_download  # bob's download will fail
    racers = source._build_racers([FakeOwner(1, "alice"), FakeOwner(2, "bob")])
    assert [r.id for r in racers] == ["ig-1"]


def test_build_racers_skips_commenter_with_non_numeric_userid(tmp_path):
    _seed_avatars(tmp_path, 1)
    source = _source(tmp_path)
    racers = source._build_racers([FakeOwner("1-x2", "eve"), FakeOwner(1, "alice")])
    assert [r.id for r in racers] == ["ig-1"]  # the string-id owner is dropped


# ---- fetch orchestration ----------------------------------------------------


def test_fetch_requires_a_username(tmp_path, monkeypatch):
    monkeypatch.delenv("IG_USERNAME", raising=False)
    source = PostCommentersSource(
        "https://www.instagram.com/p/DaGvb2blZts/", cache_dir=tmp_path, ig_username=None
    )
    with pytest.raises(ValueError):
        source.fetch()


def test_fetch_raises_post_unavailable_when_load_fails(tmp_path):
    _seed_avatars(tmp_path, 1)
    source = _source(tmp_path)
    source._ensure_loader = lambda: object()
    source._ensure_login = lambda: None

    def _boom(cap):
        raise PostUnavailableError("gone")

    source._load_owners = _boom
    with pytest.raises(PostUnavailableError):
        source.fetch()


def test_fetch_wires_load_and_build_together(tmp_path):
    _seed_avatars(tmp_path, 1, 2)
    source = _source(tmp_path, max_commenters=None)
    source._ensure_loader = lambda: object()
    source._ensure_login = lambda: None
    source._load_owners = lambda cap: [FakeOwner(1, "alice"), FakeOwner(2, "bob")]
    racers = source.fetch()
    assert [r.id for r in racers] == ["ig-1", "ig-2"]


def test_fetch_passes_effective_cap_from_limit(tmp_path):
    _seed_avatars(tmp_path, 1, 2, 3)
    captured = {}
    source = _source(tmp_path, max_commenters=None)
    source._ensure_loader = lambda: object()
    source._ensure_login = lambda: None

    def _capture(cap):
        captured["cap"] = cap
        return [FakeOwner(i, f"u{i}") for i in range(1, 4)]

    source._load_owners = _capture
    source.fetch(limit=2)
    assert captured["cap"] == 2


# ---- network/instaloader methods (fake instaloader injected via sys.modules) --


class _FakeContext:
    def __init__(self, content=_JPEG):
        self.fetched_urls = []
        self._content = content

    def get_raw(self, url):
        self.fetched_urls.append(url)
        return types.SimpleNamespace(content=self._content)


class _FakeLoader:
    def __init__(self):
        self.context = _FakeContext()
        self.calls = []
        self.session_exists = False
        self.login_raises = None

    def load_session_from_file(self, username):
        self.calls.append(("load_session", username))
        if not self.session_exists:
            raise FileNotFoundError

    def login(self, user, password):
        self.calls.append(("login", user))
        if self.login_raises is not None:
            raise self.login_raises

    def two_factor_login(self, code):
        self.calls.append(("two_factor_login", code))

    def save_session_to_file(self):
        self.calls.append(("save_session",))


@pytest.fixture
def fake_instaloader(monkeypatch):
    """Install a fake `instaloader` package into sys.modules so the lazy imports
    inside the network methods resolve without the real dependency."""
    exc = types.ModuleType("instaloader.exceptions")

    class TwoFactorAuthRequiredException(Exception):
        pass

    class PrivateProfileNotFollowedException(Exception):
        pass

    class QueryReturnedNotFoundException(Exception):
        pass

    class TooManyRequestsException(Exception):
        pass

    exc.TwoFactorAuthRequiredException = TwoFactorAuthRequiredException
    exc.PrivateProfileNotFollowedException = PrivateProfileNotFollowedException
    exc.QueryReturnedNotFoundException = QueryReturnedNotFoundException
    exc.TooManyRequestsException = TooManyRequestsException

    ig = types.ModuleType("instaloader")
    ig.exceptions = exc
    ig.Instaloader = lambda quiet=False: _FakeLoader()

    # Post.from_shortcode(context, shortcode) -> post whose get_comments() is set per test
    comments_holder = {"comments": [], "raise": None}

    class FakePost:
        @classmethod
        def from_shortcode(cls, context, shortcode):
            return cls()

        def get_comments(self):
            if comments_holder["raise"] is not None:
                raise comments_holder["raise"]
            return comments_holder["comments"]

    ig.Post = FakePost

    monkeypatch.setitem(sys.modules, "instaloader", ig)
    monkeypatch.setitem(sys.modules, "instaloader.exceptions", exc)
    return types.SimpleNamespace(module=ig, exceptions=exc, comments_holder=comments_holder)


def test_ensure_loader_creates_instaloader_when_none(tmp_path, fake_instaloader):
    source = PostCommentersSource(
        "https://www.instagram.com/p/DaGvb2blZts/", cache_dir=tmp_path, ig_username="tester"
    )
    loader = source._ensure_loader()
    assert isinstance(loader, _FakeLoader)


def test_ensure_login_reuses_existing_session(tmp_path, fake_instaloader):
    source = _source(tmp_path)
    loader = _FakeLoader()
    loader.session_exists = True
    source._loader = loader
    source._ensure_login()
    assert loader.calls == [("load_session", "tester")]  # no login attempt


def test_ensure_login_logs_in_and_saves_when_no_session(tmp_path, fake_instaloader, monkeypatch):
    monkeypatch.setenv("IG_PASSWORD", "hunter2")
    source = _source(tmp_path)
    loader = _FakeLoader()  # session_exists=False -> load raises FileNotFoundError
    source._loader = loader
    source._ensure_login()
    assert ("login", "tester") in loader.calls
    assert ("save_session",) in loader.calls


def test_ensure_login_raises_without_password(tmp_path, fake_instaloader, monkeypatch):
    monkeypatch.delenv("IG_PASSWORD", raising=False)
    source = _source(tmp_path)
    source._loader = _FakeLoader()
    with pytest.raises(ValueError):
        source._ensure_login()


def test_ensure_login_handles_two_factor(tmp_path, fake_instaloader, monkeypatch):
    monkeypatch.setenv("IG_PASSWORD", "hunter2")
    monkeypatch.setenv("IG_2FA_CODE", "123456")
    source = _source(tmp_path)
    loader = _FakeLoader()
    loader.login_raises = fake_instaloader.exceptions.TwoFactorAuthRequiredException()
    source._loader = loader
    source._ensure_login()
    assert ("two_factor_login", "123456") in loader.calls
    assert ("save_session",) in loader.calls  # session persisted after 2FA too


def test_load_owners_returns_deduped_owners(tmp_path, fake_instaloader):
    fake_instaloader.comments_holder["comments"] = [
        FakeComment(FakeOwner(1, "alice")),
        FakeComment(FakeOwner(1, "alice")),
        FakeComment(FakeOwner(2, "bob")),
    ]
    source = _source(tmp_path)
    source._loader = _FakeLoader()
    owners = source._load_owners(cap=None)
    assert [o.userid for o in owners] == [1, 2]


def test_load_owners_translates_private_post_to_post_unavailable(tmp_path, fake_instaloader):
    fake_instaloader.comments_holder["raise"] = (
        fake_instaloader.exceptions.PrivateProfileNotFollowedException()
    )
    source = _source(tmp_path)
    source._loader = _FakeLoader()
    with pytest.raises(PostUnavailableError):
        source._load_owners(cap=None)


def test_load_owners_propagates_rate_limit(tmp_path, fake_instaloader):
    fake_instaloader.comments_holder["raise"] = (
        fake_instaloader.exceptions.TooManyRequestsException()
    )
    source = _source(tmp_path)
    source._loader = _FakeLoader()
    with pytest.raises(fake_instaloader.exceptions.TooManyRequestsException):
        source._load_owners(cap=None)


def test_download_avatar_writes_bytes_to_cache(tmp_path, fake_instaloader):
    source = _source(tmp_path)
    loader = _FakeLoader()
    source._loader = loader
    owner = FakeOwner(42, "dan", "https://scontent.cdninstagram.com/42.jpg")
    dest = tmp_path / "42.jpg"
    source._download_avatar(owner, dest)
    assert dest.read_bytes() == _JPEG
    assert loader.context.fetched_urls == ["https://scontent.cdninstagram.com/42.jpg"]


def test_download_avatar_refuses_untrusted_host(tmp_path, fake_instaloader):
    source = _source(tmp_path)
    source._loader = _FakeLoader()
    owner = FakeOwner(42, "dan", "https://evil.example.com/42.jpg")
    with pytest.raises(ValueError):
        source._download_avatar(owner, tmp_path / "42.jpg")
    # nothing fetched, nothing written
    assert source._loader.context.fetched_urls == []
    assert not (tmp_path / "42.jpg").exists()


def test_download_avatar_rejects_non_image_body(tmp_path, fake_instaloader):
    source = _source(tmp_path)
    loader = _FakeLoader()
    loader.context = _FakeContext(content=b"<html>rate limited</html>")
    source._loader = loader
    owner = FakeOwner(42, "dan", "https://scontent.cdninstagram.com/42.jpg")
    with pytest.raises(ValueError):
        source._download_avatar(owner, tmp_path / "42.jpg")
    assert not (tmp_path / "42.jpg").exists()  # poison body not cached
