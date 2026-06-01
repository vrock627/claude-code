"""Pose estimation over a clip.

The concrete backend (YOLO-pose) is hidden behind the ``PoseEstimator`` protocol
so MediaPipe (single-player crops) or MMPose (production accuracy) can be dropped
in later without touching the rest of the pipeline. This pluggability is the main
hedge against broadcast-footage pose inaccuracy.

Heavy imports (ultralytics) are lazy: this module imports cleanly without the
``cv`` extra installed, so schema/signal tests run in a minimal environment.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from ...config import Settings, settings as default_settings
from ...io import video as video_io
from ...schema.pose import COCO_KEYPOINT_NAMES, ClipPoseSeries, FramePose, Keypoint


class PoseEstimator(Protocol):
    """Estimate per-frame, multi-person, tracked pose for a clip."""

    model_name: str
    model_version: str

    def estimate(self, clip_path: str | Path) -> ClipPoseSeries:
        ...


class MissingDependencyError(RuntimeError):
    """Raised when an optional CV dependency is not installed."""


class YoloPoseEstimator:
    """Ultralytics YOLO-pose backend with built-in tracking."""

    def __init__(self, config: Settings | None = None):
        self.cfg = config or default_settings
        self.model_name = self.cfg.pose_model
        self.model_version = "ultralytics"
        self._model = None

    def _load(self):
        if self._model is not None:
            return
        try:
            from ultralytics import YOLO
            import ultralytics
        except Exception as exc:  # pragma: no cover - exercised only without extra
            raise MissingDependencyError(
                "ultralytics is not installed. Install the 'cv' extra: "
                "uv sync --extra cv"
            ) from exc
        self.model_version = getattr(ultralytics, "__version__", "ultralytics")
        # Weights are fetched from the network on first use if absent.
        self._model = YOLO(self.cfg.pose_model)

    def estimate(self, clip_path: str | Path) -> ClipPoseSeries:
        self._load()
        meta = video_io.probe(clip_path)
        clip_id = Path(clip_path).stem

        series = ClipPoseSeries(
            clip_id=clip_id,
            fps=meta.fps or 30.0,
            width=meta.width,
            height=meta.height,
            model_name=self.model_name,
            model_version=self.model_version,
        )

        # Stream tracked detections frame-by-frame.
        results = self._model.track(
            source=str(clip_path),
            tracker=self.cfg.tracker,
            stream=True,
            persist=True,
            verbose=False,
        )
        for idx, res in enumerate(results):
            ts = idx / series.fps
            series.frames.extend(self._frame_poses(res, idx, ts, meta.width, meta.height))
        return series

    def _frame_poses(self, res, frame_idx, ts, width, height) -> list[FramePose]:
        out: list[FramePose] = []
        kpts = getattr(res, "keypoints", None)
        boxes = getattr(res, "boxes", None)
        if kpts is None or kpts.xy is None:
            return out

        xy = kpts.xy.cpu().numpy()                # (n_persons, 17, 2) in pixels
        conf = kpts.conf.cpu().numpy() if kpts.conf is not None else None
        n = xy.shape[0]
        ids = boxes.id.int().cpu().numpy() if (boxes is not None and boxes.id is not None) else range(n)
        bxywh = boxes.xywh.cpu().numpy() if boxes is not None else None
        pscore = boxes.conf.cpu().numpy() if boxes is not None else None

        for p in range(n):
            person_score = float(pscore[p]) if pscore is not None else 1.0
            if person_score < self.cfg.pose_min_person_score:
                continue
            keypoints = [
                Keypoint(
                    name=COCO_KEYPOINT_NAMES[k],
                    x=float(xy[p, k, 0]) / width,
                    y=float(xy[p, k, 1]) / height,
                    confidence=float(conf[p, k]) if conf is not None else 1.0,
                )
                for k in range(min(len(COCO_KEYPOINT_NAMES), xy.shape[1]))
            ]
            if bxywh is not None:
                bx, by, bw, bh = bxywh[p]
                bbox = (bx / width, by / height, bw / width, bh / height)
            else:
                bbox = (0.0, 0.0, 0.0, 0.0)
            track_id = int(list(ids)[p]) if not isinstance(ids, range) else p
            out.append(
                FramePose(
                    frame_idx=frame_idx,
                    timestamp_s=ts,
                    track_id=track_id,
                    bbox=bbox,
                    keypoints=keypoints,
                    person_score=person_score,
                )
            )
        return out


def select_subject_track(series: ClipPoseSeries, override: int | None = None) -> int | None:
    """Pick the track to analyze.

    Default heuristic = the most persistent track, tie-broken by average
    centrality (closeness to frame center) and bbox area. A ``--track-id``
    override always wins, because the human labeler ultimately confirms which
    player was injured. Documented limitation: this is not injured-player ID.
    """
    if override is not None:
        return override
    if not series.frames:
        return None

    stats: dict[int, dict[str, float]] = {}
    for f in series.frames:
        s = stats.setdefault(f.track_id, {"count": 0.0, "central": 0.0, "area": 0.0})
        s["count"] += 1
        cx = f.bbox[0] + f.bbox[2] / 2
        cy = f.bbox[1] + f.bbox[3] / 2
        s["central"] += 1.0 - (abs(cx - 0.5) + abs(cy - 0.5))
        s["area"] += f.bbox[2] * f.bbox[3]

    def score(tid: int) -> tuple[float, float, float]:
        s = stats[tid]
        n = s["count"]
        return (n, s["central"] / n, s["area"] / n)

    return max(stats, key=score)
