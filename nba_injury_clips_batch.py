"""
nba_injury_clips_batch.py
=========================

INJURY-LOG-DRIVEN driver. Instead of scanning every game, it starts from the
Pro Sports Transactions (PST) injury log and only processes the games that
correspond to a logged injury.

For each logged injury it:
  1. finds the game that player's team played in the injury window,
  2. locates the play where the player exited and didn't return,
  3. resolves the clip URL for that play,
  4. estimates time missed by pairing the injury with the player's next
     "activated/returned" entry in PST.

Output spreadsheet columns:
    name | date | injury_desc | severity | play_by_play_url

  - date            = the actual game date the injury occurred
  - injury_desc     = the PST report note
  - severity        = ESTIMATED TIME MISSED, e.g. "14 days",
                      "season-ending", or "unknown (no return logged)"
  - play_by_play_url= clip of the injury play (blank if no in-game exit found)

Requires nba_injury_clips.py in the same folder.

SETUP
-----
    pip install nba_api requests pandas openpyxl

USAGE
-----
    python nba_injury_clips_batch.py --season 2024-25            # default source
    python nba_injury_clips_batch.py --season 2024-25 --source hashtag
    python nba_injury_clips_batch.py --season 2024-25 --source pst
    python nba_injury_clips_batch.py                             # all 3 seasons
    python nba_injury_clips_batch.py --finalize   # merge checkpoint -> .xlsx

--source picks the injury LOG that seeds the run (default: hashtag):
  - hashtag : hashtagbasketball.com/nba-injury (DB since 2010, has return time)
  - pst     : prosportstransactions.com (Cloudflare-blocked from DC IPs)

This is far lighter than scanning all games, but still hits an unofficial API,
so it sleeps between calls and checkpoints every injury. If it stops or you get
blocked, just re-run -- it resumes. Running one season at a time is safest.

NETWORK REQUIREMENTS
--------------------
The driver is seeded ENTIRELY from the injury log, so it produces zero rows if
that host is unreachable. Hosts touched:
  - stats.nba.com (play-by-play, schedule) ...... works from most IPs
  - hashtagbasketball.com (default injury LOG) .. must be on the egress allowlist
  - prosportstransactions.com (--source pst) .... Cloudflare-blocks DC IPs (403)
  - videos.nba.com (clip download bytes) ........ blocks DC IPs (403)
In a locked-down environment, add the chosen injury host (and videos.nba.com if
you want --download) to the network allowlist:
https://code.claude.com/docs/en/claude-code-on-the-web . Clip *URLs* still
resolve anywhere via stats.nba.com; only downloading the mp4 bytes needs the
videos host.
"""

import sys
import csv
import os
import time
from datetime import datetime, timedelta
from collections import defaultdict

import pandas as pd
from nba_api.stats.endpoints import leaguegamelog

from nba_injury_clips import (
    get_play_by_play,
    find_injury_candidates,
    extract_clip_url,
    fetch_pst_injuries,
    fetch_hashtag_injuries,
    parse_hashtag_injuries,
    _normalize_name,
    SLEEP_BETWEEN_CALLS,
    PST_WINDOW_DAYS,
)

SEASONS = ["2023-24", "2024-25", "2025-26"]
SEASON_TYPES = ["Regular Season", "Playoffs"]

RESULTS_CSV = "nba_injuries_2023_2026.csv"
PROGRESS_FILE = "processed_injuries.txt"
OUTPUT_XLSX = "nba_injuries_2023_2026.xlsx"

COLUMNS = ["name", "date", "injury_desc", "severity", "play_by_play_url"]


# ---------------------------------------------------------------------------
# severity = estimated time missed
# Pair the injury (relinquished) with the player's next return (acquired) in
# PST and report the day gap. Falls back to the note ("out for season") or
# "unknown" when no return is logged in the fetched range.
# ---------------------------------------------------------------------------
def estimate_time_missed(injury, returns_by_player):
    notes = injury.get("notes", "")
    if "season" in (notes or "").lower():
        return "season-ending"
    # A source that reports time-missed / a return date on the injury row itself
    # (e.g. hashtagbasketball) wins -- no relinquished<->acquired pairing needed.
    if injury.get("time_missed"):
        return injury["time_missed"]
    injury_date = injury["date"]
    ret = injury.get("return_date")
    if ret:
        return f"{(ret - injury_date).days} days"
    future = [
        d for d in returns_by_player.get(injury["player_norm"], []) if d > injury_date
    ]
    if future:
        return f"{(min(future) - injury_date).days} days"
    return "unknown (no return logged)"


DEFAULT_SOURCE = "hashtag"
SOURCES = ("hashtag", "pst")


def load_injuries(source, start, end):
    """Return (injuries, returns_by_player) for the chosen injury source.

    Both backends satisfy the same contract, so everything downstream
    (scheduling, candidate finding, clip resolution) is source-agnostic.
    """
    if source == "hashtag":
        return parse_hashtag_injuries(fetch_hashtag_injuries(start, end), start, end)
    if source == "pst":
        return parse_pst_events(fetch_pst_injuries(start, end))
    raise ValueError(f"unknown --source {source!r}; choose from {SOURCES}")


def parse_pst_events(pst_df):
    """Split PST rows into injuries (relinquished) and returns (acquired)."""
    injuries = []
    returns_by_player = defaultdict(list)
    for _, row in pst_df.iterrows():
        try:
            d = datetime.strptime(str(row["Date"]).strip(), "%Y-%m-%d").date()
        except (ValueError, TypeError, KeyError):
            continue
        rel = str(row.get("Relinquished", "")).strip()
        acq = str(row.get("Acquired", "")).strip()
        if rel and rel.lower() != "nan":
            injuries.append({
                "player_raw": rel.replace("•", "").replace("•", "").strip(),
                "player_norm": _normalize_name(rel),
                "team_raw": str(row.get("Team", "")).strip(),
                "date": d,
                "notes": str(row.get("Notes", "")).strip(),
            })
        if acq and acq.lower() != "nan":
            returns_by_player[_normalize_name(acq)].append(d)
    for k in returns_by_player:
        returns_by_player[k].sort()
    return injuries, returns_by_player


# ---------------------------------------------------------------------------
# Schedule, so we can map (team, date) -> game_id
# ---------------------------------------------------------------------------
def build_schedule(season):
    team_games = defaultdict(list)  # TEAM_NAME -> [(date, game_id)]
    for stype in SEASON_TYPES:
        log = leaguegamelog.LeagueGameLog(
            season=season, season_type_all_star=stype
        ).league_game_log.get_data_frame()
        for _, r in log.iterrows():
            try:
                d = datetime.strptime(str(r["GAME_DATE"])[:10], "%Y-%m-%d").date()
            except ValueError:
                continue
            team_games[r["TEAM_NAME"]].append((d, r["GAME_ID"]))
        time.sleep(SLEEP_BETWEEN_CALLS)
    for t in team_games:
        team_games[t].sort()
    return team_games


def match_team(pst_team, team_games):
    """PST uses nicknames ('Lakers'); match into full TEAM_NAME."""
    pst = pst_team.lower().strip()
    if not pst:
        return None
    for name in team_games:
        if pst in name.lower():
            return name
    return None


def find_injury_game(injury, team_games):
    """The team's game on/just before the log date -> (date, game_id)."""
    name = match_team(injury["team_raw"], team_games)
    if not name:
        return None
    lo = injury["date"] - timedelta(days=PST_WINDOW_DAYS)
    hi = injury["date"]
    games = [(d, g) for (d, g) in team_games[name] if lo <= d <= hi]
    if not games:
        return None
    games.sort()
    return games[-1]  # closest game on/before the log date


def names_match(a_norm, b_norm):
    if a_norm == b_norm:
        return True
    aa, bb = a_norm.split(), b_norm.split()
    return bool(aa and bb and aa[-1] == bb[-1] and aa[0][:1] == bb[0][:1])


# ---------------------------------------------------------------------------
# Process one logged injury
# ---------------------------------------------------------------------------
def process_injury(injury, team_games, returns_by_player, pbp_cache):
    severity = estimate_time_missed(injury, returns_by_player)
    url = ""
    used_date = injury["date"]

    match = find_injury_game(injury, team_games)
    if match:
        gdate, gid = match
        used_date = gdate
        if gid not in pbp_cache:
            pbp_cache[gid] = get_play_by_play(gid)
            time.sleep(SLEEP_BETWEEN_CALLS)
        for c in find_injury_candidates(pbp_cache[gid]):
            if names_match(_normalize_name(c["player"]), injury["player_norm"]):
                if not c["video_available"]:
                    break  # no real clip for that play (sub/timeout/etc.)
                ymd = (gdate.year, gdate.month, gdate.day)
                time.sleep(SLEEP_BETWEEN_CALLS)
                url = extract_clip_url(gid, c["injury_play_eventnum"], ymd) or ""
                break

    return {
        "name": injury["player_raw"],
        "date": used_date.isoformat(),
        "injury_desc": injury["notes"],
        "severity": severity,
        "play_by_play_url": url,
    }


# ---------------------------------------------------------------------------
# Checkpointing
# ---------------------------------------------------------------------------
def load_processed():
    if not os.path.exists(PROGRESS_FILE):
        return set()
    with open(PROGRESS_FILE) as f:
        return {line.strip() for line in f if line.strip()}


def mark_processed(key):
    with open(PROGRESS_FILE, "a") as f:
        f.write(key + "\n")


def append_rows(rows):
    new = not os.path.exists(RESULTS_CSV)
    with open(RESULTS_CSV, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        if new:
            w.writeheader()
        w.writerows(rows)


# ---------------------------------------------------------------------------
# Final spreadsheet
# ---------------------------------------------------------------------------
def finalize():
    if not os.path.exists(RESULTS_CSV):
        print(f"No checkpoint {RESULTS_CSV} -- nothing to finalize.")
        return
    df = pd.read_csv(RESULTS_CSV, dtype=str).fillna("")
    df = df.drop_duplicates().sort_values(["date", "name"]).reset_index(drop=True)
    write_xlsx(df, OUTPUT_XLSX)
    print(f"Wrote {len(df)} rows -> {OUTPUT_XLSX}")


def write_xlsx(df, path):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment

    wb = Workbook()
    ws = wb.active
    ws.title = "Injuries"

    headers = list(df.columns)
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(name="Arial", bold=True)
        cell.alignment = Alignment(horizontal="left")

    for _, r in df.iterrows():
        ws.append([r[c] for c in headers])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name="Arial")

    widths = {"name": 22, "date": 12, "injury_desc": 55,
              "severity": 22, "play_by_play_url": 70}
    for i, col in enumerate(headers, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = \
            widths.get(col, 18)

    ws.freeze_panes = "A2"
    wb.save(path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    args = sys.argv[1:]

    if "--finalize" in args:
        finalize()
        return

    source = args[args.index("--source") + 1] if "--source" in args else DEFAULT_SOURCE
    if source not in SOURCES:
        print(f"unknown --source {source!r}; choose from {SOURCES}")
        sys.exit(1)

    seasons = [args[args.index("--season") + 1]] if "--season" in args else SEASONS
    processed = load_processed()

    for season in seasons:
        print(f"\n=== Season {season} ===")
        team_games = build_schedule(season)
        all_dates = [d for games in team_games.values() for (d, _) in games]
        start = min(all_dates).isoformat()
        end = (max(all_dates) + timedelta(days=PST_WINDOW_DAYS)).isoformat()

        print(f"Fetching {source} injuries {start} -> {end} ...")
        injuries, returns_by_player = load_injuries(source, start, end)
        print(f"{len(injuries)} logged injuries to map.")

        pbp_cache = {}
        for i, inj in enumerate(injuries, 1):
            key = f"{inj['player_norm']}|{inj['date']}"
            if key in processed:
                continue
            try:
                row = process_injury(inj, team_games, returns_by_player, pbp_cache)
                append_rows([row])
                mark_processed(key)
                processed.add(key)
                tag = "clip" if row["play_by_play_url"] else "no clip"
                print(f"  [{i}/{len(injuries)}] {row['name']} {row['date']} "
                      f"| {row['severity']} | {tag}")
            except Exception as e:  # noqa: BLE001 - keep the run alive
                print(f"  [{i}/{len(injuries)}] {inj['player_raw']} FAILED: {e}")
            time.sleep(SLEEP_BETWEEN_CALLS)

    finalize()


if __name__ == "__main__":
    main()
