"""Analysis math tests — fees, margin, volume, opportunity score."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from analyze import analyze, net_proceeds  # noqa: E402
from models import PartQuery, SoldListing  # noqa: E402


def q():
    return PartQuery(make="Honda", model="Civic", part_name="headlight assembly",
                     year_start=2017, year_end=2021)


def test_net_proceeds_applies_fee_and_fixed():
    # 100 * (1 - 0.136) - 0.30 = 86.10
    assert round(net_proceeds(100.0, fee_rate=0.136, fee_fixed=0.30), 2) == 86.10


def test_net_proceeds_never_negative():
    assert net_proceeds(0.10) == 0.0


def test_empty_listings_returns_zeroed_stats():
    s = analyze(q(), [])
    assert s.sample_size == 0
    assert s.median_price == 0.0
    assert s.suggested_max_buy == 0.0


def test_basic_aggregation():
    listings = [
        SoldListing("a", item_price=100, shipping=0),
        SoldListing("b", item_price=200, shipping=0),
        SoldListing("c", item_price=300, shipping=0),
    ]
    s = analyze(q(), listings, lookback_days=90, target_margin=0.5)
    assert s.sample_size == 3
    assert s.median_price == 200
    assert s.avg_price == 200
    assert s.min_price == 100 and s.max_price == 300
    # 3 sold over ~3 months -> ~1/month
    assert round(s.est_monthly_volume, 2) == 1.0
    # net of avg 200 = 200*0.864 - 0.30 = 172.50; max buy at 50% margin = 86.25
    assert round(s.avg_net, 2) == 172.50
    assert round(s.suggested_max_buy, 2) == 86.25


def test_ignores_zero_priced_items():
    listings = [
        SoldListing("a", item_price=100),
        SoldListing("junk", item_price=0),
    ]
    s = analyze(q(), listings)
    assert s.sample_size == 1
