"""Tests for the Stage 1 placeholder FollowerSource that reads a local image folder."""
from sources.local_folder import LocalFolderSource


def _touch(path, name):
    (path / name).write_bytes(b"fake-image-bytes")


def test_fetch_returns_one_racer_per_image_file(tmp_path):
    # Arrange
    _touch(tmp_path, "avatar_001.png")
    _touch(tmp_path, "avatar_002.jpg")
    _touch(tmp_path, "notes.txt")
    source = LocalFolderSource(tmp_path)
    # Act
    racers = source.fetch()
    # Assert
    assert len(racers) == 2
    assert all(r.avatar_path.endswith((".png", ".jpg")) for r in racers)


def test_fetch_respects_the_limit_argument(tmp_path):
    # Arrange
    for i in range(5):
        _touch(tmp_path, f"avatar_{i:03d}.png")
    source = LocalFolderSource(tmp_path)
    # Act
    racers = source.fetch(limit=3)
    # Assert
    assert len(racers) == 3


def test_fetch_assigns_a_unique_id_per_racer(tmp_path):
    # Arrange
    _touch(tmp_path, "avatar_001.png")
    _touch(tmp_path, "avatar_002.png")
    source = LocalFolderSource(tmp_path)
    # Act
    racers = source.fetch()
    # Assert
    assert len({r.id for r in racers}) == len(racers)


def test_fetch_returns_results_in_a_stable_deterministic_order(tmp_path):
    # Arrange
    _touch(tmp_path, "avatar_002.png")
    _touch(tmp_path, "avatar_001.png")
    source = LocalFolderSource(tmp_path)
    # Act
    first = source.fetch()
    second = source.fetch()
    # Assert
    assert [r.avatar_path for r in first] == [r.avatar_path for r in second]
