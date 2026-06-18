"""Scrapes eBay sold/completed listings.

NOTE: eBay actively blocks bots (naive requests get HTTP 403) and scraping is
against their ToS. We send realistic browser headers, throttle hard, and cache
responses on disk. The parser is split out (`parse_sold_html`) so it can be
unit-tested against a saved fixture with no network. For a durable, sanctioned
source, switch to sources/ebay_api.py.
"""
from __future__ import annotations

import hashlib
import random
import re
import time
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from config import BROWSER_HEADERS, CACHE_DIR, SETTINGS
from models import PartQuery, SoldListing
from sources.base import SoldDataSource

SEARCH_URL = "https://www.ebay.com/sch/i.html"

_PRICE_RE = re.compile(r"[\d,]+\.\d{2}")
_DATE_RE = re.compile(r"Sold\s+([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})")


def _money(text: str | None) -> float:
    """First dollar amount in a string ('$1,234.56' or '$10.00 to $20.00')."""
    if not text:
        return 0.0
    m = _PRICE_RE.search(text)
    if not m:
        return 0.0
    return float(m.group(0).replace(",", ""))


def _parse_sold_date(text: str) -> date | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    raw = m.group(1).replace(",", "")
    for fmt in ("%b %d %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_sold_html(html: str) -> list[SoldListing]:
    """Extract sold listings from an eBay search results page. No network."""
    soup = BeautifulSoup(html, "lxml")
    listings: list[SoldListing] = []

    for card in soup.select("li.s-item, div.s-item"):
        title_el = card.select_one(".s-item__title")
        if not title_el:
            continue
        title = title_el.get_text(" ", strip=True)
        # eBay injects a placeholder first card.
        if not title or title.lower().startswith("shop on ebay"):
            continue

        price_el = card.select_one(".s-item__price")
        price = _money(price_el.get_text() if price_el else None)
        if price <= 0:
            continue

        ship_el = card.select_one(".s-item__shipping, .s-item__logisticsCost")
        shipping = _money(ship_el.get_text() if ship_el else None)

        cond_el = card.select_one(".SECONDARY_INFO, .s-item__subtitle")
        condition = cond_el.get_text(" ", strip=True) if cond_el else None

        sold_el = card.select_one(".s-item__caption, .s-item__title--tagblock")
        sold_date = _parse_sold_date(sold_el.get_text(" ", strip=True)) if sold_el else None

        link_el = card.select_one("a.s-item__link")
        url = link_el.get("href") if link_el else None

        listings.append(
            SoldListing(
                title=title,
                item_price=price,
                shipping=shipping,
                sold_date=sold_date,
                condition=condition,
                url=url,
            )
        )
    return listings


class EbayScraper(SoldDataSource):
    def __init__(self, use_cache: bool = True):
        self.use_cache = use_cache
        CACHE_DIR.mkdir(exist_ok=True)

    def _url(self, query: PartQuery) -> str:
        params = {
            "_nkw": query.search_terms,
            "LH_Sold": 1,
            "LH_Complete": 1,
            "_ipg": SETTINGS.max_results_per_query,
        }
        return f"{SEARCH_URL}?{urlencode(params)}"

    def _cache_path(self, url: str) -> Path:
        key = hashlib.sha1(f"{url}|{date.today()}".encode()).hexdigest()[:16]
        return CACHE_DIR / f"{key}.html"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=16),
           reraise=True)
    def _get(self, url: str) -> str:
        with httpx.Client(headers=BROWSER_HEADERS, timeout=SETTINGS.request_timeout,
                          follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.text

    def fetch_sold(self, query: PartQuery) -> list[SoldListing]:
        url = self._url(query)
        cache_file = self._cache_path(url)

        if self.use_cache and cache_file.exists():
            html = cache_file.read_text(encoding="utf-8", errors="replace")
        else:
            # Be polite: random delay between live requests.
            time.sleep(random.uniform(SETTINGS.min_delay, SETTINGS.max_delay))
            html = self._get(url)
            if self.use_cache:
                cache_file.write_text(html, encoding="utf-8")

        return parse_sold_html(html)

    def load_from_file(self, path: str | Path) -> list[SoldListing]:
        """Fallback: parse a manually-saved eBay results page (when scraping is blocked)."""
        return parse_sold_html(Path(path).read_text(encoding="utf-8", errors="replace"))
