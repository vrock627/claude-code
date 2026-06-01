"""Validate the pydantic schema with good and bad data."""

from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from nba_injury.schema import (
    ClipMetricLabel,
    ClipPoseSeries,
    FootCount,
    FramePose,
    InjuryEvent,
    InterferenceType,
    Keypoint,
    LandingSurface,
    MotionState,
    PlayRecord,
)


def test_injury_event_minimal():
    ev = InjuryEvent(
        injury_id="inj-1",
        player_name="Test Player",
        game_date=date(2020, 1, 15),
        season="2019-20",
    )
    assert ev.injury_body_part.value == "unknown"
    assert ev.clip_ids == []


def test_clip_metric_label_defaults_unknown():
    lbl = ClipMetricLabel(label_id="l1", clip_id="c1", labeler_id="alice")
    assert lbl.takeoff_feet is FootCount.UNKNOWN
    assert lbl.landing_surface is LandingSurface.UNKNOWN
    assert lbl.interference is InterferenceType.UNKNOWN
    assert 0.0 <= lbl.confidence <= 1.0


def test_clip_metric_label_rejects_bad_confidence():
    with pytest.raises(ValidationError):
        ClipMetricLabel(label_id="l1", clip_id="c1", labeler_id="a", confidence=1.5)


def test_clip_metric_label_rejects_negative_event_frame():
    with pytest.raises(ValidationError):
        ClipMetricLabel(label_id="l1", clip_id="c1", labeler_id="a", event_frame=-1)


def test_label_and_play_share_metric_fields():
    """The core invariant: injury labels and base-rate plays use the same metrics."""
    metric_fields = {
        "takeoff_feet",
        "landing_feet",
        "landing_surface",
        "motion_state",
        "interference",
    }
    assert metric_fields <= set(ClipMetricLabel.model_fields)
    assert metric_fields <= set(PlayRecord.model_fields)


def test_play_record():
    pr = PlayRecord(
        play_id="p1",
        game_id="g1",
        season="2019-20",
        player_id="player-1",
        event_type="jump_shot",
        landing_feet=FootCount.ONE,
        motion_state=MotionState.MOVING,
        n_exposures=3,
    )
    assert pr.n_exposures == 3
    assert pr.resulted_in_injury is False


def test_pose_series_roundtrip():
    kp = [Keypoint(name="left_ankle", x=0.5, y=0.9, confidence=0.9)]
    fp = FramePose(
        frame_idx=0, timestamp_s=0.0, track_id=1, bbox=(0.1, 0.1, 0.2, 0.4),
        keypoints=kp, person_score=0.95,
    )
    series = ClipPoseSeries(
        clip_id="c1", fps=30.0, width=1280, height=720,
        model_name="yolo11x-pose.pt", model_version="8.2", frames=[fp],
    )
    assert len(series.frames) == 1
    with pytest.raises(ValidationError):
        Keypoint(name="x", x=0.0, y=0.0, confidence=2.0)
