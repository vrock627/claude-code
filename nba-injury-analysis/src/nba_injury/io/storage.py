"""Read/write helpers for pose series (parquet) and records (JSON)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import polars as pl

from ..schema.pose import ClipPoseSeries


def pose_series_to_long_df(series: ClipPoseSeries) -> pl.DataFrame:
    """Flatten a ClipPoseSeries to long format: one row per frame x track x keypoint."""
    rows: list[dict[str, Any]] = []
    for fp in series.frames:
        for kp in fp.keypoints:
            rows.append(
                {
                    "clip_id": series.clip_id,
                    "frame_idx": fp.frame_idx,
                    "timestamp_s": fp.timestamp_s,
                    "track_id": fp.track_id,
                    "person_score": fp.person_score,
                    "keypoint": kp.name,
                    "x": kp.x,
                    "y": kp.y,
                    "kp_confidence": kp.confidence,
                }
            )
    schema = {
        "clip_id": pl.Utf8,
        "frame_idx": pl.Int64,
        "timestamp_s": pl.Float64,
        "track_id": pl.Int64,
        "person_score": pl.Float64,
        "keypoint": pl.Utf8,
        "x": pl.Float64,
        "y": pl.Float64,
        "kp_confidence": pl.Float64,
    }
    return pl.DataFrame(rows, schema=schema)


def write_pose_series(series: ClipPoseSeries, out_dir: str | Path) -> tuple[Path, Path]:
    """Write parquet (frame data) + JSON sidecar (metadata). Returns both paths."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    parquet_path = out_dir / f"{series.clip_id}.parquet"
    meta_path = out_dir / f"{series.clip_id}.meta.json"

    pose_series_to_long_df(series).write_parquet(parquet_path)
    meta = {
        "clip_id": series.clip_id,
        "fps": series.fps,
        "width": series.width,
        "height": series.height,
        "model_name": series.model_name,
        "model_version": series.model_version,
        "n_frames": len(series.frames),
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    return parquet_path, meta_path


def write_json(obj: Any, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))
    return path
