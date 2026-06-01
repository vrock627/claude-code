"""Clip discovery and validation for Phase A."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ...io import video as video_io


@dataclass
class ClipInfo:
    clip_id: str
    path: Path
    meta: video_io.VideoMeta
    issues: list[str]

    @property
    def ok(self) -> bool:
        return not self.issues


def validate_clip(path: str | Path) -> ClipInfo:
    """Probe a clip and flag obvious problems (zero fps, tiny, unreadable)."""
    path = Path(path)
    issues: list[str] = []
    meta = video_io.probe(path)
    if meta.fps <= 0:
        issues.append("fps could not be determined; pass through ffmpeg to normalize")
    if meta.n_frames < 5:
        issues.append("fewer than 5 frames; clip too short to analyze")
    if meta.width <= 0 or meta.height <= 0:
        issues.append("invalid frame dimensions")
    return ClipInfo(clip_id=path.stem, path=path, meta=meta, issues=issues)


def discover_and_validate(directory: str | Path) -> list[ClipInfo]:
    return [validate_clip(p) for p in video_io.discover_clips(directory)]
