"""
hashtag_injuries.py
===================

Injury data source backed by Hashtag Basketball's NBA Injury Database
(https://hashtagbasketball.com/nba-injury), used in place of Pro Sports
Transactions (PST).

WHY THIS SOURCE
---------------
PST started returning HTTP 403 to automated traffic. Hashtag Basketball's
injury database is plain GET-able and, crucially, richer for our purpose:
every record already carries an exact INJURED ON date, a RETURNED date, and
a precomputed DAYS MISSED. That means we no longer have to *estimate* time
missed by pairing "relinquished" and "acquired" rows -- we read it directly.

HOW THE SITE IS SHAPED
----------------------
The data is organized by *injury type*, not by date or player. Each type has
a detail page at /injury/<slug> listing every player who has had that injury:

    PLAYER | TEAM | INJURED ON | RETURNED | DAYS MISSED

There is no sitemap and no by-date/by-player endpoint, so we enumerate the
type slugs (from the landing page plus a comprehensive set of keyword
searches), fetch each detail page once, and concatenate them into a single
normalized injury log. Pages are cached on disk so re-runs are cheap and we
stay polite to the site.

COVERAGE CAVEAT
---------------
Slug discovery is best-effort: the search box does not expose a "list all"
query, so a long-tail rare description might be missed. The seed list below
covers every body part / side / common descriptor, which captures the
overwhelming majority of real injuries. Pass extra seeds to widen coverage.

NORMALIZED SCHEMA (what fetch_injury_database returns)
------------------------------------------------------
    player       raw display name, e.g. "Jaren Jackson Jr."
    player_norm  normalized for matching (see nba_injury_clips._normalize_name)
    team         nickname as shown, e.g. "Grizzlies"
    date         datetime.date the injury occurred (INJURED ON)
    returned     datetime.date or None (None = no return logged / still out)
    days_missed  int or None
    injury_desc  the injury-type name, e.g. "Sprained left ankle"
"""

import os
import re
import time
from datetime import datetime
from io import StringIO

import requests
import pandas as pd

from nba_injury_clips import _normalize_name, SLEEP_BETWEEN_CALLS

BASE = "https://hashtagbasketball.com"
INJURY_INDEX_URL = f"{BASE}/nba-injury"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Keyword seeds for slug discovery. Anatomy + side + common descriptors --
# between them they touch essentially every injury description on the site.
SLUG_SEEDS = [
    "left", "right",
    "knee", "ankle", "foot", "heel", "achilles", "calf", "shin", "leg",
    "hamstring", "quad", "thigh", "hip", "groin", "adductor", "glute",
    "back", "spine", "neck", "shoulder", "elbow", "wrist", "hand", "finger",
    "thumb", "arm", "forearm", "rib", "abdominal", "oblique", "chest",
    "toe", "head", "concussion", "face", "nose", "eye", "jaw", "ear",
    "illness", "flu", "soreness", "sore", "strain", "sprain", "fracture",
    "surgery", "contusion", "bruise", "spasm", "stiffness", "tightness",
    "inflammation", "tendinitis", "tendon", "dislocated", "torn", "rupture",
    "protocols", "rest", "personal", "conditioning", "return",
]

DATE_FMT = "%d %B %Y"   # e.g. "07 April 2025"


# ---------------------------------------------------------------------------
# Pure parsing helpers (no network -- unit tested)
# ---------------------------------------------------------------------------
def _hidden_fields(html):
    """Pull the ASP.NET postback hidden fields out of a page."""
    out = {}
    for name in ("__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"):
        m = re.search(r'id="%s"[^>]*value="([^"]*)"' % name, html)
        out[name] = m.group(1) if m else ""
    return out


def parse_slug_results(html):
    """
    Parse a search-results page into {slug: injury_desc}.

    The results table links each injury type to /injury/<slug>; the anchor
    text is the human description.
    """
    found = {}
    for slug, label in re.findall(
        r'href="/injury/([^"]+)"[^>]*>(.*?)</a>', html, re.I | re.S
    ):
        desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", label)).strip()
        if slug and desc:
            found[slug] = desc
    return found


def _clean_cell(val):
    if val is None:
        return ""
    return re.sub(r"\s+", " ", str(val)).strip()


def _parse_date(val):
    s = _clean_cell(val)
    if not s:
        return None
    try:
        return datetime.strptime(s, DATE_FMT).date()
    except ValueError:
        return None


def _parse_int(val):
    s = _clean_cell(val)
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def parse_injury_page(html):
    """
    Parse a /injury/<slug> detail page into a normalized DataFrame.

    Columns: player, player_norm, team, date, returned, days_missed,
    injury_desc. Returns an empty (correctly-typed) frame if the table is
    missing.
    """
    cols = ["player", "player_norm", "team", "date", "returned",
            "days_missed", "injury_desc"]

    # injury description = page heading
    m = re.search(
        r'id="ContentPlaceHolder1_FormView1_NOTESLabel">(.*?)</span>',
        html, re.S,
    )
    injury_desc = _clean_cell(m.group(1)) if m else ""

    try:
        tables = pd.read_html(
            StringIO(html),
            attrs={"id": "ContentPlaceHolder1_GridView1"},
            flavor="lxml",  # avoid the html5lib fallback; lxml is a hard dep
        )
    except ValueError:
        return pd.DataFrame(columns=cols)
    if not tables:
        return pd.DataFrame(columns=cols)

    df = tables[0]
    df.columns = [_clean_cell(c).upper() for c in df.columns]
    need = {"PLAYER", "TEAM", "INJURED ON", "RETURNED", "DAYS MISSED"}
    if not need.issubset(df.columns):
        return pd.DataFrame(columns=cols)

    rows = []
    for _, r in df.iterrows():
        player = _clean_cell(r["PLAYER"])
        if not player:
            continue
        rows.append({
            "player": player,
            "player_norm": _normalize_name(player),
            "team": _clean_cell(r["TEAM"]),
            "date": _parse_date(r["INJURED ON"]),
            "returned": _parse_date(r["RETURNED"]),
            "days_missed": _parse_int(r["DAYS MISSED"]),
            "injury_desc": injury_desc,
        })
    return pd.DataFrame(rows, columns=cols)


def _missing(v):
    """True for None or float('nan') (how pandas stores blanks)."""
    return v is None or (isinstance(v, float) and v != v)


def format_severity(days_missed, returned):
    """Human 'time missed' string from an injury record."""
    if not _missing(days_missed):
        return f"{int(days_missed)} days"
    if _missing(returned):
        return "unknown (no return logged)"
    return "unknown"


# ---------------------------------------------------------------------------
# Network: slug discovery + page fetch (cached)
# ---------------------------------------------------------------------------
def _session():
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def search_slugs(session, index_html, term):
    """POST the search box for `term`; return {slug: desc}."""
    fields = _hidden_fields(index_html)
    data = {
        "__EVENTTARGET": "",
        "__EVENTARGUMENT": "",
        **fields,
        "ctl00$ContentPlaceHolder1$Table1": term,
        "ctl00$ContentPlaceHolder1$Button1": "Search",
    }
    resp = session.post(INJURY_INDEX_URL, data=data, timeout=30)
    resp.raise_for_status()
    return parse_slug_results(resp.text)


def discover_slugs(session, seeds=SLUG_SEEDS, verbose=True):
    """
    Build {slug: desc} for the whole database by combining the landing page
    with a keyword search per seed. Best-effort (see COVERAGE CAVEAT).
    """
    index_html = session.get(INJURY_INDEX_URL, timeout=30).text
    slugs = dict(parse_slug_results(index_html))  # top types on landing page

    for i, term in enumerate(seeds, 1):
        try:
            found = search_slugs(session, index_html, term)
        except requests.RequestException as e:
            if verbose:
                print(f"  search {term!r} failed: {e}")
            continue
        new = {k: v for k, v in found.items() if k not in slugs}
        slugs.update(found)
        if verbose:
            print(f"  [{i}/{len(seeds)}] {term!r}: +{len(new)} "
                  f"(total {len(slugs)})")
        time.sleep(SLEEP_BETWEEN_CALLS)
    return slugs


def fetch_injury_page(session, slug, cache_dir):
    """GET /injury/<slug>, caching the raw HTML on disk."""
    path = None
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        safe = re.sub(r"[^A-Za-z0-9_.-]", "_", slug)
        path = os.path.join(cache_dir, f"{safe}.html")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return f.read()
    resp = session.get(f"{BASE}/injury/{slug}", timeout=30)
    resp.raise_for_status()
    html = resp.text
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
    return html


def fetch_injury_database(session=None, cache_dir=".hashtag_cache",
                          seeds=SLUG_SEEDS, verbose=True):
    """
    Scrape the full injury log into one normalized DataFrame (schema above).
    Caches raw pages under `cache_dir`; delete it to force a refresh.
    """
    session = session or _session()
    if verbose:
        print("Discovering injury types on hashtagbasketball.com ...")
    slugs = discover_slugs(session, seeds=seeds, verbose=verbose)
    if verbose:
        print(f"Fetching {len(slugs)} injury-type pages "
              f"(cached in {cache_dir}/) ...")

    frames = []
    for i, (slug, desc) in enumerate(sorted(slugs.items()), 1):
        cached = bool(cache_dir) and os.path.exists(
            os.path.join(cache_dir, re.sub(r"[^A-Za-z0-9_.-]", "_", slug) + ".html")
        )
        try:
            html = fetch_injury_page(session, slug, cache_dir)
        except requests.RequestException as e:
            if verbose:
                print(f"  [{i}/{len(slugs)}] {slug}: fetch failed ({e})")
            continue
        frames.append(parse_injury_page(html))
        if not cached:
            time.sleep(SLEEP_BETWEEN_CALLS)

    cols = ["player", "player_norm", "team", "date", "returned",
            "days_missed", "injury_desc"]
    if not frames:
        return pd.DataFrame(columns=cols)
    df = pd.concat(frames, ignore_index=True)
    df = df.dropna(subset=["date"])
    df = df.drop_duplicates(
        subset=["player_norm", "date", "injury_desc"]
    ).reset_index(drop=True)
    if verbose:
        print(f"Injury log: {len(df)} records "
              f"({df['date'].min()} .. {df['date'].max()}).")
    return df


# ---------------------------------------------------------------------------
# Cross-check (replaces confirm_with_pst)
# ---------------------------------------------------------------------------
def confirm_injury(player_name, game_date, injuries_df, window_days=2):
    """
    Return a "<desc> (N days)" note if `player_name` has an injury logged in
    [game_date, game_date + window_days], else None. `game_date` is a
    datetime.date.
    """
    if injuries_df.empty:
        return None
    target = _normalize_name(player_name)
    last_name = target.split()[-1] if target else ""
    start, end = game_date.toordinal(), game_date.toordinal() + window_days

    # itertuples preserves per-column dtypes (iterrows would upcast a None
    # date to a float across the mixed-type row).
    for row in injuries_df.itertuples(index=False):
        d = row.date
        if _missing(d) or not (start <= d.toordinal() <= end):
            continue
        cand = row.player_norm
        if target != cand and (not last_name or last_name not in cand.split()):
            continue
        sev = format_severity(row.days_missed, row.returned)
        return f"{row.injury_desc} ({sev})".strip()
    return None
