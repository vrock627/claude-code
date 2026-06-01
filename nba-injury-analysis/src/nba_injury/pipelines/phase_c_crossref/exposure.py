"""Exposure-denominator construction for Phase C (STUB).

The central analytic risk of the whole project lives here: defining the
"at-risk action" so that injury counts and base-rate exposures use *identical*
units. Get this wrong and every risk ratio is meaningless.

Design contract (to be implemented once Phase B data exists):
  * The unit of exposure is a *qualifying action* (e.g. a jump-landing), NOT
    minutes played or possessions.
  * For each metric value v, build a 2x2 contingency:
        injuries_with_v, exposures_with_v (from PlayRecord.n_exposures),
        injuries_without_v, exposures_without_v
  * The reference category for each metric is the most common / "neutral" value
    (e.g. TWO-foot landing), declared explicitly so ratios are interpretable.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExposureTable:
    """A 2x2 table for one metric value vs its reference."""

    metric_field: str
    metric_value: str
    reference_value: str
    injuries_exposed: int
    exposures_exposed: int
    injuries_reference: int
    exposures_reference: int


def build_exposure_tables(*_args, **_kwargs) -> list[ExposureTable]:
    raise NotImplementedError(
        "Phase C exposure construction is a stub. Requires Phase B PlayRecord data "
        "and labeled injury clips. See docs/ARCHITECTURE.md (Phase C)."
    )
