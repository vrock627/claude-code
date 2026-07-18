import type { Dispatch } from 'react';
import type { Action } from '../engine/reducer';
import { currentNode, visibleChoices } from '../engine/reducer';
import { deriveMood } from '../engine/date';
import type { GameState } from '../engine/types';
import { SCENES } from '../content/scenes';
import { Portrait } from './Portrait';
import { SceneArt } from './SceneArt';

function asText(v: string | ((s: GameState) => string) | undefined, s: GameState): string {
  if (v === undefined) return '';
  return typeof v === 'function' ? v(s) : v;
}

export function SceneView({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const scene = s.scene ? SCENES[s.scene.sceneId] : null;
  const node = currentNode(s);
  if (!scene || !node || !s.scene) return null;

  const isPhone = scene.art === 'phone';
  const mood = node.mood ?? (s.scene.date ? deriveMood(s.scene.date) : 'neutral');
  const choices = visibleChoices(s, node);
  const roll = s.scene.date?.lastRoll ?? null;

  return (
    <div className={`scene ${isPhone ? 'scene-phone' : ''}`}>
      <header className="scene-head">
        <SceneArt art={scene.art} />
        <h2>{scene.title}</h2>
      </header>
      <div className="scene-body">
        {!isPhone && (
          <aside className="scene-side">
            <Portrait mood={mood} />
            {s.scene.cue && <p className="cue">{s.scene.cue}</p>}
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
