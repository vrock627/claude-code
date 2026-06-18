# eBay Used Car Parts Profit Analyzer

Pulls eBay **sold/completed** listings for used car parts, computes average/median
sale price, sales volume, net proceeds after fees, and a **suggested max buy price**
per part — then writes everything into a Google Sheet organized by car make/model.

The point: before you buy a parts car on Facebook Marketplace / Craigslist or pull a
part at a junkyard, know what it actually *sells* for and the most you should pay.

> **Read this first — legal / practical reality.** eBay actively blocks scrapers
> (a plain request to a "Sold items" page returns HTTP 403) and scraping is against
> eBay's Terms of Service. This project scrapes politely (realistic headers, heavy
> throttling, on-disk caching) as a *starting point*, behind a clean adapter so you
> can swap in eBay's official API the moment you get keys. **You are responsible for
> how you use it.** The durable, sanctioned path is the API — see
> [Switching to the official eBay API](#switching-to-the-official-ebay-api).

## How it works

```
catalog.py        →  high-volume make/models × high-value parts  →  PartQuery list
sources/          →  fetch sold listings for each query (scraper now, API later)
analyze.py        →  listings  →  PartStats (avg, median, volume, net, max buy, score)
sheets.py         →  PartStats →  Google Sheet, one tab per make/model
main.py           →  CLI that wires it all together
```

## Setup

```bash
cd parts-pricer
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then edit
```

### Google Sheets credentials

1. Create a Google Cloud project and **enable the Google Sheets API**.
2. Create a **service account** and download its JSON key.
3. Create a Google Sheet, copy its ID from the URL
   (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`).
4. **Share the sheet with the service account's email** (the `client_email` in the
   JSON), giving it Editor access.
5. In `.env` set:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json
   SHEET_ID=<your sheet id>
   ```

You can skip all of this and use `--dry-run` to just print results to the terminal.

## Usage

```bash
# One vehicle, print to terminal (no Sheets needed)
python main.py --make Honda --model Civic --dry-run

# One vehicle, write to Google Sheets
python main.py --make Honda --model Civic

# Whole built-in catalog of high-volume vehicles
python main.py --all

# Tune the economics
python main.py --all --margin 0.5 --lookback 90
```

Key flags:

| Flag | Meaning | Default |
|------|---------|---------|
| `--make` / `--model` | Limit to one vehicle | (all) |
| `--all` | Run the full catalog | off |
| `--dry-run` | Print tables, don't touch Sheets | off |
| `--source` | `scraper` or `api` | `scraper` |
| `--margin` | Target profit margin for "suggested max buy" | `0.5` |
| `--lookback` | Days of sold history to consider | `90` |
| `--no-cache` | Ignore the on-disk cache | off |
| `--limit` | Max number of parts per vehicle (for quick tests) | (all) |

## Output columns

Per part (one row), grouped into a tab per make/model:

- **median_price** – headline number; robust to outliers
- **avg_price**, **min**, **max**, **std** – distribution
- **volume** – sold items found in the lookback window
- **est_monthly_volume** – volume normalized to ~per month
- **avg_net** – proceeds after eBay/PayPal fees
- **suggested_max_buy** – avg_net × (1 − margin); *the number you act on*
- **opportunity_score** – est_monthly_volume × avg_net (what to pull first)
- **sample_size**, **last_updated**

> Volume is an **estimate**: eBay's sold search returns a capped, roughly 90-day
> window, so treat counts as directional, not exact sales figures.

## Switching to the official eBay API

`sources/ebay_api.py` implements the same `SoldDataSource` interface as the scraper.
Two relevant eBay APIs:

- **Browse API** – active listings (free with a developer account). Good for current
  asking prices.
- **Marketplace Insights API** – *sold* item data (what this tool wants). It's a
  Limited Release; you must apply for access.

Once you have credentials, set `EBAY_APP_ID` / `EBAY_CERT_ID` in `.env` and run with
`--source api`. No other code changes required.

## Notes

- **Catalytic converters are intentionally excluded** from the catalog — reselling
  them is legally restricted in many jurisdictions.
- eBay prices reflect national demand and may be higher than what a local
  pull-a-part buyer pays; the fee + margin model converts them into a realistic
  acquisition price.
- Be polite: keep the throttle high. Hammering eBay will get you blocked and is
  against their ToS.

## Tests

```bash
pip install pytest
pytest
```

Tests cover the HTML parser (against a saved fixture, no network) and the analysis
math (fees, margin, volume).
