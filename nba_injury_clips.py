"""
nba_injury_clips.py
===================

Starter / proof-of-concept pipeline.

Given a single NBA game_id, this script:
  1. Pulls the play-by-play for the game.
  2. Finds players who were substituted OUT and never returned
     ("did not return" = an injury *candidate*).
  3. Resolves a downloadable video-clip URL for the play immediately
     before each exit.

WHY THIS IS ONLY A STARTER
--------------------------
NBA play-by-play data does NOT tag injuries. The "subbed out and never
returned" signal is a heuristic, so it WILL also catch:
  - players rested in a blowout / late-game benchings
  - foul-outs and ejections
  - normal end-of-game substitutions
Treat the output as candidates to eyeball, not ground truth. The script
prints period + game clock for each so you can judge quickly, and you can
cross-reference against an injury news source (Pro Sports Transactions,
Rotowire) to confirm.

The video endpoint is undocumented and the NBA changes it periodically.
If clip resolution stops working, the field names in
`extract_clip_url()` are the first thing to check.

API NOTE (2026 migration)
-------------------------
The NBA retired the v2 stats feeds this pipeline was first written against:
`playbyplayv2` now returns empty JSON, and `videoevents` was replaced by
`videoeventsasset`. This module targets the current endpoints:
  - play-by-play   -> playbyplayv3
  - clip resolution -> videoeventsasset
The v3 play-by-play schema is different (actionType / subType / actionNumber /
personId instead of EVENTMSGTYPE / EVENTNUM / PLAYER1_ID), and a substitution
row only carries the OUTGOING player as a real id -- the incoming player is
text-only in the description ("SUB: <in> FOR <out>"). See find_injury_candidates.

SETUP
-----
    pip install nba_api requests pandas

USAGE
-----
    python nba_injury_clips.py 0022300001
    python nba_injury_clips.py 0022300001 --download
    python nba_injury_clips.py 0022300001 --include-unconfirmed

Candidates are cross-checked against Pro Sports Transactions. By default
only PST-confirmed injuries get a clip resolved/downloaded; pass
--include-unconfirmed to fetch clips for every candidate.

Tip: regular-season game_ids look like 00223000XX where 223 = 2023-24
season. You can get game_ids for a date from nba_api's `scoreboardv2`.
"""

import re
import sys
import time
from datetime import datetime, date, timedelta
from io import StringIO

import requests
import pandas as pd
from nba_api.stats.endpoints import (
    playbyplayv3,
    boxscoresummaryv2,
    videoeventsasset,
)

# stats.nba.com data calls are handled by nba_api's own headers, but the
# raw videos.nba.com mp4 download below needs browser-like headers.
DOWNLOAD_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Referer": "https://www.nba.com/",
}

# Be polite to the (unofficial) API. Raise if you start getting blocked.
SLEEP_BETWEEN_CALLS = 0.8

# v3 marks substitutions by actionType, not a numeric EVENTMSGTYPE code.
SUBSTITUTION = "Substitution"

# "SUB: <incoming> FOR <outgoing>" -- the incoming player is text-only in v3.
_SUB_RE = re.compile(r"SUB:\s*(.+?)\s+FOR\s+", re.IGNORECASE)


def get_game_date(game_id):
    """Return (year, month, day) for the game, needed to build clip URLs."""
    summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
    df = summary.game_summary.get_data_frame()
    raw = df.loc[0, "GAME_DATE_EST"]          # e.g. '2023-10-24T00:00:00'
    dt = datetime.fromisoformat(str(raw).replace("Z", ""))
    return dt.year, dt.month, dt.day


def _clock_to_str(iso_clock):
    """v3 clock is an ISO-8601 duration like 'PT06M43.00S' -> '6:43'."""
    m = re.match(r"PT(\d+)M([\d.]+)S", str(iso_clock))
    if not m:
        return str(iso_clock)
    return f"{int(m.group(1))}:{int(float(m.group(2))):02d}"


def get_play_by_play(game_id):
    """Return the full v3 play-by-play as a DataFrame sorted by action order."""
    pbp = playbyplayv3.PlayByPlayV3(game_id=game_id).play_by_play.get_data_frame()
    return pbp.sort_values("actionNumber").reset_index(drop=True)


def find_injury_candidates(pbp):
    """
    Find players whose LAST substitution event was a sub-OUT (they never
    came back in). For each, also grab the event right before they exited,
    which is usually the play the injury happened on.

    v3 gotcha: a Substitution row's personId / playerName is the OUTGOING
    player. The incoming player is only in the description ("SUB: <in> FOR
    <out>") as a last name, so we match returns by last name. When two active
    players share a last name this can mis-credit a return -- a known limit of
    the v3 feed that the old v2 PLAYER2_ID approach didn't have. PST cross-check
    downstream still gates the output, so treat this as a candidate filter only.
    """
    subs = pbp[pbp["actionType"] == SUBSTITUTION]

    # Map last name -> personId so we can resolve the text-only incoming player.
    lastname_to_pid = {}
    for _, r in subs.iterrows():
        lastname_to_pid[str(r["playerName"]).strip()] = int(r["personId"])

    events_by_player = {}  # player_id -> list of (actionNumber, "out"|"in", row)
    for _, r in subs.iterrows():
        out_id = int(r["personId"])
        events_by_player.setdefault(out_id, []).append(
            (int(r["actionNumber"]), "out", r)
        )
        m = _SUB_RE.match(str(r["description"]))
        if m:
            in_pid = lastname_to_pid.get(m.group(1).strip())
            if in_pid is not None:
                events_by_player.setdefault(in_pid, []).append(
                    (int(r["actionNumber"]), "in", r)
                )

    candidates = []
    for evs in events_by_player.values():
        evs.sort(key=lambda x: x[0])
        last_action, last_dir, last_row = evs[-1]
        if last_dir != "out":
            continue  # player came back in -> not a candidate

        # The injury play = the event immediately before the sub-out.
        sub_idx = pbp.index[pbp["actionNumber"] == last_action][0]
        injury_row = pbp.loc[max(sub_idx - 1, 0)]
        desc = str(injury_row["description"]).strip() or "(no description)"

        candidates.append({
            "player": last_row["playerNameI"] or last_row["playerName"],
            "exit_eventnum": int(last_action),
            "period": int(last_row["period"]),
            "clock": _clock_to_str(last_row["clock"]),
            "injury_play_eventnum": int(injury_row["actionNumber"]),
            "injury_play_desc": desc,
            # v3 flags whether a clip exists; without this the video endpoint
            # hands back a shared placeholder mp4 for sub/timeout/etc. events.
            "video_available": bool(injury_row.get("videoAvailable", 0)),
        })
    return candidates


def extract_clip_url(game_id, event_id, ymd):
    """Resolve a clip URL for a single play-by-play event."""
    data = videoeventsasset.VideoEventsAsset(
        game_id=game_id, game_event_id=event_id
    ).get_dict()

    try:
        entry = data["resultSets"]["Meta"]["videoUrls"][0]
    except (KeyError, IndexError, TypeError):
        return None

    # Newer responses sometimes carry the URL directly (large/med/small).
    for key in ("lurl", "murl", "surl"):
        val = entry.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val

    # Otherwise build it from the UUID + game date.
    uuid = entry.get("uuid")
    if not uuid:
        return None
    y, m, d = ymd
    return (
        f"https://videos.nba.com/nba/pbp/media/{y}/{m:02d}/{d:02d}/"
        f"{game_id}/{event_id}/{uuid}_1280x720.mp4"
    )


def download_clip(url, filename):
    """Stream an mp4 to disk. Used only with --download.

    videos.nba.com also blocks datacenter / CI IPs (403). We resolve clip URLs
    fine from anywhere, but fetching the bytes may need a residential IP -- so
    a failed download warns instead of killing the run.
    """
    try:
        with requests.get(
            url, headers=DOWNLOAD_HEADERS, stream=True, timeout=30
        ) as r:
            r.raise_for_status()
            with open(filename, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        print(f"    saved -> {filename}")
    except requests.RequestException as e:
        print(f"    download failed ({e}); URL above is still valid "
              "-- try from an unblocked network", file=sys.stderr)


# ---------------------------------------------------------------------------
# Pro Sports Transactions (PST) cross-check
# ---------------------------------------------------------------------------
# PST logs injuries by DATE. A player hurt in a game is usually entered on the
# game date or within a day or two, when the team files the IL move / report.
# We match each candidate against PST's "Relinquished" column (the player going
# OUT) within a small date window. This drops most false positives (blowout
# rest, foul-outs, ejections).
#
# Caveat: it can also drop a REAL injury that PST never logged (e.g. a tweak
# that didn't lead to an IL move), so "unconfirmed" is not proof there was no
# injury -- just that PST has no matching entry. PST's HTML can change; if
# parsing breaks, inspect a results page by hand and adjust the column logic.

PST_BASE = "https://www.prosportstransactions.com/basketball/Search/SearchResults.php"
PST_WINDOW_DAYS = 2  # allow the injury to be logged up to N days after the game


def _normalize_name(name):
    """Lowercase and strip bullets/punctuation/suffixes for loose matching."""
    if not isinstance(name, str):
        return ""
    name = name.lower().replace("•", " ").replace("•", " ")
    for junk in [".", ",", "'", " jr", " sr", " iii", " ii", " iv"]:
        name = name.replace(junk, " ")
    return " ".join(name.split())


def fetch_pst_injuries(start_date, end_date):
    """
    Return a DataFrame of PST injury rows (player going OUT) between two
    'YYYY-MM-DD' dates. Fetch this ONCE for a whole date range when scaling,
    then reuse it for every game in that range.
    """
    all_rows = []
    start = 0
    while True:
        url = (
            f"{PST_BASE}?BeginDate={start_date}&EndDate={end_date}"
            "&ILChkBx=yes&InjuriesChkBx=yes&Submit=Search"
            f"&start={start}"
        )
        resp = requests.get(url, headers=DOWNLOAD_HEADERS, timeout=30)
        # PST sits behind Cloudflare. From datacenter / CI IPs it often answers
        # 403 with a JS challenge ("Just a moment...") instead of results. Don't
        # crash the whole run for that -- warn once and return what we have so
        # the caller can fall back to treating everything as unconfirmed.
        if resp.status_code == 403 or "Just a moment" in resp.text[:600]:
            print(
                "    WARNING: Pro Sports Transactions is blocking this network "
                "(Cloudflare 403). Skipping cross-check; run from an "
                "unblocked IP to confirm injuries.",
                file=sys.stderr,
            )
            break
        resp.raise_for_status()
        tables = pd.read_html(StringIO(resp.text))
        if not tables:
            break
        # The results live in the widest table on the page.
        df = max(tables, key=lambda t: t.shape[1])
        # The first row holds the real column names ("Date", "Relinquished"...).
        df.columns = [str(c).strip() for c in df.iloc[0]]
        df = df.iloc[1:].reset_index(drop=True)
        if df.empty:
            break
        all_rows.append(df)
        if len(df) < 25:          # PST paginates 25 rows at a time
            break
        start += 25
        time.sleep(SLEEP_BETWEEN_CALLS)

    if not all_rows:
        return pd.DataFrame(
            columns=["Date", "Team", "Acquired", "Relinquished", "Notes"]
        )
    return pd.concat(all_rows, ignore_index=True)


# ---------------------------------------------------------------------------
# Hashtag Basketball injury database (alternative to PST)
# ---------------------------------------------------------------------------
# hashtagbasketball.com/nba-injury is an injury database going back to 2010 that,
# unlike PST, usually carries the RETURN date / time-missed on the same row as
# the injury -- so severity can come straight from the source instead of pairing
# separate "relinquished" and "acquired" entries.
#
# ALLOWLIST: this host must be added to the environment's egress allowlist or
# every request comes back "Host not in allowlist" (HTTP 403, 21-byte body).
# See https://code.claude.com/docs/en/claude-code-on-the-web (network policy).
#
# SHAPE: the page is ASP.NET (.aspx). The exact response shape -- a static HTML
# <table>, a JSON/XHR feed, or a viewstate-driven postback with season/date
# filtering and pagination -- must be confirmed against the LIVE page the first
# time this runs from an allowlisted network. fetch_hashtag_injuries() is the
# only function whose body depends on that; parse_hashtag_injuries() is written
# to be column-name-agnostic so it survives whatever headers come back.

HASHTAG_URL = "https://hashtagbasketball.com/nba-injury"


def _blocked_response(resp):
    """True if the proxy allowlist or Cloudflare swallowed the request."""
    head = resp.text[:600]
    return (
        resp.status_code == 403
        or "Host not in allowlist" in head
        or "Just a moment" in head
    )


def fetch_hashtag_injuries(start_date, end_date):
    """
    Return a raw DataFrame of hashtagbasketball injuries overlapping
    ['YYYY-MM-DD' start, end]. Filtering to the window is left to
    parse_hashtag_injuries so the fetch stays a thin transport layer.

    NOTE: validate the extraction below against the live page once the host is
    allowlisted (see SHAPE comment above). The default path assumes the injuries
    render as an HTML table; if the page instead exposes a JSON/XHR feed or needs
    a season/date postback, swap the body for that here -- callers and the parser
    don't change.
    """
    empty = pd.DataFrame()
    resp = requests.get(HASHTAG_URL, headers=DOWNLOAD_HEADERS, timeout=30)
    if _blocked_response(resp):
        print(
            "    WARNING: hashtagbasketball.com is unreachable from this network "
            "(403). Add 'hashtagbasketball.com' to the environment's egress "
            "allowlist, then re-run.",
            file=sys.stderr,
        )
        return empty
    resp.raise_for_status()

    try:
        tables = pd.read_html(StringIO(resp.text))
    except ValueError:  # pandas raises when no table is found in the HTML
        tables = []
    if not tables:
        print(
            "    WARNING: no injury table found at hashtagbasketball.com/nba-injury "
            "-- the page shape likely changed; inspect it and update "
            "fetch_hashtag_injuries().",
            file=sys.stderr,
        )
        return empty

    # The injury log is the widest table on the page (same idiom as PST).
    df = max(tables, key=lambda t: t.shape[1])
    df.columns = [str(c).strip() for c in df.columns]
    return df


# Loose header -> canonical field mapping. Matched by substring (lowercased) so
# the parser tolerates the site's exact wording ("Player", "Name", "Injury",
# "Status", "Returned", "Days Missed", etc.).
_HASHTAG_FIELDS = {
    "player": ["player", "name"],
    "team": ["team"],
    "date": ["injury date", "date out", "date"],
    "notes": ["injury", "note", "status", "type", "description"],
    "return_date": ["return date", "returned", "date returned", "back"],
    "time_missed": ["days missed", "games missed", "time missed", "duration"],
}


def _pick_column(columns, keywords, used=()):
    """First not-yet-used column whose header contains any keyword, else None."""
    low = {c: str(c).lower() for c in columns}
    for kw in keywords:
        for c in columns:
            if c not in used and kw in low[c]:
                return c
    return None


def _parse_date(value):
    """Best-effort date parse across the formats these sources use."""
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%b %d, %Y", "%B %d, %Y", "%m/%d/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    try:  # last resort: let pandas guess
        ts = pd.to_datetime(s, errors="coerce")
        return None if pd.isna(ts) else ts.date()
    except (ValueError, TypeError):
        return None


def parse_hashtag_injuries(df, start_date=None, end_date=None):
    """
    Map a hashtagbasketball injury DataFrame onto the pipeline's injury contract:
    return (injuries, returns_by_player) exactly like parse_pst_events(), so the
    batch driver is source-agnostic.

    Each injury dict carries player_raw/player_norm/team_raw/date/notes, plus an
    optional return_date and time_missed when the source provides them (lets
    estimate_time_missed report severity straight from the row).
    """
    from collections import defaultdict

    injuries = []
    returns_by_player = defaultdict(list)
    if df is None or df.empty:
        return injuries, returns_by_player

    # Resolve the more specific fields first and never reuse a column, so e.g.
    # "Injury Date" is claimed as the date -- not mistaken for the "Injury" note.
    cols = list(df.columns)
    col, used = {}, set()
    for field in ("date", "return_date", "time_missed", "player", "team", "notes"):
        chosen = _pick_column(cols, _HASHTAG_FIELDS[field], used)
        col[field] = chosen
        if chosen is not None:
            used.add(chosen)
    lo = _parse_date(start_date) if start_date else None
    hi = _parse_date(end_date) if end_date else None

    for _, row in df.iterrows():
        player_raw = str(row[col["player"]]).strip() if col["player"] else ""
        if not player_raw or player_raw.lower() == "nan":
            continue
        d = _parse_date(row[col["date"]]) if col["date"] else None
        if d is None:
            continue
        if (lo and d < lo) or (hi and d > hi):
            continue

        ret = _parse_date(row[col["return_date"]]) if col["return_date"] else None
        time_missed = ""
        if col["time_missed"]:
            tm = str(row[col["time_missed"]]).strip()
            if tm and tm.lower() != "nan":
                time_missed = tm
        player_norm = _normalize_name(player_raw)

        injuries.append({
            "player_raw": player_raw,
            "player_norm": player_norm,
            "team_raw": str(row[col["team"]]).strip() if col["team"] else "",
            "date": d,
            "notes": str(row[col["notes"]]).strip() if col["notes"] else "",
            "return_date": ret,
            "time_missed": time_missed,
        })
        if ret:
            returns_by_player[player_norm].append(ret)

    for k in returns_by_player:
        returns_by_player[k].sort()
    return injuries, returns_by_player


def confirm_with_pst(player_name, game_date, pst_df, window_days=PST_WINDOW_DAYS):
    """
    Return the matching PST injury note if `player_name` has a Relinquished
    entry within [game_date, game_date + window_days], else None.
    `game_date` is a datetime.date.
    """
    if pst_df.empty:
        return None
    target = _normalize_name(player_name)
    last_name = target.split()[-1] if target else ""

    for _, row in pst_df.iterrows():
        rel = _normalize_name(row.get("Relinquished", ""))
        if not rel:
            continue
        # match the full name, or fall back to the last name as a token
        if target not in rel and last_name not in rel.split():
            continue
        try:
            row_date = datetime.strptime(str(row["Date"]).strip(), "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        if game_date <= row_date <= game_date + timedelta(days=window_days):
            return str(row.get("Notes", "")).strip() or "(injury logged)"
    return None


def main():
    if len(sys.argv) < 2:
        print("usage: python nba_injury_clips.py <game_id> "
              "[--download] [--include-unconfirmed]")
        sys.exit(1)

    game_id = sys.argv[1]
    do_download = "--download" in sys.argv
    include_unconfirmed = "--include-unconfirmed" in sys.argv

    print(f"Game {game_id}: fetching date + play-by-play...")
    ymd = get_game_date(game_id)
    game_date = date(*ymd)
    pbp = get_play_by_play(game_id)

    candidates = find_injury_candidates(pbp)
    print(f"Found {len(candidates)} 'did not return' candidate(s).")

    # Cross-check against PST for the game date + a short window.
    print("Cross-checking against Pro Sports Transactions...")
    pst = fetch_pst_injuries(
        game_date.isoformat(),
        (game_date + timedelta(days=PST_WINDOW_DAYS)).isoformat(),
    )

    confirmed = 0
    for c in candidates:
        note = confirm_with_pst(c["player"], game_date, pst)
        c["confirmed"] = note is not None
        c["pst_note"] = note
        confirmed += int(c["confirmed"])

    print(f"{confirmed} confirmed by PST, "
          f"{len(candidates) - confirmed} unconfirmed.\n")

    for c in candidates:
        tag = "CONFIRMED" if c["confirmed"] else "unconfirmed"
        print(
            f"- [{tag}] {c['player']}: left in Q{c['period']} @ {c['clock']}\n"
            f"    play: {c['injury_play_desc']}"
        )
        if c["confirmed"]:
            print(f"    PST: {c['pst_note']}")

        # By default only resolve/download clips for PST-confirmed injuries.
        if not c["confirmed"] and not include_unconfirmed:
            print("    (skipped -- pass --include-unconfirmed to fetch anyway)\n")
            continue

        if not c["video_available"]:
            print("    no clip available for that play (e.g. sub/timeout)\n")
            continue

        time.sleep(SLEEP_BETWEEN_CALLS)
        url = extract_clip_url(game_id, c["injury_play_eventnum"], ymd)
        if not url:
            print("    no clip found for that event\n")
            continue
        print(f"    clip: {url}\n")

        if do_download:
            safe = c["player"].replace(" ", "_").replace(".", "")
            download_clip(url, f"{game_id}_{safe}_{c['injury_play_eventnum']}.mp4")


if __name__ == "__main__":
    main()
