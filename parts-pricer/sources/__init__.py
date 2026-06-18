from .base import SoldDataSource
from .ebay_scraper import EbayScraper

__all__ = ["SoldDataSource", "EbayScraper", "get_source"]


def get_source(name: str) -> SoldDataSource:
    """Factory: 'scraper' (active) or 'api' (requires eBay keys)."""
    if name == "scraper":
        return EbayScraper()
    if name == "api":
        from .ebay_api import EbayApiSource

        return EbayApiSource()
    raise ValueError(f"unknown source: {name!r} (expected 'scraper' or 'api')")
