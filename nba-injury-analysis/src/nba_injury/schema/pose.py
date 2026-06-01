"""Per-frame pose-estimation output.

These records are produced by the Phase A pose prototype. They are stored as
long-format parquet (one row per frame x track x keypoint) for scale, with a
small JSON metadata sidecar. The pydantic models here define the in-memory shape
and validate small payloads / fixtures.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# COCO-17 keypoint ordering used by Ultralytics YOLO-pose.
COCO_KEYPOINT_NAMES: tuple[str, ...] = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
)


class Keypoint(BaseModel):
    name: str
    x: float = Field(..., description="Image-normalized x in [0,1].")
    y: float = Field(..., description="Image-normalized y in [0,1] (0=top).")
    confidence: float = Field(..., ge=0.0, le=1.0)


class FramePose(BaseModel):
    frame_idx: int = Field(..., ge=0)
    timestamp_s: float = Field(..., ge=0.0)
    track_id: int = Field(..., description="Persistent ID from the tracker.")
    bbox: tuple[float, float, float, float] = Field(
        ..., description="(x, y, w, h), image-normalized."
    )
    keypoints: list[Keypoint]
    person_score: float = Field(..., ge=0.0, le=1.0)


class ClipPoseSeries(BaseModel):
    clip_id: str
    fps: float = Field(..., gt=0.0)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    model_name: str
    model_version: str
    frames: list[FramePose] = Field(default_factory=list)
