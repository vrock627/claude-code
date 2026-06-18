"""Write PartStats into a Google Sheet: one tab per make/model."""
from __future__ import annotations

from collections import defaultdict

from config import SETTINGS
from models import PartStats

COLUMNS = [
    "part", "year_range", "median_price", "avg_price", "min", "max", "std",
    "volume", "est_monthly_volume", "avg_net", "suggested_max_buy",
    "opportunity_score", "sample_size", "last_updated",
]


def _open_spreadsheet():
    import gspread
    from google.oauth2.service_account import Credentials

    if not SETTINGS.google_credentials:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS not set (see README).")
    if not SETTINGS.sheet_id:
        raise RuntimeError("SHEET_ID not set (see README).")

    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_file(SETTINGS.google_credentials, scopes=scopes)
    return gspread.authorize(creds).open_by_key(SETTINGS.sheet_id)


def _rows_for(stats_list: list[PartStats]) -> list[list]:
    rows = [COLUMNS]
    # Highest-opportunity parts first.
    for s in sorted(stats_list, key=lambda x: x.opportunity_score, reverse=True):
        r = s.as_row()
        rows.append([r[c] for c in COLUMNS])
    return rows


def write_stats(stats_list: list[PartStats]) -> None:
    """Group by vehicle and write a worksheet per make/model."""
    ss = _open_spreadsheet()

    by_vehicle: dict[str, list[PartStats]] = defaultdict(list)
    for s in stats_list:
        by_vehicle[s.query.vehicle].append(s)

    for vehicle, group in by_vehicle.items():
        title = vehicle[:99]  # sheet title length limit
        rows = _rows_for(group)
        try:
            ws = ss.worksheet(title)
            ws.clear()
        except Exception:
            ws = ss.add_worksheet(title=title, rows=len(rows) + 5, cols=len(COLUMNS))
        ws.update(rows, value_input_option="RAW")

    # Cross-vehicle "Top opportunities" summary tab.
    _write_summary(ss, stats_list)


def _write_summary(ss, stats_list: list[PartStats]) -> None:
    header = ["vehicle"] + COLUMNS
    rows = [header]
    top = sorted(stats_list, key=lambda x: x.opportunity_score, reverse=True)[:50]
    for s in top:
        r = s.as_row()
        rows.append([s.query.vehicle] + [r[c] for c in COLUMNS])
    try:
        ws = ss.worksheet("Top opportunities")
        ws.clear()
    except Exception:
        ws = ss.add_worksheet(title="Top opportunities", rows=len(rows) + 5, cols=len(header))
    ws.update(rows, value_input_option="RAW")
