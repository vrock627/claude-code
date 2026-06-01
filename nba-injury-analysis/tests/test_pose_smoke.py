"""Smoke test for the pose prototype on a real clip.

Skips automatically unless BOTH a fixture clip and the CV dependencies
(ultralytics + a video backend) are available, so the core test suite runs in a
minimal environment. Generate a fixture with: python scripts/verify_scaffold.py
(which creates tests/fixtures/synthetic_jump.mp4 if OpenCV is installed).
"""

from __future__ import annotations

from pathlib import Path

import pytest

FIXTURE = Path(__file__).parent / "fixtures" / "synthetic_jump.mp4"


def _cv_available() -> bool:
    try:
        import ultralytics  # noqa: F401
    except Exception:
        return False
    try:
        import decord  # noqa: F401

        return True
    except Exception:
        pass
    try:
        import cv2  # noqa: F401

        return True
    except Exception:
        return False


@pytest.mark.skipif(not FIXTURE.exists(), reason="no fixture clip; run scripts/verify_scaffold.py")
@pytest.mark.skipif(not _cv_available(), reason="CV deps not installed (uv sync --extra cv)")
def test_pose_prototype_produces_output(tmp_path):
    from nba_injury.pipelines.phase_a_injury.run import process_clip

    series, signals = process_clip(FIXTURE, out_dir=tmp_path)
    assert series is not None
    assert (tmp_path / f"{series.clip_id}.parquet").exists()
    assert (tmp_path / f"{series.clip_id}.meta.json").exists()
    # Pose may or may not detect a person in a crude synthetic clip; if it does,
    # we should get a signals file.
    if signals is not None:
        assert (tmp_path / f"{series.clip_id}.signals.json").exists()
