"""Controlled vocabularies for biomechanical metrics.

These enums are the single source of truth for the metric taxonomy. Both
``ClipMetricLabel`` (the manual-labeling target for injury clips) and
``PlayRecord`` (the base-rate exposure unit) reference them, which is what makes
injury cases and normal-play exposures directly comparable in Phase C.

See docs/METRIC_TAXONOMY.md for the precise definition of each value.
"""

from __future__ import annotations

from enum import Enum


class FootCount(str, Enum):
    """Number of feet involved at takeoff or landing."""

    ZERO = "zero"
    ONE = "one"
    TWO = "two"
    UNKNOWN = "unknown"


class MotionState(str, Enum):
    """Whether the player was moving or stationary at the moment of the event."""

    STATIONARY = "stationary"
    MOVING = "moving"
    UNKNOWN = "unknown"


class LandingSurface(str, Enum):
    """The first body part to make significant ground contact on landing."""

    FEET = "feet"
    KNEE = "knee"
    HIP_BACK = "hip_back"
    HAND_ARM = "hand_arm"
    OTHER = "other"
    UNKNOWN = "unknown"


class InterferenceType(str, Enum):
    """Interference from another player at the moment of injury/event."""

    NONE = "none"
    STEPPED_ON_FOOT = "stepped_on_foot"
    SHOVED_CONTACT = "shoved_contact"
    COLLISION = "collision"
    OTHER = "other"
    UNKNOWN = "unknown"


class BodyPart(str, Enum):
    """Injured body region (coarse-grained)."""

    ANKLE = "ankle"
    KNEE = "knee"
    FOOT = "foot"
    HAMSTRING = "hamstring"
    CALF = "calf"
    ACHILLES = "achilles"
    GROIN = "groin"
    HIP = "hip"
    SHOULDER = "shoulder"
    WRIST_HAND = "wrist_hand"
    HEAD = "head"
    BACK = "back"
    OTHER = "other"
    UNKNOWN = "unknown"


class InjurySide(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    BILATERAL = "bilateral"
    NA = "na"


class LabelSource(str, Enum):
    """Provenance of a metric value."""

    MANUAL = "manual"            # human-applied, ground truth
    CV_ASSISTED = "cv_assisted"  # human confirmed a CV suggestion
    CV_AUTO = "cv_auto"          # purely model-generated, not human-reviewed
