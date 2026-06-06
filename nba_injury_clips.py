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

import sys
import time
from datetime import datetime, date, timedelta
from io import StringIO

import requests
import pandas as pd
from nba_api.stats.endpoints import (
    playbyplayv2,
    boxscoresummaryv2,
    videoevents,
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

SUBSTITUTION = 8  # EVENTMSGTYPE code for a substitution in playbyplayv2


def get_game_date(game_id):
    """Return (year, month, day) for the game, needed to build clip URLs."""
    summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
    df = summary.game_summary.get_data_frame()
    raw = df.loc[0, "GAME_DATE_EST"]          # e.g. '2023-10-24T00:00:00'
    dt = datetime.fromisoformat(str(raw).replace("Z", ""))
    return dt.year, dt.month, dt.day


def get_play_by_play(game_id):
    """Return the full play-by-play as a sorted DataFrame."""
    try:
        pbp = playbyplayv2.PlayByPlayV2(game_id=game_id).get_data_frame()
    except KeyError as e:
        # nba_api raises a bare KeyError('resultSet') when stats.nba.com
        # returns an empty/blocked body (rate-limited or datacenter IP
        # blocked). Surface something actionable instead.
        raise RuntimeError(
            f"play-by-play for {game_id} came back empty/blocked "
            f"(stats.nba.com may be rate-limiting this IP): {e!r}"
        ) from e
    return pbp.sort_values("EVENTNUM").reset_index(drop=True)


def find_injury_candidates(pbp):
    """
    Find players whose LAST substitution event was a sub-OUT (they never
    came back in). For each, also grab the event right before they exited,
    which is usually the play the injury happened on.
    """
    subs = pbp[pbp["EVENTMSGTYPE"] == SUBSTITUTION]

    # In a sub event: PLAYER1 = player going OUT, PLAYER2 = player coming IN.
    # (Verify this on a known game once -- it's the classic gotcha.)
    events_by_player = {}  # player_id -> list of (eventnum, "out"|"in", row)
    for _, r in subs.iterrows():
        out_id, in_id = r["PLAYER1_ID"], r["PLAYER2_ID"]
        if pd.notna(out_id) and out_id != 0:
            events_by_player.setdefault(int(out_id), []).append(
                (r["EVENTNUM"], "out", r)
            )
        if pd.notna(in_id) and in_id != 0:
            events_by_player.setdefault(int(in_id), []).append(
                (r["EVENTNUM"], "in", r)
            )

    candidates = []
    for evs in events_by_player.values():
        evs.sort(key=lambda x: x[0])
        last_eventnum, last_dir, last_row = evs[-1]
        if last_dir != "out":
            continue  # player came back in -> not a candidate

        # The injury play = the event immediately before the sub-out.
        sub_idx = pbp.index[pbp["EVENTNUM"] == last_eventnum][0]
        injury_row = pbp.loc[max(sub_idx - 1, 0)]
        # NOTE: missing descriptions come back as NaN, and float('nan') is
        # truthy, so a plain `a or b` chain would return the NaN. Pick the
        # first description that is an actual non-empty string instead.
        desc = "(no description)"
        for col in ("HOMEDESCRIPTION", "VISITORDESCRIPTION", "NEUTRALDESCRIPTION"):
            val = injury_row[col]
            if isinstance(val, str) and val.strip():
                desc = val
                break

        candidates.append({
            "player": last_row["PLAYER1_NAME"],
            "exit_eventnum": int(last_eventnum),
            "period": int(last_row["PERIOD"]),
            "clock": last_row["PCTIMESTRING"],
            "injury_play_eventnum": int(injury_row["EVENTNUM"]),
            "injury_play_desc": desc,
        })
    return candidates


def extract_clip_url(game_id, event_id, ymd):
    """Resolve a clip URL for a single play-by-play event."""
    data = videoevents.VideoEvents(
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
    """Stream an mp4 to disk. Used only with --download."""
    import requests
    with requests.get(url, headers=DOWNLOAD_HEADERS, stream=True, timeout=30) as r:
        r.raise_for_status()
        with open(filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    print(f"    saved -> {filename}")


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
        try:
            resp = requests.get(url, headers=DOWNLOAD_HEADERS, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            # PST periodically blocks automated traffic (e.g. 403 from a
            # datacenter IP). Don't crash the whole run -- warn and return
            # whatever we gathered so far. Without PST, candidates simply
            # can't be confirmed (single-game tool still works with
            # --include-unconfirmed; the batch tool will find 0 injuries).
            print(
                f"  WARNING: Pro Sports Transactions request failed ({e}); "
                "continuing without injury cross-check.",
                file=sys.stderr,
            )
            break
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
