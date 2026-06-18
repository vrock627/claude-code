"""The seam that makes 'scrape now, official API later' a config swap.

Every data source implements the same tiny interface, so analyze.py and main.py
never know or care where the sold listings came from.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from models import PartQuery, SoldListing


class SoldDataSource(ABC):
    @abstractmethod
    def fetch_sold(self, query: PartQuery) -> list[SoldListing]:
        """Return sold/completed listings matching the query."""
        raise NotImplementedError
