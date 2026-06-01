#!/usr/bin/env bash
# One-command demo: run the Phase A pose prototype on the sample clips.
#
# Usage:
#   scripts/run_pose_prototype.sh [clip.mp4 ...]
# With no args it processes every clip in data/clips/sample/.
set -euo pipefail

cd "$(dirname "$0")/.."

CLIPS=("$@")
if [ ${#CLIPS[@]} -eq 0 ]; then
  shopt -s nullglob
  CLIPS=(data/clips/sample/*.mp4 data/clips/sample/*.mov data/clips/sample/*.mkv)
fi

if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "No clips found. Drop sample clips into data/clips/sample/ (gitignored)."
  exit 1
fi

for clip in "${CLIPS[@]}"; do
  echo "== $clip =="
  uv run --extra cv python -m nba_injury.pipelines.phase_a_injury.run --clip "$clip"
done
