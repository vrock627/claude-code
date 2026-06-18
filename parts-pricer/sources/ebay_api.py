"""Official eBay API adapter (sanctioned, durable source).

Implements the same SoldDataSource interface as the scraper, so switching is a
config swap (`--source api`). Stubbed until you have credentials.

Two relevant eBay APIs:
  * Browse API            -> active listings (free with a developer account)
  * Marketplace Insights  -> SOLD item data (what this tool wants).
                             Limited Release: you must apply for access at
                             https://developer.ebay.com/

Set EBAY_APP_ID / EBAY_CERT_ID in .env, obtain an OAuth token, then implement
fetch_sold() against the Marketplace Insights `item_sales/search` endpoint.
"""
from __future__ import annotations

from config import SETTINGS
from models import PartQuery, SoldListing
from sources.base import SoldDataSource

INSIGHTS_ENDPOINT = (
    "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search"
)


class EbayApiSource(SoldDataSource):
    def __init__(self):
        if not (SETTINGS.ebay_app_id and SETTINGS.ebay_cert_id):
            raise RuntimeError(
                "eBay API credentials missing. Set EBAY_APP_ID and EBAY_CERT_ID "
                "in .env, get Marketplace Insights access "
                "(https://developer.ebay.com/), then implement fetch_sold(). "
                "Until then, use --source scraper."
            )

    def fetch_sold(self, query: PartQuery) -> list[SoldListing]:  # pragma: no cover
        # TODO: OAuth client-credentials token, then GET INSIGHTS_ENDPOINT with
        #   params {"q": query.search_terms, "filter": "..."}; map
        #   itemSales[].lastSoldPrice / lastSoldDate -> SoldListing.
        raise NotImplementedError(
            "eBay Marketplace Insights integration not implemented yet. "
            "See module docstring for the endpoint and mapping."
        )
