"""Risk models for Phase C (STUB).

Two complementary, inference-first approaches (injuries are rare, so we estimate
risk, not balanced-accuracy prediction):

1. Relative risk / incidence-rate ratio per mechanic (primary, simplest):
     RR = (injuries_exposed / exposures_exposed) / (injuries_ref / exposures_ref)
   with a confidence interval. Implemented against ``ExposureTable`` via
   scipy/statsmodels once data exists.

2. Multivariable regression to adjust for confounders (player, event type,
   motion state): logistic regression, or Poisson/negative-binomial on counts
   with an exposure offset (log of n_exposures). statsmodels gives interpretable
   coefficients with CIs.

Both paths are stubbed here with their intended signatures.
"""

from __future__ import annotations

from dataclasses import dataclass

from .exposure import ExposureTable


@dataclass
class RiskEstimate:
    metric_field: str
    metric_value: str
    relative_risk: float
    ci_low: float
    ci_high: float
    n_injuries: int


def relative_risk(table: ExposureTable) -> RiskEstimate:
    """Compute relative risk + CI for one ExposureTable. Not yet implemented."""
    raise NotImplementedError(
        "Implement with scipy.stats once Phase B exposures exist. "
        "Use Poisson/log-binomial CIs; guard against zero cells (add-0.5 or Firth)."
    )


def fit_adjusted_model(*_args, **_kwargs):
    """Fit a multivariable logistic/Poisson model with exposure offset. Stub."""
    raise NotImplementedError(
        "Implement with statsmodels (Logit or GLM Poisson with log-exposure offset)."
    )
