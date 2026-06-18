"""CLI: pull eBay sold data for car parts -> analyze -> Google Sheets.

Examples:
    python main.py --make Honda --model Civic --dry-run
    python main.py --all
    python main.py --all --margin 0.5 --lookback 90 --limit 3
"""
from __future__ import annotations

import argparse
import sys

import analyze as analyze_mod
import catalog
from config import SETTINGS
from models import PartStats
from sources import get_source


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="eBay used car parts profit analyzer")
    p.add_argument("--make", help="limit to one make, e.g. Honda")
    p.add_argument("--model", help="limit to one model, e.g. Civic")
    p.add_argument("--all", action="store_true", help="run the full catalog")
    p.add_argument("--source", choices=["scraper", "api"], default="scraper")
    p.add_argument("--margin", type=float, default=SETTINGS.target_margin,
                   help="target profit margin for suggested max buy (0-1)")
    p.add_argument("--lookback", type=int, default=SETTINGS.lookback_days,
                   help="days of sold history")
    p.add_argument("--no-cache", action="store_true", help="ignore on-disk cache")
    p.add_argument("--dry-run", action="store_true", help="print only, don't write Sheets")
    p.add_argument("--limit", type=int, help="max parts per vehicle (quick tests)")
    return p.parse_args(argv)


def print_table(stats_list: list[PartStats]) -> None:
    hdr = f"{'part':<22}{'median':>9}{'vol':>5}{'net':>9}{'max buy':>10}{'score':>9}"
    current = None
    for s in sorted(stats_list, key=lambda x: (x.query.vehicle, -x.opportunity_score)):
        if s.query.vehicle != current:
            current = s.query.vehicle
            print(f"\n=== {current} ({s.query.year_range}) ===")
            print(hdr)
            print("-" * len(hdr))
        print(f"{s.query.part_name:<22}{s.median_price:>9.0f}{s.volume:>5}"
              f"{s.avg_net:>9.0f}{s.suggested_max_buy:>10.0f}{s.opportunity_score:>9.0f}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not (args.all or args.make or args.model):
        print("Specify --all or --make/--model. See --help.", file=sys.stderr)
        return 2

    queries = catalog.build_queries(make=args.make, model=args.model)
    if args.limit:
        # keep first N parts per vehicle
        seen: dict[str, int] = {}
        trimmed = []
        for q in queries:
            seen[q.vehicle] = seen.get(q.vehicle, 0) + 1
            if seen[q.vehicle] <= args.limit:
                trimmed.append(q)
        queries = trimmed

    if not queries:
        print("No matching vehicles in the catalog.", file=sys.stderr)
        return 1

    source = get_source(args.source)
    if hasattr(source, "use_cache"):
        source.use_cache = not args.no_cache

    print(f"Analyzing {len(queries)} part queries via {args.source}...", file=sys.stderr)
    stats_list: list[PartStats] = []
    for i, q in enumerate(queries, 1):
        try:
            listings = source.fetch_sold(q)
            stats = analyze_mod.analyze(
                q, listings, lookback_days=args.lookback, target_margin=args.margin
            )
        except Exception as e:  # keep going on individual failures
            print(f"  [{i}/{len(queries)}] {q.search_terms!r} FAILED: {e}", file=sys.stderr)
            continue
        stats_list.append(stats)
        print(f"  [{i}/{len(queries)}] {q.search_terms!r}: "
              f"{stats.sample_size} sold, median ${stats.median_price:.0f}", file=sys.stderr)

    if not stats_list:
        print("No data collected.", file=sys.stderr)
        return 1

    if args.dry_run:
        print_table(stats_list)
    else:
        from sheets import write_stats
        write_stats(stats_list)
        print(f"Wrote {len(stats_list)} rows to Google Sheet {SETTINGS.sheet_id}.",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
