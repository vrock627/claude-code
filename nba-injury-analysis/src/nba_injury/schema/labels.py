"""The manual-labeling target: biomechanical metrics for a single clip.

This is ground truth. A human labels each injury clip with these metrics (the CV
prototype only *suggests* values; see ``cv_signal_ref``). The field set mirrors
``PlayRecord`` exactly so injury labels and base-rate exposures are comparable.
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .enums import (
    FootCount,
    InterferenceType,
    LabelSource,
    LandingSurface,
    MotionState,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ClipMetricLabel(BaseModel):
    """Per-clip biomechanical label."""

    label_id: str = Field(..., description="Stable primary key.")
    clip_id: str
    injury_id: str | None = Field(
        None, description="FK to InjuryEvent; None for non-injury / base-rate clips."
    )

    # --- the metric taxonomy (shared with PlayRecord) ---
    takeoff_feet: FootCount = FootCount.UNKNOWN
    landing_feet: FootCount = FootCount.UNKNOWN
    landing_surface: LandingSurface = LandingSurface.UNKNOWN
    motion_state: MotionState = MotionState.UNKNOWN
    interference: InterferenceType = InterferenceType.UNKNOWN
    interference_player: str | None = None

    event_frame: int | None = Field(
        None, ge=0, description="Frame index of the injury/landing moment."
    )

    # --- provenance / quality ---
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Labeler confidence.")
    label_source: LabelSource = LabelSource.MANUAL
    labeler_id: str = Field(..., description="Who applied the label.")
    reviewed_by: str | None = None
    agreement_flag: bool | None = Field(
        None, description="Whether independent labelers agreed on this clip."
    )
    cv_signal_ref: str | None = Field(
        None, description="Path to the pose-derived signals shown to the labeler."
    )

    created_at: datetime = Field(default_factory=_utcnow)
    notes: str | None = None
