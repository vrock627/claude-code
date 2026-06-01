#!/usr/bin/env python3
"""Smoke-check the scaffold and report prerequisites clearly.

Run from the project root:  python scripts/verify_scaffold.py

It:
  1. imports the package and core schema (must always pass),
  2. reports which optional capabilities are present (ffmpeg, video backend,
     ultralytics) instead of failing opaquely,
  3. generates a tiny synthetic (non-NBA) fixture clip if OpenCV is available,
  4. runs the pose prototype on that clip when CV deps allow.
"""

from __future__ import annotations

import importlib
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC = PROJECT_ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "synthetic_jump.mp4"


def check(label: str, ok: bool, detail: str = "") -> bool:
    mark = "OK " if ok else "-- "
    print(f"[{mark}] {label}" + (f" ({detail})" if detail else ""))
    return ok


def _module(name: str) -> bool:
    try:
        importlib.import_module(name)
        return True
    except Exception:
        return False


def make_fixture() -> bool:
    """Create a crude synthetic jump clip with OpenCV (a moving rectangle 'player')."""
    try:
        import cv2
        import numpy as np
    except Exception:
        return False
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    w, h, fps, n = 320, 240, 30, 30
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(FIXTURE), fourcc, fps, (w, h))
    if not writer.isOpened():
        return False
    for idx in range(n):
        frame = np.full((h, w, 3), 30, dtype=np.uint8)
        # Vertical position: jump between frames 5..14.
        airborne = 5 <= idx <= 14
        y = 60 if airborne else 140
        cv2.rectangle(frame, (140, y), (180, y + 80), (200, 200, 200), -1)
        writer.write(frame)
    writer.release()
    return FIXTURE.exists()


def main() -> int:
    print("== nba-injury-analysis scaffold check ==\n")

    # 1. Core imports — these must work.
    ok_pkg = True
    try:
        import nba_injury  # noqa: F401
        from nba_injury.schema import ClipMetricLabel, PlayRecord  # noqa: F401
        from nba_injury.pipelines.phase_a_injury import derived_signals  # noqa: F401

        check("core package + schema import", True, nba_injury.__version__)
    except Exception as exc:  # pragma: no cover
        ok_pkg = check("core package import", False, str(exc))

    # 2. Optional capabilities.
    has_ffmpeg = shutil.which("ffmpeg") is not None
    check("ffmpeg on PATH", has_ffmpeg, "needed to normalize clip fps" if not has_ffmpeg else "")
    has_decord = _module("decord")
    has_cv2 = _module("cv2")
    has_backend = has_decord or has_cv2
    check("video backend (decord/opencv)", has_backend, "uv sync --extra cv" if not has_backend else "")
    has_yolo = _module("ultralytics")
    check("ultralytics (YOLO-pose)", has_yolo, "uv sync --extra cv; weights fetched on first run" if not has_yolo else "")
    check("statsmodels/scipy (Phase C)", _module("statsmodels"), "uv sync --extra stats")

    # 3 + 4. Try the end-to-end prototype if we can.
    if has_cv2:
        made = make_fixture()
        check("generated synthetic fixture clip", made, str(FIXTURE) if made else "OpenCV VideoWriter failed")
        if made and has_backend and has_yolo:
            try:
                from nba_injury.pipelines.phase_a_injury.run import process_clip

                out = PROJECT_ROOT / "data" / "interim" / "pose"
                series, signals = process_clip(FIXTURE, out_dir=out)
                check("pose prototype ran on fixture", series is not None,
                      f"{len(series.frames)} frame-detections")
            except Exception as exc:
                check("pose prototype ran on fixture", False, str(exc))
        else:
            print("[--] skipping pose run (needs video backend + ultralytics)")
    else:
        print("[--] skipping fixture generation (OpenCV not installed)")

    print("\nSummary: core scaffold is", "READY." if ok_pkg else "BROKEN.")
    print("Run unit tests with:  uv run --extra dev pytest -q")
    return 0 if ok_pkg else 1


if __name__ == "__main__":
    raise SystemExit(main())
