# Black Tide

A pirate-themed sea-battle roguelike inspired by *FTL: Faster Than Light*.
Full-canvas, real-time-with-pause, vanilla JS — **no build step, no dependencies.**

> Design vision and mechanics: see [`DESIGN.md`](./DESIGN.md).
> This folder currently contains the **playable vertical slice** (the §13 milestone).

## Run it

It's a static page — just serve this folder and open it:

```bash
cd pirates
python3 -m http.server 8000
# then open http://localhost:8000/
```

(Opening `index.html` directly via `file://` works too; a local server is just tidier.)

## Validate (headless, no browser)

```bash
node pirates/_smoke.js
```

Checks every data record's shape and the core battle-math invariants
(wind factor bounds, reload rewards gun crew, flooding vs. pumps, etc.).

## Controls

- **Click "New Voyage"**, pick a captain, and you're on the open-sea map.
- **World map:** click a glowing adjacent node to sail there. Enemy nodes start a
  battle; ports open the shop; sailing burns supplies.
- **Battle (real-time with pause):**
  - **← / →** (or A/D) — steer
  - **↑ / ↓** (or W/S) — raise / ease sail
  - **Space** — pause to issue orders (FTL-style)
  - **1 / 2 / 3** — round-shot / chain-shot / grape-shot
  - **Click an enemy area** (Hull/Masts/Rudder/Guns/Deck) — set your target
  - **+ / –** on stations — move crew between Guns / Sails / Helm / Pumps
  - **B** — board (only when alongside, within grapple range)
  - Your broadsides auto-fire when a side **bears** on the enemy and is in range —
    the skill is *maneuvering with the wind to bring guns to bear*.

## What the slice demonstrates

- **Movement-driven naval combat** — heading, wind (the weather gage), range, and
  broadside firing arcs decide the fight.
- **Localized damage** — hull→flooding (you can sink), masts→speed, rudder→steering,
  guns→firepower, deck→crew casualties; pick shot type to suit your intent.
- **Crew as the power economy** — distribute hands across stations; effectiveness
  drives reload, speed, turning, and flood control.
- **Realistic boarding** — close to grapple range, lash alongside, send the boarding
  party; melee is decided by crew, skills, and equipment. Capture pays more than sink.
- **Open exploration + ports** — sail a node-map; repair at the shipwright, recruit at
  the tavern, arm your crew and buy supplies at the market.
- **Roguelike economy** — gold, supplies, crew, ship condition; permadeath; reach the
  retire-gold goal at any port to win the run.

## Files

| File | Role |
|------|------|
| `index.html` | Canvas shell; loads the two scripts. |
| `data.js` | `window.PIRATEDATA` — all content + the central `TUNING` block. No logic. |
| `game.js` | Engine: fixed-timestep loop, scene manager, battle sim, boarding, map, port, save/load. |
| `_smoke.js` | Headless Node validation of data + battle math. |
| `DESIGN.md` | The full game design document. |

Save data lives in `localStorage` under `blackTideSave_v1`; sinking ends the run and clears it.
