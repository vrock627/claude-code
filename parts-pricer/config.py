"""Tunable settings. Reads from environment / .env where relevant."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "cache"


@dataclass(frozen=True)
class Settings:
    # Analysis economics
    fee_rate: float = 0.136          # eBay + payment processing, ~13.6%
    fee_fixed: float = 0.30          # per-order fixed fee
    target_margin: float = 0.50      # desired profit margin -> suggested max buy
    lookback_days: int = 90          # eBay sold search ~ last 90 days

    # Scraper politeness
    min_delay: float = float(os.getenv("SCRAPE_MIN_DELAY", "3"))
    max_delay: float = float(os.getenv("SCRAPE_MAX_DELAY", "6"))
    cache_ttl_hours: int = 24
    request_timeout: float = 30.0
    max_results_per_query: int = 240  # eBay _ipg cap

    # Google Sheets
    sheet_id: str | None = os.getenv("SHEET_ID") or None
    google_credentials: str | None = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or None

    # eBay API (used only with --source api)
    ebay_app_id: str | None = os.getenv("EBAY_APP_ID") or None
    ebay_cert_id: str | None = os.getenv("EBAY_CERT_ID") or None
    ebay_marketplace_id: str = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_US")


SETTINGS = Settings()

# A realistic desktop browser UA + headers. eBay 403s obvious bots.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}
