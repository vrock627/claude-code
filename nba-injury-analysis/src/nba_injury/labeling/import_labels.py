"""Import completed Label Studio annotations into validated ClipMetricLabel records.

Maps the Label Studio export JSON onto the pydantic schema, enforcing the enum
vocabulary. Unrecognized / missing values fall back to UNKNOWN rather than
failing, so partially-labeled clips still import.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..schema.enums import (
    FootCount,
    InterferenceType,
    LabelSource,
    LandingSurface,
    MotionState,
)
from ..schema.labels import ClipMetricLabel


def _coerce(enum_cls, raw: Any, default):
    if raw is None:
        return default
    try:
        return enum_cls(str(raw).strip().lower())
    except ValueError:
        return default


def parse_annotation(task: dict) -> ClipMetricLabel:
    """Convert one Label Studio task+annotation into a ClipMetricLabel.

    Expects the result values keyed by the field names used in the labeling
    config (``label_studio_config.xml``).
    """
    data = task.get("data", {})
    # Flatten the first annotation's results into {from_name: value}.
    values: dict[str, Any] = {}
    annotations = task.get("annotations") or []
    if annotations:
        for r in annotations[0].get("result", []):
            name = r.get("from_name")
            val = r.get("value", {})
            choices = val.get("choices")
            if choices:
                values[name] = choices[0]
            elif "number" in val:
                values[name] = val["number"]
            elif "text" in val:
                values[name] = val["text"][0] if val["text"] else None

    label_id = str(task.get("id") or f"{data.get('clip_id')}-label")
    return ClipMetricLabel(
        label_id=label_id,
        clip_id=str(data.get("clip_id")),
        injury_id=data.get("injury_id"),
        takeoff_feet=_coerce(FootCount, values.get("takeoff_feet"), FootCount.UNKNOWN),
        landing_feet=_coerce(FootCount, values.get("landing_feet"), FootCount.UNKNOWN),
        landing_surface=_coerce(
            LandingSurface, values.get("landing_surface"), LandingSurface.UNKNOWN
        ),
        motion_state=_coerce(MotionState, values.get("motion_state"), MotionState.UNKNOWN),
        interference=_coerce(
            InterferenceType, values.get("interference"), InterferenceType.UNKNOWN
        ),
        interference_player=values.get("interference_player"),
        event_frame=int(values["event_frame"]) if values.get("event_frame") is not None else None,
        confidence=float(values.get("confidence", 1.0)),
        label_source=LabelSource.MANUAL,
        labeler_id=str(values.get("labeler_id") or "unknown"),
        cv_signal_ref=values.get("cv_signal_ref"),
    )


def import_export_file(path: str | Path) -> list[ClipMetricLabel]:
    tasks = json.loads(Path(path).read_text())
    return [parse_annotation(t) for t in tasks]
