"""Derive biomechanical signals from a single subject's pose track.

This module is pure logic over keypoint geometry (no video, no model), so it is
deterministic and unit-testable with synthetic trajectories.

IMPORTANT — what is and isn't auto-detectable from broadcast footage:

  * airborne phase / takeoff & landing frame ........ feasible (computed here)
  * landing-feet count (1 vs 2) ..................... partial; emitted as a
        confidence-flagged *suggestion*, never as ground truth
  * motion state (moving vs stationary) ............. partial; suggestion
  * takeoff-foot count, non-feet landing surface,
    interference (stepped-on foot / shove) .......... NOT auto-detected here;
        left UNKNOWN for a human labeler to fill in

The output JSON feeds the labeling tool as assistance; humans confirm/correct.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ...config import Settings, settings as default_settings
from ...schema.enums import FootCount, MotionState
from ...schema.pose import ClipPoseSeries, FramePose

_LEFT_ANKLE = "left_ankle"
_RIGHT_ANKLE = "right_ankle"
_LEFT_HIP = "left_hip"
_RIGHT_HIP = "right_hip"
_MIN_KP_CONF = 0.2


@dataclass
class AirborneInterval:
    start_frame: int
    end_frame: int  # inclusive, last airborne frame

    @property
    def length(self) -> int:
        return self.end_frame - self.start_frame + 1


@dataclass
class DerivedSignals:
    clip_id: str
    track_id: int
    airborne_intervals: list[AirborneInterval] = field(default_factory=list)
    est_takeoff_frame: int | None = None
    est_landing_frame: int | None = None
    est_landing_feet: FootCount = FootCount.UNKNOWN
    est_landing_feet_confidence: float = 0.0
    motion_state: MotionState = MotionState.UNKNOWN
    motion_state_confidence: float = 0.0
    model_name: str = ""
    model_version: str = ""

    def to_dict(self) -> dict:
        return {
            "clip_id": self.clip_id,
            "track_id": self.track_id,
            "airborne_intervals": [
                {"start_frame": iv.start_frame, "end_frame": iv.end_frame}
                for iv in self.airborne_intervals
            ],
            "est_takeoff_frame": self.est_takeoff_frame,
            "est_landing_frame": self.est_landing_frame,
            "est_landing_feet": {
                "value": self.est_landing_feet.value,
                "confidence": round(self.est_landing_feet_confidence, 3),
            },
            "motion_state": {
                "value": self.motion_state.value,
                "confidence": round(self.motion_state_confidence, 3),
            },
            "model_name": self.model_name,
            "model_version": self.model_version,
        }


def _kp(frame: FramePose, name: str) -> tuple[float, float] | None:
    """Return (x, y) for a named keypoint if present and confident enough."""
    for kp in frame.keypoints:
        if kp.name == name:
            if kp.confidence < _MIN_KP_CONF:
                return None
            return kp.x, kp.y
    return None


def _ankle_ys(frame: FramePose) -> list[float]:
    ys: list[float] = []
    for name in (_LEFT_ANKLE, _RIGHT_ANKLE):
        p = _kp(frame, name)
        if p is not None:
            ys.append(p[1])
    return ys


def _frames_for_track(series: ClipPoseSeries, track_id: int) -> list[FramePose]:
    frames = [f for f in series.frames if f.track_id == track_id]
    frames.sort(key=lambda f: f.frame_idx)
    return frames


def compute_derived_signals(
    series: ClipPoseSeries,
    track_id: int,
    config: Settings | None = None,
) -> DerivedSignals:
    """Compute airborne phase, landing estimate, and motion state for one track.

    Coordinates are image-normalized with y=0 at the top, so a *larger* y means
    *closer to the ground*.
    """
    cfg = config or default_settings
    frames = _frames_for_track(series, track_id)
    out = DerivedSignals(
        clip_id=series.clip_id,
        track_id=track_id,
        model_name=series.model_name,
        model_version=series.model_version,
    )
    if len(frames) < cfg.min_airborne_frames + 1:
        return out

    # Ground level = the lowest on-screen ankle position observed (largest y).
    all_ys = [y for f in frames for y in _ankle_ys(f)]
    if not all_ys:
        return out
    ground_y = max(all_ys)
    band = cfg.ground_band_frac

    # Per-frame on-ground test: a frame is "on ground" if any ankle is within the
    # band of ground level. Airborne = no ankle near ground.
    on_ground: list[bool] = []
    for f in frames:
        ys = _ankle_ys(f)
        if not ys:
            on_ground.append(True)  # missing feet -> assume grounded (conservative)
            continue
        near = any((ground_y - y) <= band for y in ys)
        on_ground.append(near)

    out.airborne_intervals = _find_airborne_intervals(frames, on_ground, cfg.min_airborne_frames)

    if out.airborne_intervals:
        primary = max(out.airborne_intervals, key=lambda iv: iv.length)
        out.est_takeoff_frame = primary.start_frame
        out.est_landing_frame = _landing_frame_after(frames, on_ground, primary)
        if out.est_landing_frame is not None:
            feet, conf = _estimate_landing_feet(frames, out.est_landing_frame, ground_y, band)
            out.est_landing_feet = feet
            out.est_landing_feet_confidence = conf

    state, mconf = _estimate_motion_state(frames, series.fps, out.est_takeoff_frame, cfg)
    out.motion_state = state
    out.motion_state_confidence = mconf
    return out


def _find_airborne_intervals(
    frames: list[FramePose], on_ground: list[bool], min_len: int
) -> list[AirborneInterval]:
    intervals: list[AirborneInterval] = []
    run_start: int | None = None
    for i, grounded in enumerate(on_ground):
        if not grounded and run_start is None:
            run_start = i
        elif grounded and run_start is not None:
            if i - run_start >= min_len:
                intervals.append(
                    AirborneInterval(frames[run_start].frame_idx, frames[i - 1].frame_idx)
                )
            run_start = None
    if run_start is not None and len(on_ground) - run_start >= min_len:
        intervals.append(
            AirborneInterval(frames[run_start].frame_idx, frames[-1].frame_idx)
        )
    return intervals


def _landing_frame_after(
    frames: list[FramePose], on_ground: list[bool], interval: AirborneInterval
) -> int | None:
    """First frame that returns to ground after the airborne interval ends."""
    for i, f in enumerate(frames):
        if f.frame_idx > interval.end_frame and on_ground[i]:
            return f.frame_idx
    return None


def _estimate_landing_feet(
    frames: list[FramePose], landing_frame: int, ground_y: float, band: float
) -> tuple[FootCount, float]:
    """Suggest 1 vs 2 feet at landing by counting ankles near ground.

    Low confidence by design — broadcast footage rarely resolves foot contact
    timing cleanly. A human confirms the final value.
    """
    target = next((f for f in frames if f.frame_idx == landing_frame), None)
    if target is None:
        return FootCount.UNKNOWN, 0.0

    near = 0
    seen = 0
    tight = band * 1.5
    for name in (_LEFT_ANKLE, _RIGHT_ANKLE):
        p = _kp(target, name)
        if p is None:
            continue
        seen += 1
        if (ground_y - p[1]) <= tight:
            near += 1

    if seen == 0:
        return FootCount.UNKNOWN, 0.0
    if near == 0:
        return FootCount.UNKNOWN, 0.2
    # Confidence is intentionally capped; this is a suggestion, not ground truth.
    conf = 0.5 if seen == 2 else 0.3
    return (FootCount.TWO if near >= 2 else FootCount.ONE), conf


def _estimate_motion_state(
    frames: list[FramePose],
    fps: float,
    event_frame: int | None,
    cfg: Settings,
) -> tuple[MotionState, float]:
    """Moving vs stationary from hip-centroid horizontal speed before the event."""
    if fps <= 0:
        return MotionState.UNKNOWN, 0.0

    def hip_x(f: FramePose) -> float | None:
        left = _kp(f, _LEFT_HIP)
        right = _kp(f, _RIGHT_HIP)
        xs = [p[0] for p in (left, right) if p is not None]
        return sum(xs) / len(xs) if xs else None

    # Window: ~0.5s before the event (or the whole clip if no event).
    window = max(2, int(round(0.5 * fps)))
    if event_frame is not None:
        pre = [f for f in frames if f.frame_idx <= event_frame][-window:]
    else:
        pre = frames[:window] if len(frames) >= window else frames

    xs = [(f.frame_idx, hip_x(f)) for f in pre]
    xs = [(i, x) for i, x in xs if x is not None]
    if len(xs) < 2:
        return MotionState.UNKNOWN, 0.0

    (i0, x0), (i1, x1) = xs[0], xs[-1]
    dt = (i1 - i0) / fps
    if dt <= 0:
        return MotionState.UNKNOWN, 0.0
    speed = abs(x1 - x0) / dt  # normalized units / second

    state = MotionState.MOVING if speed > cfg.moving_speed_threshold else MotionState.STATIONARY
    # Confidence scales with how far the speed is from the threshold.
    margin = abs(speed - cfg.moving_speed_threshold) / cfg.moving_speed_threshold
    conf = min(0.6, 0.3 + 0.3 * margin)
    return state, conf
