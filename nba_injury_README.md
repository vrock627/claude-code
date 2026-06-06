# NBA In-Game Injury Clip Pipeline

Tools to find NBA injuries that happened **during a game** and resolve a
video clip of the play they happened on, then roll them up into a
spreadsheet.

| File | What it does |
| --- | --- |
| `nba_injury_clips.py` | Single-game proof-of-concept. Given one `game_id`, finds "subbed out and never returned" candidates, cross-checks them against Pro Sports Transactions (PST), and resolves a clip URL per confirmed injury. |
| `nba_injury_clips_batch.py` | Injury-log-driven batch driver. Starts from the PST injury log for a season, maps each logged injury to the game it happened in, locates the exit play, resolves the clip, and estimates time missed. Writes `nba_injuries_2023_2026.xlsx`. |
| `nba_injuries_template.xlsx` | Empty template showing the output columns. |
| `test_nba_injury_clips.py` | Offline unit tests for the pure logic (no network). |

## Output columns

`name | date | injury_desc | severity | play_by_play_url`

- **date** – game date the injury occurred
- **injury_desc** – the PST report note
- **severity** – *estimated time missed* (e.g. `14 days`, `season-ending`,
  or `unknown (no return logged)`), derived by pairing the injury with the
  player's next "activated/returned" PST entry
- **play_by_play_url** – clip of the injury play (blank if no in-game exit
  was found)

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Usage

Single game:

```bash
python nba_injury_clips.py 0022300001                  # list confirmed injuries + clip URLs
python nba_injury_clips.py 0022300001 --download       # also download the mp4s
python nba_injury_clips.py 0022300001 --include-unconfirmed  # clips for every candidate
```

Batch (per season, resumable):

```bash
python nba_injury_clips_batch.py --season 2023-24
python nba_injury_clips_batch.py --season 2024-25
python nba_injury_clips_batch.py --season 2025-26
python nba_injury_clips_batch.py                       # all three seasons
python nba_injury_clips_batch.py --finalize            # merge checkpoint CSV -> .xlsx
```

The batch driver checkpoints after every injury (`processed_injuries.txt` +
`nba_injuries_2023_2026.csv`) and resumes if interrupted — just re-run it.
Running one season at a time is gentlest on the unofficial APIs.

## Tests

```bash
pip install pytest
pytest test_nba_injury_clips.py -v
```

The tests use synthetic data, so they run **with no network access** and
cover candidate detection, name normalization/matching, PST parsing, the
time-missed estimate, schedule mapping, clip-URL building, and xlsx output.

## How it works (and what to distrust)

The core signal is a **heuristic**: a player whose last substitution in the
play-by-play is a sub-*out* "did not return." That also catches blowout
rest, foul-outs, ejections, and normal end-of-game subs — so candidates are
cross-checked against the PST injury log (by player + a short date window)
before a clip is resolved. PST confirmation reduces false positives but a
real injury PST never logged will show as "unconfirmed," and PST's HTML/
column layout can change.

The video endpoint (`videos.nba.com`) is undocumented and changes
periodically; if clip resolution stops working, the field names in
`extract_clip_url()` are the first thing to check.

## Known data-source limitations

These are upstream constraints, confirmed while testing, not bugs in this code:

- **stats.nba.com** is unofficial and rate-limits / blocks datacenter IPs.
  Calls can time out intermittently; `playbyplayv2` in particular may return
  an empty body (nba_api surfaces this as `KeyError('resultSet')`, which
  `get_play_by_play()` now re-raises with a clearer message). Run from a
  residential IP and re-run on failure — the batch driver is resumable.
- **Pro Sports Transactions** may return **HTTP 403** to automated requests
  (e.g. from a cloud IP). `fetch_pst_injuries()` now warns and continues
  instead of crashing; without PST, candidates can't be confirmed (use
  `--include-unconfirmed` for the single-game tool).
- **`BoxScoreSummaryV2`** (used for the game date) has known data-availability
  gaps for games on/after 2025-04-10; double-check dates for recent games.
