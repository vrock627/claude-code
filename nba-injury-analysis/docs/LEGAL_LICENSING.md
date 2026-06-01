# Legal & Licensing Notes

> This is engineering guidance, not legal advice. Consult a qualified attorney
> before collecting, storing, or sharing footage, and before publishing results.

## NBA footage is copyrighted

NBA game broadcasts and clips are protected by copyright (and related rights
held by the NBA, broadcasters, and others). Downloading, storing, and
redistributing them is restricted.

## How this project handles it

1. **No footage in version control.** The `data/` tree (clips, interim pose,
   labels, outputs) and `models/` are `.gitignore`d. Only **code** and
   **non-NBA synthetic fixtures** are committed.
2. **Retain derivatives, not media.** The analytically valuable outputs are
   *numeric*: keypoint coordinates, derived signals, and metric labels. Prefer
   keeping these (parquet/JSON) over retaining the source video. `InjuryEvent`
   stores `source_urls` for provenance rather than embedding media.
3. **Local research use.** Clips are used locally to develop and validate the
   pipeline. Any analysis intended for use beyond private research should be
   reviewed for fair-use / licensing before clips are shared or results are
   published.
4. **CI uses a synthetic clip.** `scripts/verify_scaffold.py` generates a crude
   non-NBA fixture (`tests/fixtures/synthetic_jump.mp4`) so automated tests
   never depend on proprietary footage.

## Before scaling to the full 12-year dataset

- Determine a lawful acquisition path (e.g. a license/data agreement with the
  rights holder, or an approved research arrangement).
- Document the source and rights basis for each clip.
- Decide a retention policy: ideally delete source clips after extracting
  derivatives, keeping only what the license permits.

## Player data / privacy

Injury and player information should come from public or properly licensed
sources; record provenance in `InjuryEvent.source_urls`.
