"""Injury event records: one row per real-world NBA injury."""

from __future__ import annotations

from datetime import date, datetime, timezone

from pydantic import BaseModel, Field

from .enums import BodyPart, InjurySide


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InjuryEvent(BaseModel):
    """A documented injury, independent of any video.

    Links to the clips that show it via ``clip_ids``; the biomechanical metrics
    themselves live on ``ClipMetricLabel`` so a single injury can be supported by
    multiple camera angles/clips.
    """

    injury_id: str = Field(..., description="Stable primary key (UUID or slug).")
    player_name: str
    player_id: str | None = None
    team: str | None = None
    game_date: date
    season: str = Field(..., description='e.g. "2019-20"')

    injury_body_part: BodyPart = BodyPart.UNKNOWN
    injury_side: InjurySide = InjurySide.NA
    diagnosis_text: str | None = None
    mechanism_contact: bool | None = Field(
        None, description="True=contact injury, False=non-contact, None=unknown."
    )

    source_urls: list[str] = Field(default_factory=list, description="Provenance of injury info.")
    clip_ids: list[str] = Field(default_factory=list, description="Clips showing this injury.")

    created_at: datetime = Field(default_factory=_utcnow)
    notes: str | None = None
