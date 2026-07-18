import type { GameState } from '../engine/types';
import { BLOCKS, STAGES } from '../engine/types';
import { HOME_TIERS, CAR_TIERS, JOB_TIERS } from '../content/lifeContent';

function Meter({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone: string }) {
  return (
    <div className="meter" title={`${label}: ${value}/${max}`}>
      <span className="meter-label">{label}</span>
      <div className="meter-track">
        <div className={`meter-fill tone-${tone}`} style={{ width: `${(100 * value) / max}%` }} />
      </div>
    </div>
  );
}

export function Hud({ s }: { s: GameState }) {
  const weekday = ((s.day - 1) % 7) + 1;
  return (
    <header className="hud">
      <div className="hud-row">
        <span className="hud-day">
          Day {s.day} <em>({BLOCKS[s.block]}, day {weekday}/7 of rent week)</em>
        </span>
        <span className="hud-money">${s.money}</span>
      </div>
      <div className="hud-meters">
        <Meter label="Energy" value={s.energy} tone="energy" />
        <Meter label="Mood" value={s.mood} tone="mood" />
        <Meter label="Job" value={s.job.performance} tone="job" />
      </div>
      <div className="hud-row hud-small">
        <span>Charm {s.stats.charm} · Style {s.stats.style} · Fitness {s.stats.fitness}</span>
        <span>
          {s.job.fired ? 'Unemployed' : JOB_TIERS[s.job.tier].name} · {HOME_TIERS[s.homeTier].name} ·{' '}
          {CAR_TIERS[s.carTier].name}
        </span>
      </div>
      {s.k.met && (
        <div className="hud-row hud-small hud-k">
          <span>
            Krystalle: {s.k.routeDead ? '✕ ' + (s.k.routeDeadReason ?? 'It’s over.') : STAGES[s.k.stage]}
            {!s.k.routeDead && s.k.datesCompleted > 0 ? ` · ${s.k.datesCompleted} date${s.k.datesCompleted > 1 ? 's' : ''}` : ''}
          </span>
        </div>
      )}
    </header>
  );
}
