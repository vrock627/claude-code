"""Shared data schema for the NBA injury-analysis system."""

from __future__ import annotations

from .enums import (
    BodyPart,
    FootCount,
    InjurySide,
    InterferenceType,
    LabelSource,
    LandingSurface,
    MotionState,
)
from .injury import InjuryEvent
from .labels import ClipMetricLabel
from .plays import PlayRecord
from .pose import COCO_KEYPOINT_NAMES, ClipPoseSeries, FramePose, Keypoint

__all__ = [
    "BodyPart",
    "FootCount",
    "InjurySide",
    "InterferenceType",
    "LabelSource",
    "LandingSurface",
    "MotionState",
    "InjuryEvent",
    "ClipMetricLabel",
    "PlayRecord",
    "COCO_KEYPOINT_NAMES",
    "ClipPoseSeries",
    "FramePose",
    "Keypoint",
]
