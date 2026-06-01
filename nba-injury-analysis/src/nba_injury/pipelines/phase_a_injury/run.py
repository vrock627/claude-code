"""Phase A CLI: clip -> tracked pose -> derived signals.

Example:
    python -m nba_injury.pipelines.phase_a_injury.run \
        --clip data/clips/sample/example.mp4

Outputs (under data/interim/pose/ by default):
    <clip_id>.parquet        long-format per-frame pose
    <clip_id>.meta.json      pose metadata
    <clip_id>.signals.json   derived biomechanical signals (labeling assistance)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ...config import settings
from ...io import storage
from .derived_signals import compute_derived_signals
from .ingest import validate_clip
from .pose_estimation import YoloPoseEstimator, select_subject_track


def process_clip(clip_path: str | Path, track_id: int | None = None, out_dir: Path | None = None):
    out_dir = out_dir or settings.pose_out_dir

    info = validate_clip(clip_path)
    if not info.ok:
        print(f"[warn] {info.clip_id}: {'; '.join(info.issues)}", file=sys.stderr)

    estimator = YoloPoseEstimator(settings)
    series = estimator.estimate(clip_path)

    parquet_path, meta_path = storage.write_pose_series(series, out_dir)

    subject = select_subject_track(series, override=track_id)
    if subject is None:
        print(f"[warn] {series.clip_id}: no tracks detected; skipping signals", file=sys.stderr)
        return series, None

    signals = compute_derived_signals(series, subject, settings)
    signals_path = Path(out_dir) / f"{series.clip_id}.signals.json"
    storage.write_json(signals.to_dict(), signals_path)

    print(f"[ok] {series.clip_id}: {len(series.frames)} frame-detections -> {parquet_path.name}")
    print(f"[ok] {series.clip_id}: subject track={subject} -> {signals_path.name}")
    return series, signals


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Run Phase A pose + derived signals on a clip.")
    p.add_argument("--clip", required=True, help="Path to a video clip.")
    p.add_argument(
        "--track-id",
        type=int,
        default=None,
        help="Override the analyzed subject track (default: auto-select).",
    )
    p.add_argument("--out-dir", default=None, help="Output directory (default: data/interim/pose).")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    out_dir = Path(args.out_dir) if args.out_dir else None
    process_clip(args.clip, track_id=args.track_id, out_dir=out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
