"""Build Label Studio tasks from clips, pre-populated with CV signal suggestions.

Each task references a clip and carries the pose-derived signals (if present) so
the human labeler sees the model's *suggestions* (estimated landing frame, a
1-vs-2-foot guess, motion state) while applying ground-truth labels.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..config import settings
from ..io import video as video_io


def _load_signals(clip_id: str, pose_dir: Path) -> dict | None:
    sig = pose_dir / f"{clip_id}.signals.json"
    if sig.exists():
        return json.loads(sig.read_text())
    return None


def build_tasks(
    clips_dir: str | Path | None = None,
    pose_dir: str | Path | None = None,
    injury_ids: dict[str, str] | None = None,
) -> list[dict]:
    """Return Label Studio task dicts for every clip in ``clips_dir``.

    ``injury_ids`` optionally maps clip_id -> injury_id for injury clips.
    """
    clips_dir = Path(clips_dir or settings.sample_clips_dir)
    pose_dir = Path(pose_dir or settings.pose_out_dir)
    injury_ids = injury_ids or {}

    tasks: list[dict] = []
    for clip_path in video_io.discover_clips(clips_dir):
        clip_id = clip_path.stem
        signals = _load_signals(clip_id, pose_dir)
        tasks.append(
            {
                "data": {
                    "clip_id": clip_id,
                    # Label Studio serves media by URL; local files are exposed
                    # via LOCAL_FILES storage. Keep the path for reference.
                    "video": str(clip_path),
                    "injury_id": injury_ids.get(clip_id),
                    # CV assistance surfaced to the labeler:
                    "cv_suggestions": signals or {},
                }
            }
        )
    return tasks


def export(out_path: str | Path | None = None, **kwargs) -> Path:
    out_path = Path(out_path or (settings.data_dir / "labels" / "label_studio_tasks.json"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tasks = build_tasks(**kwargs)
    out_path.write_text(json.dumps(tasks, indent=2))
    print(f"[ok] wrote {len(tasks)} tasks -> {out_path}")
    return out_path


if __name__ == "__main__":
    export()
