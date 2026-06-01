"""Central configuration: paths, model selection, and detection thresholds.

Values can be overridden via environment variables prefixed with ``NBA_`` (e.g.
``NBA_POSE_MODEL=yolo11n-pose.pt``) thanks to pydantic-settings.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-relative anchor: <project_root>/src/nba_injury/config.py -> project_root
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NBA_", extra="ignore")

    # --- paths ---
    project_root: Path = PROJECT_ROOT
    data_dir: Path = PROJECT_ROOT / "data"
    models_dir: Path = PROJECT_ROOT / "models"

    # --- pose model ---
    pose_model: str = Field(
        "yolo11x-pose.pt",
        description="Ultralytics pose weights. Use yolo11n-pose.pt for a fast/light run.",
    )
    pose_min_person_score: float = Field(0.5, ge=0.0, le=1.0)
    tracker: str = Field("bytetrack.yaml", description="Ultralytics tracker config.")

    # --- derived-signal thresholds ---
    # An ankle is considered "near ground" when within this fraction of the frame
    # height of its observed lowest position over the clip.
    ground_band_frac: float = Field(0.04, gt=0.0, lt=1.0)
    # Min consecutive airborne frames to count as a real airborne phase.
    min_airborne_frames: int = Field(3, ge=1)
    # Horizontal centroid speed (normalized units / second) above which the
    # subject is considered "moving" rather than "stationary".
    moving_speed_threshold: float = Field(0.05, gt=0.0)

    @property
    def sample_clips_dir(self) -> Path:
        return self.data_dir / "clips" / "sample"

    @property
    def pose_out_dir(self) -> Path:
        return self.data_dir / "interim" / "pose"

    @property
    def outputs_dir(self) -> Path:
        return self.data_dir / "outputs"


settings = Settings()
