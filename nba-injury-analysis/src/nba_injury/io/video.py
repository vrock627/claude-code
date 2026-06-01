"""Video ingestion helpers.

Uses ``decord`` when available for fast, seekable frame reads, falling back to
OpenCV. Both are optional (the ``cv`` extra); importing this module must not
fail when neither is installed, so heavy imports are done lazily inside the
functions that need them.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import numpy as np


@dataclass(frozen=True)
class VideoMeta:
    path: Path
    fps: float
    width: int
    height: int
    n_frames: int

    @property
    def duration_s(self) -> float:
        return self.n_frames / self.fps if self.fps else 0.0


class VideoBackendError(RuntimeError):
    """Raised when no video backend (decord/opencv) is installed."""


def _has_decord() -> bool:
    try:
        import decord  # noqa: F401

        return True
    except Exception:
        return False


def _has_opencv() -> bool:
    try:
        import cv2  # noqa: F401

        return True
    except Exception:
        return False


def probe(path: str | Path) -> VideoMeta:
    """Read basic metadata for a clip without decoding all frames."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    if _has_decord():
        import decord

        vr = decord.VideoReader(str(path))
        fps = float(vr.get_avg_fps())
        first = vr[0].asnumpy()
        h, w = first.shape[:2]
        return VideoMeta(path=path, fps=fps, width=w, height=h, n_frames=len(vr))

    if _has_opencv():
        import cv2

        cap = cv2.VideoCapture(str(path))
        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS)) or 0.0
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            return VideoMeta(path=path, fps=fps, width=w, height=h, n_frames=n)
        finally:
            cap.release()

    raise VideoBackendError(
        "No video backend available. Install the 'cv' extra: uv sync --extra cv"
    )


def iter_frames(path: str | Path) -> Iterator[tuple[int, float, np.ndarray]]:
    """Yield ``(frame_idx, timestamp_s, frame_rgb)`` for each frame in the clip."""
    meta = probe(path)
    path = Path(path)

    if _has_decord():
        import decord

        vr = decord.VideoReader(str(path))
        for idx in range(len(vr)):
            frame = vr[idx].asnumpy()  # RGB
            yield idx, idx / meta.fps if meta.fps else 0.0, frame
        return

    if _has_opencv():
        import cv2

        cap = cv2.VideoCapture(str(path))
        try:
            idx = 0
            while True:
                ok, frame_bgr = cap.read()
                if not ok:
                    break
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                yield idx, idx / meta.fps if meta.fps else 0.0, frame_rgb
                idx += 1
        finally:
            cap.release()
        return

    raise VideoBackendError(
        "No video backend available. Install the 'cv' extra: uv sync --extra cv"
    )


def discover_clips(directory: str | Path, exts: tuple[str, ...] = (".mp4", ".mov", ".mkv")) -> list[Path]:
    """List candidate clip files in a directory (non-recursive)."""
    directory = Path(directory)
    if not directory.exists():
        return []
    return sorted(p for p in directory.iterdir() if p.suffix.lower() in exts)
