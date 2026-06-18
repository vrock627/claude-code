"""Parser tests against a saved fixture — no network."""
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sources.ebay_scraper import parse_sold_html  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "sold_sample.html"


def listings():
    return parse_sold_html(FIXTURE.read_text())


def test_skips_placeholder_card():
    titles = [l.title for l in listings()]
    assert not any(t.lower().startswith("shop on ebay") for t in titles)
    assert len(listings()) == 3


def test_parses_price_and_shipping():
    first = listings()[0]
    assert first.item_price == 185.00
    assert first.shipping == 24.50
    assert first.total == 209.50


def test_parses_comma_price_and_free_shipping():
    second = listings()[1]
    assert second.item_price == 1250.00
    assert second.shipping == 0.0


def test_parses_price_range_takes_first():
    third = listings()[2]
    assert third.item_price == 210.50


def test_parses_sold_date_and_url():
    first = listings()[0]
    assert first.sold_date == date(2026, 3, 12)
    assert first.url == "https://www.ebay.com/itm/111"
    assert first.condition == "Used"
