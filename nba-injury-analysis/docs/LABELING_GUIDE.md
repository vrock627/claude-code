# Labeling Guide

Manual labels are the project's ground truth. The CV pose prototype only
*suggests* values; you confirm or correct every field.

## Tooling: Label Studio

We use [Label Studio](https://labelstud.io/) (open-source). The labeling
interface is defined in `src/nba_injury/labeling/label_studio_config.xml`; its
choice values match the enums in `schema/enums.py` so imports map cleanly.

### Setup (once)

```bash
uv sync --extra labeling
# Expose local clips to Label Studio:
export LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
export LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=$(pwd)/data
label-studio start
```

Create a project, paste `label_studio_config.xml` as the labeling config, and
add a **Local Storage** source pointing at `data/clips/`.

### Workflow

1. **Generate pose suggestions** for each clip:
   `scripts/run_pose_prototype.sh` → writes `<clip>.signals.json`.
2. **Export tasks** (clips + CV suggestions):
   `uv run python -m nba_injury.labeling.export_tasks` →
   `data/labels/label_studio_tasks.json`. Import this into Label Studio.
3. **Label**: each clip is labeled **independently by two people**. Scrub to the
   event, set `event_frame`, then fill every metric. Treat the `cv_suggestions`
   text as a hint, not an answer.
4. **Adjudicate** disagreements; record `reviewed_by` and `agreement_flag`.
5. **Import** completed annotations:
   `uv run python -c "from nba_injury.labeling.import_labels import import_export_file; import_export_file('export.json')"`
   → validated `ClipMetricLabel` records.

## Decision rules (apply consistently)

- **Event moment** = first ground contact on the landing where the injury
  occurs. If non-contact and no landing (e.g. a pulled hamstring mid-stride),
  use the frame where the player visibly breaks down.
- **landing_feet = one** if the *first* foot down is single, even if the other
  foot follows within a few frames.
- **takeoff_feet** is judged from the push-off, not the gather step.
- **interference** requires plausible contribution — incidental contact away
  from the event is `none`.
- When genuinely unsure, use `unknown` and lower `confidence`; do not guess.

## Quality control

Before trusting any labels at scale, compute **Cohen's kappa per field** across
the two labelers on the seed set. Low agreement on a field means the taxonomy or
this guide needs tightening before that field is usable in Phase C.
