# NBA Injury Analysis

Biomechanical analysis of NBA injuries. The system has three phases:

- **Phase A** — break down injury clips and extract per-injury metrics:
  takeoff feet (1 vs 2), landing feet (1 vs 2), landing on something other than
  feet, moving vs stationary, and interference from another player (stepped-on
  foot, shove).
- **Phase B** — measure how often players exhibit those same mechanics during
  normal play (base rates / exposure).
- **Phase C** — cross-reference injury metrics against base rates to estimate
  which mechanics carry higher injury risk.

> **Manual labels are ground truth.** The computer-vision pose prototype only
> *suggests* values to assist a human labeler. We do not auto-decide metrics
> from broadcast footage.

This first deliverable provides: the project scaffold, the shared data schema, a
**working pose-estimation prototype** (Phase A) that runs on sample clips, a
**manual-labeling workflow** (Label Studio), and **stubs** for Phases B and C.

## Quickstart

```bash
# 1. Install (base + dev). Add extras as needed:
uv sync --extra dev
uv sync --extra cv       # pose estimation: ultralytics + opencv + decord
uv sync --extra stats    # Phase C stats: statsmodels + scipy + scikit-learn

# 2. Verify the scaffold and see which capabilities are present:
python scripts/verify_scaffold.py

# 3. Run unit tests (no video/CV needed):
uv run --extra dev pytest -q

# 4. Run the pose prototype on your sample clips (place them first):
#    drop .mp4 files into data/clips/sample/  (gitignored)
scripts/run_pose_prototype.sh
```

Outputs land in `data/interim/pose/`: a `<clip>.parquet` of per-frame pose, a
`<clip>.meta.json`, and a `<clip>.signals.json` with the derived biomechanical
suggestions that feed the labeling tool.

## Prerequisites & caveats

- **`ffmpeg`** is used to normalize clip fps; install it if `verify_scaffold.py`
  reports it missing.
- **First pose run fetches model weights** over the network (ultralytics).
- **No NBA footage is stored in this repo** — `data/` is gitignored. See
  [docs/LEGAL_LICENSING.md](docs/LEGAL_LICENSING.md).
- Only a **synthetic, non-NBA** fixture clip is bundled for CI.

## Layout

```
src/nba_injury/
  schema/        shared metric enums + pydantic records (the contract)
  io/            video reading + pose/record storage
  pipelines/
    phase_a_injury/   pose prototype + derived signals (WORKING)
    phase_b_baserates/ base-rate exposure records (STUB)
    phase_c_crossref/  exposure tables + risk models (STUB)
  labeling/      Label Studio task export + label import
docs/            architecture, metric taxonomy, labeling guide, legal notes
scripts/         verify_scaffold.py, run_pose_prototype.sh
tests/           schema, derived-signal, and pose smoke tests
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.
