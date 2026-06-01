"""Deterministic tests for derived signals using synthetic keypoint trajectories.

No video or model needed: we hand-build a jump trajectory and assert the
airborne phase, takeoff/landing frames, landing-feet suggestion, and motion
state are detected correctly.
"""

from __future__ import annotations

from nba_injury.schema.enums import FootCount, MotionState
from nba_injury.schema.pose import ClipPoseSeries, FramePose, Keypoint
from nba_injury.pipelines.phase_a_injury.derived_signals import compute_derived_signals

FPS = 30.0
GROUND_Y = 0.90      # feet on floor (large y = near ground)
AIR_Y = 0.65         # clearly airborne
TRACK = 7


def _frame(idx: int, ankle_y: float, hip_x: float) -> FramePose:
    kps = [
        Keypoint(name="left_ankle", x=0.50, y=ankle_y, confidence=0.9),
        Keypoint(name="right_ankle", x=0.52, y=ankle_y, confidence=0.9),
        Keypoint(name="left_hip", x=hip_x, y=0.55, confidence=0.9),
        Keypoint(name="right_hip", x=hip_x + 0.02, y=0.55, confidence=0.9),
    ]
    return FramePose(
        frame_idx=idx, timestamp_s=idx / FPS, track_id=TRACK,
        bbox=(0.4, 0.3, 0.2, 0.5), keypoints=kps, person_score=0.95,
    )


def _build_jump_series(hip_x_at) -> ClipPoseSeries:
    """30-frame jump: ground (0-4), airborne (5-14), ground (15-29)."""
    frames = []
    for idx in range(30):
        if 5 <= idx <= 14:
            ankle_y = AIR_Y
        else:
            ankle_y = GROUND_Y
        frames.append(_frame(idx, ankle_y, hip_x_at(idx)))
    return ClipPoseSeries(
        clip_id="synthetic", fps=FPS, width=1280, height=720,
        model_name="synthetic", model_version="test", frames=frames,
    )


def test_airborne_phase_and_landing_detected():
    series = _build_jump_series(hip_x_at=lambda i: 0.5)  # stationary
    sig = compute_derived_signals(series, TRACK)

    assert len(sig.airborne_intervals) == 1
    iv = sig.airborne_intervals[0]
    assert iv.start_frame == 5
    assert iv.end_frame == 14
    assert sig.est_takeoff_frame == 5
    assert sig.est_landing_frame == 15


def test_landing_feet_two_when_both_ankles_grounded():
    series = _build_jump_series(hip_x_at=lambda i: 0.5)
    sig = compute_derived_signals(series, TRACK)
    assert sig.est_landing_feet is FootCount.TWO
    assert sig.est_landing_feet_confidence > 0.0


def test_motion_state_stationary():
    series = _build_jump_series(hip_x_at=lambda i: 0.5)
    sig = compute_derived_signals(series, TRACK)
    assert sig.motion_state is MotionState.STATIONARY


def test_motion_state_moving():
    # Hip drifts 0.02 normalized units per frame -> well above threshold.
    series = _build_jump_series(hip_x_at=lambda i: 0.2 + 0.02 * i)
    sig = compute_derived_signals(series, TRACK)
    assert sig.motion_state is MotionState.MOVING


def test_no_airborne_when_always_grounded():
    series = _build_jump_series(hip_x_at=lambda i: 0.5)
    # Force every frame to ground level.
    for f in series.frames:
        for kp in f.keypoints:
            if kp.name.endswith("ankle"):
                kp.y = GROUND_Y
    sig = compute_derived_signals(series, TRACK)
    assert sig.airborne_intervals == []
    assert sig.est_takeoff_frame is None


def test_signals_serialize_to_dict():
    series = _build_jump_series(hip_x_at=lambda i: 0.5)
    d = compute_derived_signals(series, TRACK).to_dict()
    assert d["est_takeoff_frame"] == 5
    assert d["est_landing_feet"]["value"] in {"one", "two", "unknown"}
    assert "airborne_intervals" in d
