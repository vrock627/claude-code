import type { Dispatch } from 'react';
import type { Action } from '../engine/reducer';
import type { GameState } from '../engine/types';
import { BLOCKS } from '../engine/types';
import {
  ACTIVITIES,
  CAR_TIERS,
  DATE_VENUES,
  HOME_TIERS,
  WARDROBE_TIERS,
  JOB_TIERS,
} from '../content/lifeContent';
import { MEMORY_FACTS } from '../content/krystalle';

export function LifeScreen({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const pd = s.k.pendingDate;
  const dateNow = pd && pd.day === s.day && pd.block === s.block;
  const acts = ACTIVITIES.filter(
    (a) => a.blocks.includes(s.block) && (!a.available || a.available(s))
  );

  return (
    <div className="life">
      {pd && !dateNow && (
        <div className="banner">
          📅 {DATE_VENUES.find((v) => v.id === pd.venueId)?.name} with Krystalle —{' '}
          {pd.day === s.day ? 'today' : `day ${pd.day}`}, {BLOCKS[pd.block].toLowerCase()}. Don’t be late. She has a whole thing about late.
        </div>
      )}
      {dateNow && (
        <button className="banner banner-go" onClick={() => dispatch({ type: 'GO_ON_DATE' })}>
          💚 It’s time — meet Krystalle at {DATE_VENUES.find((v) => v.id === pd!.venueId)?.name}
        </button>
      )}

      <section className="panel">
        <h3>
          {BLOCKS[s.block]} — what’s the move?
        </h3>
        <div className="act-grid">
          {acts.map((a) => (
            <button key={a.id} className="act" onClick={() => dispatch({ type: 'ACTIVITY', id: a.id })}>
              <strong>{a.name}</strong>
              <span>{a.desc}</span>
              <span className="act-cost">
                {a.id === 'work'
                  ? `+$${JOB_TIERS[s.job.tier].pay} · −energy`
                  : `${a.cost ? `−$${a.cost}` : ''} ${a.energy < 0 ? `· −${-a.energy} energy` : a.energy > 0 ? `· +${a.energy} energy` : ''}`}
              </span>
            </button>
          ))}
          <button className="act act-sleep" onClick={() => dispatch({ type: 'SLEEP' })}>
            <strong>Sleep</strong>
            <span>End the day. Tomorrow is undefeated.</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Phone</h3>
        {s.k.hasNumber && !s.k.routeDead ? (
          <button className="phone-btn" onClick={() => dispatch({ type: 'OPEN_PHONE' })}>
            💬 Text Krystalle {s.k.textedToday ? '(already chatted today)' : ''}
          </button>
        ) : s.k.routeDead ? (
          <p className="muted">Her thread sits at the bottom of your messages. {s.k.routeDeadReason}</p>
        ) : (
          <p className="muted">
            No numbers worth texting. Someone interesting is out there — cafés mornings, the park early, the
            Palms at night.
          </p>
        )}
        {s.k.memories.length > 0 && !s.k.routeDead && (
          <details className="memories">
            <summary>Things you know about Krystalle ({s.k.memories.length})</summary>
            <ul>
              {s.k.memories.map((id) => (
                <li key={id}>{MEMORY_FACTS[id]?.label ?? id}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="panel">
        <h3>Upgrades</h3>
        <div className="shop">
          {s.wardrobeTier < WARDROBE_TIERS.length - 1 && (
            <button
              className="shop-item"
              disabled={s.money < WARDROBE_TIERS[s.wardrobeTier + 1].cost}
              onClick={() => dispatch({ type: 'BUY', kind: 'wardrobe', tier: s.wardrobeTier + 1 })}
            >
              👔 {WARDROBE_TIERS[s.wardrobeTier + 1].name} — ${WARDROBE_TIERS[s.wardrobeTier + 1].cost}
            </button>
          )}
          {s.carTier < CAR_TIERS.length - 1 && (
            <button
              className="shop-item"
              disabled={s.money < CAR_TIERS[s.carTier + 1].cost}
              onClick={() => dispatch({ type: 'BUY', kind: 'car', tier: s.carTier + 1 })}
            >
              🚗 {CAR_TIERS[s.carTier + 1].name} — ${CAR_TIERS[s.carTier + 1].cost}
              <span>{CAR_TIERS[s.carTier + 1].desc}</span>
            </button>
          )}
          {s.homeTier < HOME_TIERS.length - 1 && (
            <button
              className="shop-item"
              disabled={s.money < HOME_TIERS[s.homeTier + 1].moveCost}
              onClick={() => dispatch({ type: 'BUY', kind: 'home', tier: s.homeTier + 1 })}
            >
              🏠 {HOME_TIERS[s.homeTier + 1].name} — ${HOME_TIERS[s.homeTier + 1].moveCost} to move, $
              {HOME_TIERS[s.homeTier + 1].rent}/wk
              <span>{HOME_TIERS[s.homeTier + 1].desc}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
