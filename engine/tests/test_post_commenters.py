"""Tests for PostCommentersSource (instagrapi-based). No live Instagram access -
the client is injected as a fake and requests.get is monkeypatched, so the suite
never touches the network."""
import types

import pytest

from sources.post_commenters import (
    Owner,
    PostCommentersSource,
    PostUnavailableError,
    extract_shortcode,
)

_JPEG = b"\xff\xd8\xff" + b"fake-jpeg-body"


def _source(tmp_path, **kwargs):
    kwargs.setdefault("cache_dir", tmp_path)
    kwargs.setdefault("sessionid", "fake-session")
    return PostCommentersSource("https://www.instagram.com/p/DaGvb2blZts/", **kwargs)


def _seed_avatars(tmp_path, *userids):
    for uid in userids:
        (tmp_path / f"{uid}.jpg").write_bytes(_JPEG)


# ---- instagrapi comment/user fakes ------------------------------------------


class FakeUser:
    def __init__(self, pk, username, pic="https://scontent.cdninstagram.com/x.jpg"):
        self.pk = pk
        self.username = username
        self.profile_pic_url = pic


class FakeComment:
    def __init__(self, user):
        self.user = user


class FakeClient:
    def __init__(self, comments=(), media_pk=123, raise_on_comments=None, raise_on_pk=None):
        self._comments = list(comments)
        self._media_pk = media_pk
        self._raise = raise_on_comments
        self._raise_pk = raise_on_pk
        self.calls = []

    def media_pk_from_url(self, url):
        self.calls.append(("pk", url))
        if self._raise_pk is not None:
            raise self._raise_pk
        return self._media_pk

    def media_comments(self, media_pk, amount=0):
        self.calls.append(("comments", media_pk, amount))
        if self._raise is not None:
            raise self._raise
        return self._comments


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
        "https://www.instagram.com/",
        "https://www.instagram.com/p/",
        "https://www.instagram.com/some_username/",
    ):
        with pytest.raises(ValueError):
            extract_shortcode(bad)


# ---- _dedupe: dedup / cap ----------------------------------------------------


def test_dedupe_removes_repeat_commenters_preserving_order(tmp_path):
    source = _source(tmp_path)
    owners = [Owner(1, "alice", "u"), Owner(2, "bob", "u"), Owner(1, "alice", "u")]
    assert [o.userid for o in source._dedupe(owners, cap=None)] == [1, 2]


def test_dedupe_respects_cap(tmp_path):
    source = _source(tmp_path)
    owners = [Owner(i, f"u{i}", "u") for i in range(5)]
    assert len(source._dedupe(owners, cap=3)) == 3


def test_dedupe_returns_empty_for_zero_cap(tmp_path):
    source = _source(tmp_path)
    assert source._dedupe([Owner(1, "a", "u"), Owner(2, "b", "u")], cap=0) == []


def test_effective_cap_takes_the_smaller_of_limit_and_max(tmp_path):
    source = _source(tmp_path, max_commenters=2)
    assert source._effective_cap(5) == 2
    assert source._effective_cap(1) == 1
    assert source._effective_cap(None) == 2
    assert _source(tmp_path)._effective_cap(None) is None


# ---- _build_racers: base + extras + skip ------------------------------------


def test_build_racers_one_marble_per_owner(tmp_path):
    _seed_avatars(tmp_path, 1, 2)
    source = _source(tmp_path)
    racers = source._build_racers([Owner(1, "alice", "u"), Owner(2, "bob", "u")])
    assert [r.id for r in racers] == ["ig-1", "ig-2"]
    assert [r.username for r in racers] == ["alice", "bob"]


def test_build_racers_adds_extra_entries_with_unique_ids(tmp_path):
    _seed_avatars(tmp_path, 1)
    source = _source(tmp_path, extra_entries={"Alice": 2})  # case-insensitive
    racers = source._build_racers([Owner(1, "alice", "u")])
    assert [r.id for r in racers] == ["ig-1", "ig-1-x2", "ig-1-x3"]
    assert {r.username for r in racers} == {"alice"}
    assert len({r.id for r in racers}) == 3
    assert len({r.avatar_path for r in racers}) == 1


def test_build_racers_skips_commenter_with_no_downloadable_avatar(tmp_path):
    _seed_avatars(tmp_path, 1)

    def _fail(owner, dest):
        raise OSError("no avatar")

    source = _source(tmp_path)
    source._download_avatar = _fail  # bob's download fails
    racers = source._build_racers([Owner(1, "alice", "u"), Owner(2, "bob", "u")])
    assert [r.id for r in racers] == ["ig-1"]


# ---- _download_avatar guards -------------------------------------------------


def test_download_avatar_writes_bytes_to_cache(tmp_path, monkeypatch):
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        return types.SimpleNamespace(content=_JPEG, raise_for_status=lambda: None)

    monkeypatch.setattr("requests.get", fake_get)
    source = _source(tmp_path)
    dest = tmp_path / "42.jpg"
    source._download_avatar(Owner(42, "dan", "https://scontent.cdninstagram.com/42.jpg"), dest)
    assert dest.read_bytes() == _JPEG
    assert calls == ["https://scontent.cdninstagram.com/42.jpg"]


def test_download_avatar_refuses_untrusted_host(tmp_path, monkeypatch):
    called = []
    monkeypatch.setattr("requests.get", lambda *a, **k: called.append(1))
    source = _source(tmp_path)
    with pytest.raises(ValueError):
        source._download_avatar(Owner(42, "dan", "https://evil.example.com/42.jpg"), tmp_path / "x")
    assert called == []  # never fetched


def test_download_avatar_rejects_non_image_body(tmp_path, monkeypatch):
    def fake_get(url, **kwargs):
        return types.SimpleNamespace(content=b"<html>rate limited</html>", raise_for_status=lambda: None)

    monkeypatch.setattr("requests.get", fake_get)
    source = _source(tmp_path)
    dest = tmp_path / "42.jpg"
    with pytest.raises(ValueError):
        source._download_avatar(Owner(42, "dan", "https://scontent.cdninstagram.com/42.jpg"), dest)
    assert not dest.exists()


# ---- _load_owners + fetch (fake client) -------------------------------------


def test_load_owners_dedupes_from_client_comments(tmp_path):
    client = FakeClient(
        comments=[
            FakeComment(FakeUser(1, "alice")),
            FakeComment(FakeUser(1, "alice")),
            FakeComment(FakeUser(2, "bob")),
        ]
    )
    source = _source(tmp_path, client=client)
    owners = source._load_owners(client, cap=None)
    assert [o.userid for o in owners] == [1, 2]
    assert ("comments", 123, 0) in client.calls  # amount=0 -> all


def test_load_owners_translates_media_not_found_to_post_unavailable(tmp_path):
    from instagrapi.exceptions import MediaNotFound

    client = FakeClient(raise_on_comments=MediaNotFound(media_pk=123))
    source = _source(tmp_path, client=client)
    with pytest.raises(PostUnavailableError):
        source._load_owners(client, cap=None)


def test_load_owners_unresolvable_url_raises_post_unavailable(tmp_path):
    client = FakeClient(raise_on_pk=ValueError("bad url"))
    source = _source(tmp_path, client=client)
    with pytest.raises(PostUnavailableError):
        source._load_owners(client, cap=None)


def test_load_owners_skips_commenter_with_non_numeric_pk(tmp_path):
    client = FakeClient(
        comments=[FakeComment(FakeUser("not-a-number", "weird")), FakeComment(FakeUser(2, "bob"))]
    )
    source = _source(tmp_path, client=client)
    owners = source._load_owners(client, cap=None)
    assert [o.userid for o in owners] == [2]  # the bad-pk commenter is dropped, not fatal


def test_fetch_requires_a_session(tmp_path, monkeypatch):
    monkeypatch.delenv("IG_SESSIONID", raising=False)
    source = PostCommentersSource(
        "https://www.instagram.com/p/DaGvb2blZts/", cache_dir=tmp_path, sessionid=None
    )
    with pytest.raises(ValueError):
        source.fetch()


def test_fetch_end_to_end_with_fake_client(tmp_path):
    _seed_avatars(tmp_path, 1, 2)  # avatars already cached -> no download
    client = FakeClient(comments=[FakeComment(FakeUser(1, "alice")), FakeComment(FakeUser(2, "bob"))])
    source = _source(tmp_path, client=client)
    racers = source.fetch()
    assert [r.id for r in racers] == ["ig-1", "ig-2"]
    assert [r.username for r in racers] == ["alice", "bob"]
