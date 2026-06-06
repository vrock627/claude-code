"""
Offline unit tests for the NBA injury-clip pipeline.

These exercise the *pure* logic (candidate detection, name matching, PST
parsing, time-missed estimation, schedule mapping, clip-URL building, xlsx
output) with synthetic data, so they run anywhere -- no network, no
stats.nba.com / Pro Sports Transactions access required.

    pip install -r requirements.txt pytest
    pytest test_nba_injury_clips.py -v
"""

import datetime as dt

import numpy as np
import pandas as pd

import nba_injury_clips as nic
import nba_injury_clips_batch as batch


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
PBP_COLS = [
    "EVENTNUM", "EVENTMSGTYPE", "PLAYER1_ID", "PLAYER1_NAME", "PLAYER2_ID",
    "PERIOD", "PCTIMESTRING", "HOMEDESCRIPTION", "VISITORDESCRIPTION",
    "NEUTRALDESCRIPTION",
]


def _pbp(rows):
    """Build a play-by-play frame mimicking get_play_by_play()'s output."""
    df = pd.DataFrame(rows, columns=PBP_COLS)
    return df.sort_values("EVENTNUM").reset_index(drop=True)


# ---------------------------------------------------------------------------
# find_injury_candidates
# ---------------------------------------------------------------------------
def test_find_injury_candidates_basic():
    # Alpha: out@2 then back in@4   -> NOT a candidate (returned)
    # Bravo: in@2 then out@4        -> candidate, injury play = evt3
    # Charlie: out@6, never returns -> candidate, injury play = evt5
    # Delta: in@6                   -> NOT a candidate (came in, never out)
    SUB = nic.SUBSTITUTION
    pbp = _pbp([
        (1, 1, 0, "", 0, 1, "11:00", "Smith 2PT", None, None),
        (2, SUB, 10, "Alpha", 20, 1, "10:30", None, None, None),
        (3, 1, 0, "", 0, 1, "09:00", None, "Bravo layup", None),
        (4, SUB, 20, "Bravo", 10, 2, "05:00", None, None, None),
        (5, 1, 0, "", 0, 2, "04:00", "Charlie dunk", None, None),
        (6, SUB, 30, "Charlie", 40, 3, "02:00", None, None, None),
    ])
    cands = {c["player"]: c for c in nic.find_injury_candidates(pbp)}

    assert set(cands) == {"Bravo", "Charlie"}

    bravo = cands["Bravo"]
    assert bravo["period"] == 2
    assert bravo["clock"] == "05:00"
    assert bravo["injury_play_eventnum"] == 3
    assert bravo["injury_play_desc"] == "Bravo layup"

    charlie = cands["Charlie"]
    assert charlie["period"] == 3
    assert charlie["injury_play_eventnum"] == 5
    assert charlie["injury_play_desc"] == "Charlie dunk"


def test_find_injury_candidates_nan_description():
    # The play before the sub-out has all-NaN descriptions. float('nan') is
    # truthy, so a naive `a or b or c` chain would wrongly return NaN; we must
    # get the "(no description)" fallback instead.
    SUB = nic.SUBSTITUTION
    pbp = _pbp([
        (1, 1, 0, "", 0, 1, "11:00", np.nan, np.nan, np.nan),
        (2, SUB, 50, "Echo", 60, 1, "10:00", np.nan, np.nan, np.nan),
    ])
    cands = nic.find_injury_candidates(pbp)
    assert len(cands) == 1
    assert cands[0]["player"] == "Echo"
    assert cands[0]["injury_play_desc"] == "(no description)"


def test_find_injury_candidates_none_when_all_return():
    SUB = nic.SUBSTITUTION
    pbp = _pbp([
        (1, SUB, 10, "Alpha", 20, 1, "10:00", None, None, None),
        (2, SUB, 20, "Bravo", 10, 1, "08:00", None, None, None),
    ])
    # Alpha out@1 then in@2; Bravo in@1 then out@2 -> Bravo is the candidate.
    cands = nic.find_injury_candidates(pbp)
    assert [c["player"] for c in cands] == ["Bravo"]


# ---------------------------------------------------------------------------
# _normalize_name
# ---------------------------------------------------------------------------
def test_normalize_name():
    assert nic._normalize_name("• Jaren Jackson Jr.") == "jaren jackson"
    assert nic._normalize_name("D'Angelo Russell") == "d angelo russell"
    assert nic._normalize_name("Gary Payton II") == "gary payton"
    assert nic._normalize_name(None) == ""
    assert nic._normalize_name(123) == ""


# ---------------------------------------------------------------------------
# confirm_with_pst
# ---------------------------------------------------------------------------
def _pst(rows):
    return pd.DataFrame(rows, columns=["Date", "Team", "Acquired",
                                       "Relinquished", "Notes"])


def test_confirm_with_pst_matches_in_window():
    pst = _pst([
        ("2023-10-25", "Lakers", "", "• LeBron James", "sore foot (DTD)"),
    ])
    note = nic.confirm_with_pst("LeBron James", dt.date(2023, 10, 24), pst)
    assert note == "sore foot (DTD)"


def test_confirm_with_pst_lastname_fallback():
    pst = _pst([
        ("2023-10-24", "Suns", "", "• Bradley Beal", "back spasms"),
    ])
    # First name differs/abbreviated but last name token matches.
    note = nic.confirm_with_pst("B. Beal", dt.date(2023, 10, 24), pst)
    assert note == "back spasms"


def test_confirm_with_pst_out_of_window_returns_none():
    pst = _pst([
        ("2023-11-10", "Lakers", "", "• LeBron James", "sore foot"),
    ])
    assert nic.confirm_with_pst("LeBron James", dt.date(2023, 10, 24), pst) is None


def test_confirm_with_pst_empty():
    empty = pd.DataFrame(columns=["Date", "Relinquished", "Notes"])
    assert nic.confirm_with_pst("Anyone", dt.date(2023, 10, 24), empty) is None


# ---------------------------------------------------------------------------
# batch: estimate_time_missed
# ---------------------------------------------------------------------------
def test_estimate_time_missed_season_ending():
    out = batch.estimate_time_missed("x", dt.date(2024, 1, 1), {}, "out for season (ACL)")
    assert out == "season-ending"


def test_estimate_time_missed_day_gap():
    returns = {"john doe": [dt.date(2024, 1, 1), dt.date(2024, 1, 15)]}
    out = batch.estimate_time_missed("john doe", dt.date(2024, 1, 1), returns, "ankle")
    assert out == "14 days"


def test_estimate_time_missed_unknown():
    out = batch.estimate_time_missed("john doe", dt.date(2024, 1, 1), {}, "ankle")
    assert out == "unknown (no return logged)"


# ---------------------------------------------------------------------------
# batch: parse_pst_events
# ---------------------------------------------------------------------------
def test_parse_pst_events_splits_and_sorts():
    pst = _pst([
        ("2024-01-01", "Heat", "", "• Jimmy Butler", "knee (DTD)"),
        ("2024-01-20", "Heat", "• Jimmy Butler", "", "returned"),
        ("2024-01-10", "Heat", "• Jimmy Butler", "", "returned (G-League)"),
    ])
    injuries, returns = batch.parse_pst_events(pst)
    assert len(injuries) == 1
    assert injuries[0]["player_raw"] == "Jimmy Butler"
    assert injuries[0]["player_norm"] == "jimmy butler"
    assert injuries[0]["date"] == dt.date(2024, 1, 1)
    # returns sorted ascending
    assert returns["jimmy butler"] == [dt.date(2024, 1, 10), dt.date(2024, 1, 20)]


# ---------------------------------------------------------------------------
# batch: schedule mapping
# ---------------------------------------------------------------------------
def test_match_team():
    team_games = {"Los Angeles Lakers": [], "Boston Celtics": []}
    assert batch.match_team("Lakers", team_games) == "Los Angeles Lakers"
    assert batch.match_team("Celtics", team_games) == "Boston Celtics"
    assert batch.match_team("Nobody", team_games) is None
    assert batch.match_team("", team_games) is None


def test_find_injury_game_picks_closest_on_or_before():
    team_games = {
        "Los Angeles Lakers": [
            (dt.date(2024, 1, 1), "G1"),
            (dt.date(2024, 1, 3), "G2"),   # closest on/before log date
            (dt.date(2024, 1, 6), "G3"),   # after the log date -> excluded
        ]
    }
    injury = {"team_raw": "Lakers", "date": dt.date(2024, 1, 4)}
    assert batch.find_injury_game(injury, team_games) == (dt.date(2024, 1, 3), "G2")


def test_find_injury_game_no_game_in_window():
    team_games = {"Los Angeles Lakers": [(dt.date(2024, 1, 1), "G1")]}
    injury = {"team_raw": "Lakers", "date": dt.date(2024, 1, 10)}
    assert batch.find_injury_game(injury, team_games) is None


def test_names_match():
    assert batch.names_match("lebron james", "lebron james")
    assert batch.names_match("l james", "lebron james")    # initial + last name
    assert not batch.names_match("kevin durant", "kevin love")
    assert not batch.names_match("", "lebron james")


# ---------------------------------------------------------------------------
# extract_clip_url (videoevents monkeypatched -- no network)
# ---------------------------------------------------------------------------
class _FakeVideoEvents:
    payload = {}

    def __init__(self, *a, **k):
        pass

    def get_dict(self):
        return type(self).payload


def _set_video_payload(monkeypatch, entry):
    _FakeVideoEvents.payload = {"resultSets": {"Meta": {"videoUrls": [entry]}}}
    monkeypatch.setattr(nic.videoevents, "VideoEvents", _FakeVideoEvents)


def test_extract_clip_url_direct_url(monkeypatch):
    _set_video_payload(monkeypatch, {"lurl": "https://videos.nba.com/x/large.mp4"})
    url = nic.extract_clip_url("0022300001", 42, (2023, 10, 25))
    assert url == "https://videos.nba.com/x/large.mp4"


def test_extract_clip_url_builds_from_uuid(monkeypatch):
    _set_video_payload(monkeypatch, {"uuid": "abc123"})
    url = nic.extract_clip_url("0022300001", 42, (2023, 10, 5))
    assert url == (
        "https://videos.nba.com/nba/pbp/media/2023/10/05/"
        "0022300001/42/abc123_1280x720.mp4"
    )


def test_extract_clip_url_none_when_missing(monkeypatch):
    _set_video_payload(monkeypatch, {})           # no url, no uuid
    assert nic.extract_clip_url("0022300001", 42, (2023, 10, 5)) is None


# ---------------------------------------------------------------------------
# write_xlsx round-trip
# ---------------------------------------------------------------------------
def test_write_xlsx_roundtrip(tmp_path):
    from openpyxl import load_workbook

    df = pd.DataFrame(
        [["LeBron James", "2023-10-25", "sore foot", "14 days", "http://clip"]],
        columns=batch.COLUMNS,
    )
    out = tmp_path / "out.xlsx"
    batch.write_xlsx(df, str(out))

    wb = load_workbook(out)
    ws = wb["Injuries"]
    assert [c.value for c in ws[1]] == batch.COLUMNS
    assert [c.value for c in ws[2]] == [
        "LeBron James", "2023-10-25", "sore foot", "14 days", "http://clip"
    ]
    assert ws.freeze_panes == "A2"
