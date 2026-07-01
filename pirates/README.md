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
- **World map:** ✦ marks a quest destination. Sailing into open water may spring a
  **branching event** (a choice with consequences).
- **Battle (real-time with pause):**
  - **← / →** (or A/D) — steer
  - **↑ / ↓** (or W/S) — raise / ease sail
  - **Space** — pause to issue orders (FTL-style)
  - **1 / 2 / 3** — round-shot / chain-shot / grape-shot
  - **Click an enemy area** (Hull/Masts/Rudder/Guns/Deck) — set your target
  - **Cannons are crew-manned — there is no auto-fire.** Click a hand in the CREW
    list, then click a **gun slot** to post them (or a **Helm/Sails/Pumps/Reserve**
    button). Each manned gun reloads on its own; a better gunner reloads faster and
    shoots straighter.
  - **F** (or a battery's **FIRE** button) — discharge every *loaded* cannon on the
    side that **bears**. Firing out of arc just wastes the load — turn to bear first.
  - **B** — board (only when alongside, within grapple range)

## What the slice demonstrates

- **Movement-driven naval combat** — heading, wind (the weather gage), range, and
  broadside firing arcs decide the fight.
- **Crew-manned gunnery** — every cannon needs a gunner; that gunner's **skill** sets
  the gun's reload speed and accuracy, and improves with use. You fire on command.
- **Localized damage** — hull→flooding (you can sink), masts→speed, rudder→steering,
  guns→fewer cannons online, deck→crew casualties; pick shot type to suit your intent.
- **Crew as the power economy** — post hands to guns, helm, sails, and pumps; you never
  have enough hands for everything at once.
- **Realistic boarding** — close to grapple range, lash alongside, send the boarding
  party; melee is decided by crew, skills, and equipment. Capture pays more than sink.
- **Open exploration + events** — sail a node-map; open water throws branching events
  whose choices are gated by your crew's traits, skills, and gold.
- **Quests & factions** — take contracts (bounty / delivery / treasure) from port rumour
  boards; your deeds shift standing with the **Navy, Merchant Guild, and Pirate
  Brethren**, which colours prices and what's on offer.
- **A deep crew** — every named hand **levels the skill they work** (Green → Able → Salt →
  Master); takes **wounds** that heal over voyages (faster with a surgeon) and can **die**;
  and has **morale & loyalty** — win, plunder, and pour a **rum ration** to keep spirits up,
  or face a **mutiny** when it bottoms out. Promote **officers** (Quartermaster, Boatswain,
  Master Gunner, Ship's Doctor, Navigator) for ship-wide bonuses, and manage it all from the
  port **Crew** tab (promote / arm / dismiss / divide the plunder / tend the wounded).
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
