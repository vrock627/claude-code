"""Phase B (STUB): build base-rate exposure records over normal play.

Not implemented yet. The goal: for an undetermined time frame, scan plays and
emit one ``PlayRecord`` per qualifying action with the same metric enums used
for injury labels, plus ``n_exposures`` (the denominator for Phase C).

Until full play data + a labeling/extraction path exists, this returns an empty
set and documents the intended contract.
"""

from __future__ import annotations

from collections.abc import Iterable

from ...schema.plays import PlayRecord


def build_base_rate_records(*_args, **_kwargs) -> list[PlayRecord]:
    raise NotImplementedError(
        "Phase B is a stub. It will consume play-level video/tracking data and emit "
        "PlayRecord exposures. See docs/ARCHITECTURE.md (Phase B)."
    )


def summarize_exposures(records: Iterable[PlayRecord]) -> dict[str, dict[str, int]]:
    """Aggregate exposure counts per metric value (usable once records exist).

    Returns ``{metric_field: {metric_value: total_exposures}}``.
    """
    fields = (
        "takeoff_feet",
        "landing_feet",
        "landing_surface",
        "motion_state",
        "interference",
    )
    summary: dict[str, dict[str, int]] = {f: {} for f in fields}
    for r in records:
        for f in fields:
            val = getattr(r, f).value
            summary[f][val] = summary[f].get(val, 0) + r.n_exposures
    return summary
