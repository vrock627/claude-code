import { useEffect, useReducer } from 'react';
import { initialState, reducer } from './engine/reducer';
import { loadGame, saveGame, clearSave } from './engine/save';
import { Hud } from './ui/Hud';
import { LifeScreen } from './ui/LifeScreen';
import { SceneView } from './ui/SceneView';

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState());

  useEffect(() => {
    if (s.screen !== 'title') saveGame(s);
  }, [s]);

  if (s.screen === 'title') {
    const save = loadGame();
    return (
      <div className="app title-screen">
        <h1>
          Slow<span>Burn</span>
        </h1>
        <p className="tagline">
          A life, a job, a city — and a woman who decides the pace. Read the room, stay smooth,
          and don’t rush the good part.
        </p>
        <div className="title-buttons">
          {save && (
            <button className="btn-primary" onClick={() => dispatch({ type: 'LOAD', state: save })}>
              Continue — Day {save.day}
            </button>
          )}
          <button
            className={save ? 'btn-secondary' : 'btn-primary'}
            onClick={() => {
              clearSave();
              dispatch({ type: 'NEW_GAME' });
            }}
          >
            New Game
          </button>
        </div>
        <p className="fine">Her interest, comfort, and expectations are never shown. Watch her, not a meter.</p>
      </div>
    );
  }

  if (s.screen === 'gameover') {
    return (
      <div className="app title-screen">
        <h1>
          Game<span>Over</span>
        </h1>
        <p className="tagline">{s.gameOver}</p>
        <div className="title-buttons">
          <button
            className="btn-primary"
            onClick={() => {
              clearSave();
              dispatch({ type: 'NEW_GAME' });
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Hud s={s} />
      {s.scene ? <SceneView s={s} dispatch={dispatch} /> : <LifeScreen s={s} dispatch={dispatch} />}
      {s.toasts.length > 0 && !s.scene && (
        <div className="toasts" onClick={() => dispatch({ type: 'CLEAR_TOASTS' })}>
          {s.toasts.slice(-4).map((t, i) => (
            <div key={`${s.day}-${s.block}-${i}`} className="toast">
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
