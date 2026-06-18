"""Curated catalog of high-volume vehicles and high-value parts.

These are among the best-selling / most common vehicles on US roads, so they
turn up most often in junkyards and as parts cars on Marketplace/Craigslist —
which means the deepest eBay sold-data and the most reliable resale.
"""
from __future__ import annotations

from models import PartQuery

# (make, model, generation_year_start, generation_year_end)
VEHICLES: list[tuple[str, str, int, int]] = [
    ("Ford", "F-150", 2015, 2020),
    ("Chevrolet", "Silverado 1500", 2014, 2018),
    ("Ram", "1500", 2013, 2018),
    ("Toyota", "Camry", 2012, 2017),
    ("Toyota", "Corolla", 2014, 2019),
    ("Honda", "Civic", 2016, 2021),
    ("Honda", "Accord", 2013, 2017),
    ("Honda", "CR-V", 2017, 2022),
    ("Toyota", "RAV4", 2013, 2018),
    ("Nissan", "Altima", 2013, 2018),
    ("Ford", "Escape", 2013, 2019),
    ("Jeep", "Grand Cherokee", 2014, 2021),
    ("Chevrolet", "Equinox", 2010, 2017),
    ("Subaru", "Outback", 2015, 2019),
    ("Ford", "Mustang", 2015, 2021),
]

# High-value / high-turnover used parts. Catalytic converters intentionally
# excluded — reselling them is legally restricted in many jurisdictions.
PARTS: list[str] = [
    "engine",
    "transmission",
    "headlight assembly",
    "tail light",
    "ECU ECM",
    "radio infotainment",
    "instrument cluster",
    "alternator",
    "AC compressor",
    "door",
    "fender",
    "front bumper cover",
    "side mirror",
    "wheel rim",
    "front seat",
]


def build_queries(
    make: str | None = None,
    model: str | None = None,
    parts: list[str] | None = None,
) -> list[PartQuery]:
    """Cross product of vehicles x parts, optionally filtered to one vehicle."""
    parts = parts or PARTS
    queries: list[PartQuery] = []
    for vmake, vmodel, y_start, y_end in VEHICLES:
        if make and make.lower() not in vmake.lower():
            continue
        if model and model.lower() not in vmodel.lower():
            continue
        for part in parts:
            queries.append(
                PartQuery(
                    make=vmake,
                    model=vmodel,
                    part_name=part,
                    year_start=y_start,
                    year_end=y_end,
                )
            )
    return queries
