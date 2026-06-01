"""Base-rate exposure records (Phase B).

A ``PlayRecord`` measures how often a player exhibits the same mechanics during
normal play. ``n_exposures`` is the denominator for Phase C risk calculations:
injury rate = injuries-with-mechanic / exposures-with-mechanic.

The metric fields are intentionally identical to ``ClipMetricLabel`` so the two
tables can be unioned/compared directly.
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


class PlayRecord(BaseModel):
    """One qualifying basketball action (the unit of exposure)."""

    play_id: str = Field(..., description="Stable primary key.")
    game_id: str
    season: str
    clip_id: str | None = None
    player_id: str = Field(..., description="The actor whose mechanics are measured.")
    event_type: str = Field(..., description="e.g. jump_shot, layup, rebound, drive.")

    # --- the metric taxonomy (shared with ClipMetricLabel) ---
    takeoff_feet: FootCount = FootCount.UNKNOWN
    landing_feet: FootCount = FootCount.UNKNOWN
    landing_surface: LandingSurface = LandingSurface.UNKNOWN
    motion_state: MotionState = MotionState.UNKNOWN
    interference: InterferenceType = InterferenceType.UNKNOWN

    resulted_in_injury: bool = False
    n_exposures: int = Field(
        1, ge=0, description="Count of qualifying actions represented by this row."
    )

    label_source: LabelSource = LabelSource.MANUAL
    created_at: datetime = Field(default_factory=_utcnow)
