"""Core data structures shared across the project."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass
class SoldListing:
    """A single sold/completed eBay item."""
    title: str
    item_price: float
    shipping: float = 0.0
    sold_date: date | None = None
    condition: str | None = None
    url: str | None = None

    @property
    def total(self) -> float:
        return self.item_price + self.shipping


@dataclass
class PartQuery:
    """One thing to look up: a part on a specific vehicle."""
    make: str
    model: str
    part_name: str
    year_start: int | None = None
    year_end: int | None = None

    @property
    def vehicle(self) -> str:
        return f"{self.make} {self.model}"

    @property
    def year_range(self) -> str:
        if self.year_start and self.year_end:
            return f"{self.year_start}-{self.year_end}"
        if self.year_start:
            return str(self.year_start)
        return ""

    @property
    def search_terms(self) -> str:
        """The keyword string sent to eBay."""
        parts = [str(self.year_start or "").strip(), self.make, self.model, self.part_name]
        return " ".join(p for p in parts if p).strip()


@dataclass
class PartStats:
    """Aggregated economics for one PartQuery."""
    query: PartQuery
    sample_size: int = 0
    avg_price: float = 0.0
    median_price: float = 0.0
    min_price: float = 0.0
    max_price: float = 0.0
    std_price: float = 0.0
    volume: int = 0
    est_monthly_volume: float = 0.0
    avg_net: float = 0.0
    suggested_max_buy: float = 0.0
    opportunity_score: float = 0.0
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def as_row(self) -> dict:
        """Flattened dict for a spreadsheet row."""
        q = self.query
        return {
            "part": q.part_name,
            "year_range": q.year_range,
            "median_price": round(self.median_price, 2),
            "avg_price": round(self.avg_price, 2),
            "min": round(self.min_price, 2),
            "max": round(self.max_price, 2),
            "std": round(self.std_price, 2),
            "volume": self.volume,
            "est_monthly_volume": round(self.est_monthly_volume, 1),
            "avg_net": round(self.avg_net, 2),
            "suggested_max_buy": round(self.suggested_max_buy, 2),
            "opportunity_score": round(self.opportunity_score, 1),
            "sample_size": self.sample_size,
            "last_updated": self.last_updated,
        }
