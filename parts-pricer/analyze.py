"""Turn raw sold listings into profit-oriented stats."""
from __future__ import annotations

import statistics

from config import SETTINGS
from models import PartQuery, PartStats, SoldListing


def net_proceeds(total: float, fee_rate: float = SETTINGS.fee_rate,
                 fee_fixed: float = SETTINGS.fee_fixed) -> float:
    """What you actually keep after eBay/payment fees."""
    return max(0.0, total * (1 - fee_rate) - fee_fixed)


def analyze(query: PartQuery, listings: list[SoldListing],
            lookback_days: int = SETTINGS.lookback_days,
            target_margin: float = SETTINGS.target_margin) -> PartStats:
    """Aggregate listings for one part into a PartStats row.

    - median is the headline (robust to the odd $1 or $9,999 listing)
    - volume normalized to a monthly estimate over the lookback window
    - suggested_max_buy = avg net proceeds discounted by your target margin
    - opportunity_score ranks "what to pull first" = monthly volume x net
    """
    stats = PartStats(query=query)
    totals = [l.total for l in listings if l.total > 0]
    if not totals:
        return stats

    stats.sample_size = len(totals)
    stats.volume = len(totals)
    stats.avg_price = statistics.fmean(totals)
    stats.median_price = statistics.median(totals)
    stats.min_price = min(totals)
    stats.max_price = max(totals)
    stats.std_price = statistics.pstdev(totals) if len(totals) > 1 else 0.0

    months = max(lookback_days / 30.0, 0.001)
    stats.est_monthly_volume = stats.volume / months

    stats.avg_net = net_proceeds(stats.avg_price)
    stats.suggested_max_buy = max(0.0, stats.avg_net * (1 - target_margin))
    stats.opportunity_score = stats.est_monthly_volume * stats.avg_net
    return stats
