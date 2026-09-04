import type { Dispatch } from 'react';
import type { Action } from '../engine/reducer';
import { currentNode, visibleChoices } from '../engine/reducer';
import { deriveMood } from '../engine/date';
import type { GameState } from '../engine/types';
import { SCENES } from '../content/scenes';
import { Portrait } from './Portrait';
import { SceneArt } from './SceneArt';
import { outfitLabel } from '../content/outfits';
import { PARTY_LOCATIONS } from '../content/lifeContent';
import { isDebug } from '../engine/debug';
import { LADDER } from '../engine/types';

function asText(v: string | ((s: GameState) => string) | undefined, s: GameState): string {
  if (v === undefined) return '';
  return typeof v === 'function' ? v(s) : v;
}

export function SceneView({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const scene = s.scene ? SCENES[s.scene.sceneId] : null;
  const node = currentNode(s);
  if (!scene || !node || !s.scene) return null;

  const isPhone = scene.art === 'phone';
  // Parties draw their art and title from the rolled location.
  const partyLoc = s.scene.vars.loc ? PARTY_LOCATIONS[String(s.scene.vars.loc)] : null;
  const artId = partyLoc?.art ?? scene.art;
  const title = partyLoc ? partyLoc.name[0].toUpperCase() + partyLoc.name.slice(1) : scene.title;
  const mood = node.mood ?? (s.scene.date ? deriveMood(s.scene.date) : 'neutral');
  const choices = visibleChoices(s, node);
  const roll = s.scene.date?.lastRoll ?? null;
  // At a party she stays off-screen until you actually spot her — no portrait
  // or body-language cues telegraphing her presence.
  const kOnScreen =
    s.scene.vars.kHere === undefined ||
    (s.scene.vars.kHere === true && s.scene.vars.kSpotted === true);

  const d = s.scene.date;
  const debug = isDebug();

  return (
    <div className={`scene ${isPhone ? 'scene-phone' : ''}`}>
      {debug && d && (
        <div className="debug-panel">
          <span className="debug-tag">DEBUG</span>
          <span>interest <b>{Math.round(d.meters.interest)}</b></span>
          <span>comfort <b>{Math.round(d.meters.comfort)}</b></span>
          <span>momentum <b>{Math.round(d.meters.momentum)}</b></span>
          <span>strikes <b>{d.strikes}</b></span>
          <span>ladder <b>{d.ladder >= 0 ? LADDER[d.ladder] : '—'}</b></span>
          <span>date# <b>{d.dateNumber}</b></span>
          {s.scene.vars.spice !== undefined && (
            <span>
              spice <b>{String(s.scene.vars.spice)}</b>
              {s.scene.vars.baseSpice !== undefined &&
                s.scene.vars.spice !== s.scene.vars.baseSpice &&
                ` (from ${String(s.scene.vars.baseSpice)})`}
            </span>
          )}
          {s.scene.vars.heat !== undefined && <span>heat <b>{String(s.scene.vars.heat)}</b></span>}
          {s.scene.vars.kHere !== undefined && (
            <span>K {s.scene.vars.kHere ? (s.scene.vars.kSpotted ? 'spotted' : 'here, unspotted') : 'absent'}</span>
          )}
          <span className="debug-flags">
            [{Object.keys(s.k.flags).join(', ') || 'no flags'}]
          </span>
        </div>
      )}
      <header className="scene-head">
        <SceneArt art={artId} />
        <h2>{title}</h2>
      </header>
      <div className="scene-body">
        {!isPhone && kOnScreen && (
          <aside className="scene-side">
            <Portrait mood={mood} outfitId={s.scene.wardrobe.k} />
            {s.scene.cue && <p className="cue">{s.scene.cue}</p>}
            {s.scene.wardrobe.player && (
              <p className="player-outfit">You: {outfitLabel(s.scene.wardrobe.player)}</p>
            )}
          </aside>
        )}
        {!isPhone && !kOnScreen && s.scene.wardrobe.player && (
          <aside className="scene-side scene-side-solo">
            <p className="player-outfit">You: {outfitLabel(s.scene.wardrobe.player)}</p>
          </aside>
        )}
        <div className="scene-main">
          {roll && (
            <div key={`${roll.label}-${s.scene.nodeId}`} className={`roll ${roll.success ? 'roll-win' : 'roll-lose'}`}>
              <span className="roll-die">{roll.roll}</span>
              <span className="roll-math">
                {roll.crit
                  ? 'natural 20!'
                  : roll.fumble
                    ? 'natural 1…'
                    : `${roll.roll} ${roll.bonus >= 0 ? '+' : '−'} ${Math.abs(roll.bonus)} = ${roll.total} vs ${roll.dc}`}
              </span>
              <span className="roll-label">
                {roll.label} — {roll.success ? 'smooth' : 'not smooth'}
              </span>
            </div>
          )}
          <p className="narration">{asText(node.text, s)}</p>
          {node.kLine && <p className="kline">{asText(node.kLine, s)}</p>}
          <div className="choices">
            {choices.map((c, i) => (
              <button
                key={i}
                className={`choice ${c.move ? 'choice-move' : ''} ${c.callback ? 'choice-callback' : ''}`}
                onClick={() => dispatch({ type: 'CHOOSE', index: i })}
              >
                {c.callback && <span className="tag">memory</span>}
                {c.move && <span className="tag tag-move">bold</span>}
                {c.check && <span className="tag tag-roll">risky</span>}
                {c.text}
              </button>
            ))}
            {choices.length === 0 && (
              <button className="choice choice-continue" onClick={() => dispatch({ type: 'CONTINUE' })}>
                {node.endScene ? '⟶ ' + (isPhone ? 'Pocket the phone' : 'Continue') : node.nextLabel ?? 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
