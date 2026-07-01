# Black Tide — Game Design Document

> Working title: **Black Tide** (also considered: *Salt & Powder*, *Letters of Marque*, *Hoist the Black*).
> A pirate-themed sea-battle roguelike, heavily inspired by **FTL: Faster Than Light**.

**Status:** Design document + a **playable build** now lives alongside it
(`index.html`, `data.js`, `game.js`, `_smoke.js` — see [`README.md`](./README.md) to run it).
This document remains the full blueprint. Implemented so far: the §13 vertical slice, plus
**crew-manned per-cannon gunnery** (each gun has a gunner whose skill drives its reload and
accuracy; firing is a player order — no auto-fire), and an **events + multi-stage quests +
faction/reputation** layer (branching sea events; bounty/delivery/treasure contracts from
port rumour boards; standing with the Navy, Merchant Guild, and Pirate Brethren that colours
prices and offers).

---

## 0. Document purpose & how to read it

This is the single source of truth for the game's vision and mechanics. It is written so any
developer (human or agent) can pick it up and start implementing. It folds in research on
FTL's proven mechanics and specifies how our pirate game deliberately diverges.

**Locked, non-negotiable decisions** (agreed with the project owner):

- **Genre/inspiration:** A roguelike modeled on FTL, re-themed to age-of-sail piracy.
- **Presentation:** **Full canvas.** The entire game — naval battle, world map, ports, and
  menus — is rendered on a single HTML `<canvas>`. No DOM-based UI panels.
- **Combat timing:** **Real-time with pause.** Action flows continuously; pressing **Space**
  pauses so the player can issue orders (steer, fire, board, assign crew). Tactical depth
  without twitch reflexes — exactly FTL's model.
- **Standalone:** This is a brand-new, self-contained project. It does not reuse, import, or
  depend on anything else in the repository.

Everything else below is a design proposal, open to iteration, but written concretely enough
to build.

---

## 1. High concept & design pillars

**High concept:** *FTL meets the golden age of piracy.* You are a pirate captain commanding a
single ship and its crew across an open, dangerous sea. You sail, fight, board, raid, recruit,
and upgrade — one life, permadeath, every decision counting — until you make your fortune or
your ship goes down with all hands.

**The four pillars** (every feature should serve at least one):

1. **Movement-driven naval combat.** Unlike FTL's two ships locked in a static duel, *position
   is everything.* Heading, wind, range, and which side your guns face turn a battle into a
   dance. You maneuver to bring a broadside to bear, to rake an enemy's stern, to close for
   boarding, or to run downwind and escape.
2. **Realistic boarding.** No magic teleporters. To take a ship you must physically close to
   grappling range, hurl hooks, lay alongside, and send your crew swinging across to fight on
   the enemy deck — a high-risk, high-reward climax to a fight.
3. **Open exploration.** No forced one-way corridor. The sea is an open map you choose how to
   cross: chase rumors, hunt merchants, raid ports, dodge the navy, or push for the horizon.
4. **A deep, living crew.** Big rosters of named pirates with traits, leveling skills, gear,
   morale, and loyalty. Your crew is your most valuable — and most fragile — asset.

**Tone:** Gritty, romantic, a little darkly comic. Salt spray, gunsmoke, superstition, and
greed. Think *Master and Commander* crossed with a roguelike spreadsheet.

---

## 2. Background: what we're adapting from FTL

This section records the FTL mechanics we studied, so design rationale below has a reference
point. (Sources at the end of the document.)

### FTL's core loop
- You command **one ship + crew** across **8 sectors**, each a graph of **beacons** you
  **jump** between. Jumping burns fuel and advances a **pursuing Rebel fleet** that overtakes
  beacons behind you — relentless forward pressure that prevents grinding.
- Each beacon triggers a **procedural event**: combat, a store, a distress call, an
  environmental hazard, or nothing. Choices are text-driven, with outcomes gated by your
  systems/crew/resources.
- **Scrap** is the universal currency, spent at stores on fuel, ammo, hull repair, new
  systems, upgrades, weapons, and crew.
- A run ends in death (hull → 0) or by beating the **Rebel Flagship** in sector 8. Permadeath,
  procedural, one life per run.

### FTL's ship systems (power is the central economy)
A **reactor** produces a fixed pool of **power bars** the player distributes among systems in
real time. Unpowered systems do nothing; a crew member **manning** a system boosts it for free
and gains skill there.
- **Shields** — recharging bubbles, each absorbs one hit (2 power = 1 layer).
- **Engines + Piloting** — evasion chance and FTL-drive charge rate; must be manned to dodge/jump.
- **Weapons** — power gates how many weapons can be armed; weapons charge then fire.
- **Oxygen** — replenishes air; breaches/fires/open doors drain it.
- **Medbay / Clone Bay** — heal or revive crew.
- **Drones, Doors, Sensors, Backup Battery, Teleporter, Cloaking, Hacking, Mind Control,
  Artillery** — additional systems/subsystems.

### FTL combat (real-time with pause)
Both ships fire continuously; **spacebar pauses** to issue orders. The player **targets
specific enemy rooms/systems**. Damage past shields hits hull + the targeted system, starts
**fires**, opens **breaches** (venting oxygen), and injures crew. Defense = venting rooms,
locking doors, moving crew to repair, diverting power, or fleeing by charging the jump drive.

### FTL boarding
Send crew via teleporter into enemy rooms; they fight enemy crew (race + combat skill set
damage) and sabotage systems. Killing the enemy crew while sparing the hull yields more loot.

### FTL crew & skills
Crew belong to **races** with innate traits (Mantis = lethal fighters/weak repair; Engi =
great repair/weak fighters; Rockmen = fireproof, high HP, slow; Zoltan = power a system by
standing in it; etc.). Crew **gain skill with use** in piloting, engines, shields, weapons,
repair, and combat.

### Why FTL works (lessons we keep)
- One ship + deep, interacting systems → every decision matters.
- Power as a scarce, reallocatable budget → constant interesting tradeoffs.
- Pause-able real-time → tactical depth without reflex demands.
- Procedural events + permadeath + forward pressure → replayable, tense pacing.

---

## 3. How Black Tide diverges (the ten differentiators)

The owner specified ten ways this game departs from FTL. Each maps to a concrete mechanic:

| # | Requirement | FTL analogue | Black Tide design |
|---|---|---|---|
| 1 | Pirate ships / sea battles | Spaceships | Re-themed throughout: hulls, masts, sails, cannons, sea, ports. |
| 2 | **Movement matters** | Static 2-ship duel | Free 2-D maneuver on the battle plane: heading, **wind**, range, and **broadside firing arcs** decide everything (§7). |
| 3 | **Realistic boarding** | Teleporter | Close → grapple → lay alongside → crew cross and fight on deck (§8). |
| 4 | **Open exploration** | Linear sector push | Open sea node-map you traverse freely; roaming threats instead of a one-way fleet (§5). |
| 5 | **Ports & cities** | Stores | Ports with shipwright, tavern, market, and quest board (§10). |
| 6 | **Raiding ports** | (none) | Assault towns for big loot at the cost of **notoriety/heat** (§10.5). |
| 7 | **Bigger crews** | ~8 max | Rosters of ~12–30 named pirates with stations and reserves (§9). |
| 8 | **Crew traits & skills** | Race + 6 skills | Innate **traits** + six leveling **skills** + morale/loyalty (§9). |
| 9 | **Localized damage** | System + fire/breach | Damage by ship area, each with distinct consequences — flooding, lost speed/steering, fewer guns, casualties (§6). |
| 10 | **Crew weapons/equipment** | Race only | Equip crew with cutlasses, pistols, axes, armor, tools (§9.4). |

---

## 4. Core game loop

```
                ┌─────────────────────────────────────────────┐
                │  WORLD MAP  (open sea of nodes)              │
                │  choose a destination and sail               │
                └───────────────┬─────────────────────────────┘
                                │ arrive at a node → ENCOUNTER
        ┌───────────────┬───────┴────────┬──────────────┬──────────────┐
        ▼               ▼                ▼              ▼              ▼
   SEA BATTLE        PORT            STORY EVENT     PORT RAID      OPEN WATER
   (real-time     (shipwright,     (text choice,   (assault for   (hazard, rumor,
    + boarding)    tavern, market)  branching)      loot + heat)   nothing)
        │               │                │              │              │
        └───────────────┴────────────────┴──────────────┴──────────────┘
                                │ resolve → loot, gold, crew, damage, notoriety
                                ▼
                     spend at ports, upgrade ship & crew, grow legend
                                │
                                ▼
                 sail on … until you retire rich or sink (permadeath)
```

**The minute-to-minute loop:** pick a heading on the world map → arrive at a node → resolve the
encounter (most tensely, a real-time sea battle that may end in boarding) → collect rewards and
damage → decide whether to limp to a port to repair/recruit/resupply or press your luck.

**The run-level loop (roguelike):** start with a small ship and a handful of crew → through
combat and raids accumulate gold, better guns, a bigger ship, and a seasoned crew → notoriety
rises and the navy hunts you harder → reach a run-ending goal (a legendary prize, a final navy
flagship, or a "retire wealthy" threshold) or die trying. Permadeath: one ship, one life per
run. Optional meta-progression unlocks new starting ships/captains between runs (§11).

**Forward pressure (our version of the Rebel fleet):** instead of a wall sweeping you forward,
pressure comes from **notoriety** — the more you plunder, the more navy hunter-fleets spawn and
roam toward you, and the steeper port prices/hostility get. You can lie low, but the prize you're
chasing won't wait forever. This preserves FTL's "keep moving, don't grind" tension while
respecting the open-world pillar.

---

## 5. World & exploration (#4)

### Structure
The sea is a **graph of nodes** on a 2-D map (think a nautical chart). Unlike FTL's strictly
forward sectors, the player may sail to **any reachable adjacent node** — forward, back, or
sideways. The map is **procedurally generated per run** and revealed through a **fog of war**:
distant nodes show only rumors until scouted (a Lookout-trait crew member widens vision).

Travel between nodes consumes **time** (advancing world state: navy patrols move, weather
shifts, notoriety decays slowly) and **supplies** (food/water/rum for the crew — running out
tanks morale; see §9).

### Node types
- **Open water** — may be empty, or trigger a roaming encounter (merchant to hunt, navy
  patrol, rival pirate, storm, becalming, derelict).
- **Port / city** (§10) — the safe(ish) hub: repair, recruit, trade, quests. Some are
  pirate-friendly (havens), some are navy-controlled (dangerous but rich raid targets).
- **Island / cove** — exploration: hidden caches, fresh water/food, marooned recruits, ambush.
- **Wreck / derelict** — salvage for loot, but risk of survivors, disease, or a trap.
- **Landmark / quest node** — fixed objectives tied to rumors (buried treasure, a named rival,
  a legendary ship).

### Roaming threats (replacing the Rebel fleet)
- **Navy hunter-fleets** spawn based on **notoriety** and patrol toward the player's last-known
  position. Getting caught at sea forces a battle (often against superior numbers).
- **Rival pirates** roam for their own ends — sometimes hostile, sometimes targets, occasionally
  recruitable or willing to parley.

### Weather & wind
Wind has a **direction and strength** that vary by region and shift over time. It matters both
on the world map (sailing into the wind is slow) and decisively in battle (§7). Storms can
damage the ship and scatter crew; fog hides you (and threats). Wind/weather are first-class
systems, not flavor.

---

## 6. Ship model & localized damage (#9)

### Ship classes
Ships scale from nimble to monstrous. Representative line-up (final numbers in the TUNING block
during implementation):

| Class | Hull | Speed | Turn | Sail plan | Gun slots/side | Crew cap | Role |
|-------|------|-------|------|-----------|----------------|----------|------|
| **Sloop** | Low | High | High | 1 mast | 2–3 | ~8 | Fast, fragile raider; the starting ship. |
| **Brig** | Med | Med-high | Med | 2 masts | 4–5 | ~14 | Balanced all-rounder. |
| **Frigate** | High | Med | Med-low | 3 masts | 7–9 | ~22 | Heavy warship; trades agility for guns. |
| **Galleon** | Very high | Low | Low | 3–4 masts | 10–14 | ~30+ | Floating fortress; slow, hard to maneuver, devastating broadside. |

A larger ship is *not* strictly better: it's slower to turn (worse at keeping guns on target
and at fleeing), needs a bigger crew to fight effectively, and presents a bigger target.

### Crew as the "power" economy
FTL's reactor/power is re-themed as **crew assigned to stations.** A station only performs at
full effectiveness if **crewed**; a skilled crew member does more (§9). Key stations:
- **Helm** — steering responsiveness and evasion. Unmanned = sluggish, barely steers.
- **Sails / rigging** — top speed and acceleration; tacking against the wind.
- **Gun crews** — each gun (or gun group) needs hands to load and fire; more/better gunners =
  faster reload and tighter aim. This is the core "spend your people" tension: do you fully
  crew the guns, or pull hands to the pumps and the helm?
- **Pumps / carpenter** — bail water and patch the hull during flooding; repair damaged areas.
- **Surgeon / cockpit (infirmary)** — heal wounded crew over time.
- **Lookout** — vision/scouting on the world map and early warning in battle.

With a finite crew, the captain constantly **reassigns hands** between guns, sails, helm, pumps,
and boarding — exactly FTL's reallocate-power tension, but made of people.

### Localized damage — areas and consequences (the heart of #9)
The ship is divided into **areas**, each with its own condition (0–100%). Incoming fire (and
fire/flooding) damages specific areas, and each area's degradation causes a *different* problem:

| Area | When damaged… | Consequence |
|------|---------------|-------------|
| **Hull (below waterline)** | breach | **Flooding**: water rises over time; if it reaches critical the ship **sinks**. Pumps/carpenter slow or reverse it; a bad breach outpaces a small crew. |
| **Masts / sails / rigging** | shot away (chain-shot excels here) | **Lost speed and acceleration**; a felled mast can cut top speed sharply, crippling your ability to maneuver or flee. |
| **Rudder / helm** | smashed | **Lost steering**: turn rate craters; you may be unable to bring guns to bear or escape. |
| **Gun decks** | guns dismounted | **Fewer guns** on that side fire; reduces broadside weight. |
| **Powder magazine** | hit while exposed | Risk of **fire → catastrophic explosion** (huge hull damage / instant loss). High-risk target both to defend and to attack. |
| **Crew quarters / open deck** | raked (grape-shot excels here) | **Casualties**: crew wounded or killed, thinning the hands available for every station and for boarding. |

**Fire** can start on any area (from incoming shot, the magazine, or boarding action), spreads
to adjacent areas over time, hurts crew in the room, and must be fought (crew + water). **Flooding**
and **fire** are opposed clocks the player manages by assigning crew — the more areas in crisis,
the thinner the crew is stretched.

Targeting (in battle) lets the player aim a salvo at a chosen enemy area, and pick **shot type**
to bias the effect (round-shot → hull, chain-shot → masts, grape → crew). This is our analogue of
FTL targeting enemy systems — but with movement and arcs deciding whether you *can* hit that area
at all.

---

## 7. Sea-battle combat (#1, #2) — real-time with pause

The signature mode. Two (or more) ships maneuver on a 2-D battle plane, rendered on the canvas.

### Timing & control
- **Real-time with pause.** The simulation runs continuously; **Space** toggles pause. While
  paused, the player issues/queues orders (set heading, sail level, target area + shot type,
  assign crew to stations, prepare to board). Orders execute when unpaused. This is FTL's exact
  control philosophy.
- **Fixed-timestep update loop** (deterministic) under the hood; rendering interpolates.

### Movement model (the core divergence, #2)
Each ship has **position, heading, and velocity**. The player controls **heading** (turn rate
limited by ship class + rudder condition + helm crew) and **sail level** (more sail = more speed
but harder to turn and slower to stop). Crucially:
- **Wind** is a vector on the battle plane. Sailing **with** the wind is fast; sailing **into**
  it ("in irons") is slow or impossible — you must **tack** at an angle. Positioning relative to
  wind ("the weather gage") is a real tactical advantage: the upwind ship dictates the engagement.
- **Evasion** is emergent, not a stat roll: a fast ship moving across an enemy's line is genuinely
  harder to hit; a wallowing galleon is an easy mark. (We may still add a small accuracy model
  based on range, relative motion, and gunner skill.)

### Firing arcs (broadsides)
Cannons fire to the **sides** (port/starboard broadsides), with limited **swivels/chasers** fore
and aft. You cannot shoot where your guns don't point — so the entire battle is about **turning to
present a broadside** to the enemy while denying them yours. Classic maneuvers emerge naturally:
- **Raking** — crossing an enemy's bow or stern to fire down its length where it can't reply:
  devastating, the prize maneuver.
- **Holding the weather gage**, **crossing the T**, **running fights** (firing while fleeing with
  stern chasers), and **closing to board** (§8).

### Weapons / shot types
- **Round-shot** (standard) — hull and general damage.
- **Chain / bar-shot** — wrecks masts and rigging (kills enemy mobility; sets up a capture).
- **Grape-shot** — shreds crew on deck (thins defenders before boarding).
- **Swivel guns / chasers** — light, fast-firing, fore/aft arcs for harassing.
- **Mortar / bombs** (rarer, special ships) — arcing fire that ignores broadside arc.
- **Fire arrows / incendiaries** — start fires (risk: spreads to a prize you wanted intact).

Each weapon has range, reload time, damage, accuracy, and arc. Reload speed scales with gun-crew
size and gunnery skill. There are **no energy shields** — the defensive layer is *armor/hull
thickness, range, and above all not being where the shot is.*

### Battle resolution / exit states
- **Sink the enemy** (hull/flooding) — destroys most of the cargo; modest loot.
- **Board and capture** (§8) — keeps the ship intact: far more loot, possible prize ship/recruits.
- **Force a surrender** — heavy damage + crew losses can break enemy morale → they strike colors
  (yield) without boarding.
- **Disengage / flee** — break contact and sail off the battle plane (favored by the wind and a
  faster ship). Either side can attempt it.
- **You** can sink, surrender, or be boarded and taken — permadeath if your ship is lost.

---

## 8. Boarding (#3) — realistic, no teleporters

Boarding is the high-stakes climax of many fights and the deliberate replacement for FTL's
teleporter. It is a **physical, proximity-gated** sequence:

1. **Close the range.** You must maneuver into **grappling range** alongside the enemy — usually
   after crippling their rigging (chain-shot) so they can't outrun you, and raking their deck
   (grape) to thin defenders. Getting there *is* the naval-combat puzzle.
2. **Grapple & lay alongside.** Throw **grappling hooks** / planks to lash the ships together.
   This can be contested — the enemy may cut grapples, and while locked together both ships are
   stationary and exposed.
3. **Board.** Order a **boarding party** (chosen crew) to swing/climb across onto the enemy deck.
   Numbers, traits, skills, and **equipment** (§9.4) decide the melee.
4. **Deck melee.** Boarders fight enemy crew area-by-area across the enemy ship. Combat resolves
   over time (attacker traits/skills/gear vs defenders). Clearing the deck and the captain's
   quarters captures the ship.
5. **Outcome.** Capture yields the most loot, possibly the **prize ship** itself (sail it, sell
   it, or scuttle it), surrendering crew you can press-gang (recruit) or release.

**Defending against boarders.** When *you* are boarded, you assign crew to repel them, exploit
**chokepoints** (decks, hatches), and bring your best fighters/gear to bear. Losing the melee
means losing the ship. Trait synergies (Brawler, Marine) and equipment matter enormously here.

Boarding is intentionally **risky**: while grappled you can't maneuver or flee, a third party
could fall on you, and a failed boarding can gut your crew. The reward — an intact prize and full
holds — is worth it.

---

## 9. Crew (#7, #8, #10)

Crew are the soul of the game: large rosters of **named, individual pirates**, each a small
character with traits, skills, gear, health, and morale.

### 9.1 Roster & stations
- Rosters are large (roughly **12–30+**, capped by ship class). Not everyone can be at a station
  at once — the captain assigns hands to **helm, sails, each gun, pumps, infirmary, lookout**, and
  forms **boarding parties**. Idle/reserve crew rest (recover health/morale) or can be rushed to a
  crisis (fire, flood, repel boarders).
- This assignment is the live, tense resource-management layer in and out of battle — FTL's power
  bars, made of people with names you don't want to lose.

### 9.2 Skills (leveled through use, FTL-style)
Six skills, each improving with relevant activity:
- **Gunnery** — reload speed and accuracy at the guns.
- **Sailing** — speed/handling when on the rigging; tacking efficiency.
- **Repair (carpentry)** — patching hull, fighting floods, mending areas.
- **Melee** — damage and survivability in boarding/defense.
- **Medicine** — healing rate when stationed in the infirmary.
- **Navigation** — world-map travel speed, scouting, weather reading.

Skills rise from novice → seasoned → master, giving meaningful bonuses. Veteran crew are precious;
losing a master gunner hurts.

### 9.3 Traits (innate, FTL "race" analogue but human-flavored)
Traits are perks/quirks a pirate is recruited with (some good, some double-edged):
- **Brawler / Marine** — bonus melee; shines in boarding.
- **Master Gunner** — faster/accurate guns.
- **Carpenter** — superior repair and flood control.
- **Surgeon** — better healing.
- **Lookout (Eagle-eyed)** — extra scouting vision and battle warning.
- **Sea Legs** — immune to becalming/storm penalties; steady in rough weather.
- **Drunkard** — cheap to recruit, boosts crew morale at the rum ration, but unreliable under
  pressure (double-edged).
- **Coward / Loyal / Greedy / Bloodthirsty** — personality traits feeding morale, loyalty, and
  event outcomes (and mutiny risk).

(Final trait list to be tuned; the schema is "named modifiers on stats/skills/behavior.")

### 9.4 Equipment (#10)
Crew can be equipped, primarily affecting melee/boarding and some utility:
- **Melee:** cutlass, boarding axe, rapier, belaying pin — vary damage/speed.
- **Firearms:** flintlock pistol, blunderbuss — strong opening hit, slow reload.
- **Armor:** buff coat, breastplate — survivability vs encumbrance (slower).
- **Tools:** carpenter's kit (repair bonus), surgeon's bag (medicine bonus), spyglass (lookout).
Gear is bought/looted, assigned per crew member, and meaningfully shifts boarding outcomes.

### 9.5 Morale, loyalty & mutiny
- **Morale** rises with victories, plunder, rum, and rest; falls with defeats, hunger, unpaid
  shares, and overwork. Low morale degrades performance.
- **Loyalty** to the captain governs **mutiny risk**: chronically low morale, a unfair share of
  the loot, or a string of disasters can spark a mutiny (a special event/fight). Distributing
  plunder, granting shares, and choosing the right port stops at the tavern keep the crew sweet.
- Recruiting happens at **taverns** (§10) and from **captured/surrendered crews** (press-ganging).

---

## 10. Ports, economy & raiding (#5, #6)

### 10.1 Ports & cities
Ports are the hub between fights. Types range from lawless **pirate havens** (safe, cheap, shady)
to prosperous **navy/colonial ports** (rich, hostile, prime raid targets). A port offers:
- **Shipwright** — repair hull and damaged areas; buy ship **upgrades** (more guns, reinforced
  hull, better sails/rudder, larger holds) and, eventually, **new/bigger ships**.
- **Tavern** — **recruit crew** (browse available pirates with visible traits/skills), gather
  **rumors** (intel on prizes, treasure, navy movements), boost crew morale (shore leave).
- **Market** — buy/sell **cargo/goods** (trade economy), **weapons**, **shot**, **crew equipment**,
  and **supplies** (food/water/rum). Prices vary by port and by your **notoriety**.
- **Quest board** — accept jobs (escort, smuggle, bounty, treasure hunt) for gold/reputation.

### 10.2 Currency & resources
- **Gold** — universal currency (our "scrap"): earned from loot, prizes, trade, and quests;
  spent on everything above.
- **Supplies** — food/water/rum consumed by the crew over time; running dry crushes morale.
- **Shot/powder** — ammunition for some heavy weapons (analogue to FTL missiles/drone parts);
  most cannons use plentiful round-shot, special shot is limited.
- **Cargo** — tradeable goods filling the hold; the trade game and the spoils of raiding.

### 10.3 Loot & plunder
Winning fights and raids yields gold, cargo, shot, equipment, occasionally a **prize ship** or
**recruits**. Capturing (boarding) beats sinking for loot — the central risk/reward of combat.

### 10.4 Reputation / factions
Factions (navy/crown, merchant guilds, pirate brethren, native/local powers) track how they
regard you. Helping one often angers another. Reputation gates port access, prices, quests, and
which fleets hunt you.

### 10.5 Raiding ports & cities (#6) and the notoriety system
You can **assault a port** rather than trade with it: a special large-scale encounter (shore
batteries to silence, ships in harbor, a landing and a fight ashore) for **major loot**. The cost:
- **Notoriety / heat** spikes. Notoriety drives the game's **forward pressure** (§4): more and
  stronger **navy hunter-fleets** spawn and pursue you, friendly ports get nervous, raided regions
  turn hostile, and bounties rise.
- Notoriety decays slowly if you lie low, creating a **boom/bust rhythm**: raid big, then run and
  cool off, or keep escalating toward an inevitable navy showdown.

This is the open-world replacement for FTL's ever-advancing Rebel wall: *you* choose how hard to
push, and the world pushes back proportionally.

---

## 11. Progression, meta & run structure

- **Within a run:** grow from a sloop and a few hands to a feared captain with a heavy ship, a
  veteran geared crew, and a fearsome reputation. Permadeath — losing your ship ends the run.
- **Run-ending goals (one or more):** amass a target fortune and **retire**; complete a grand
  treasure/legend questline; or survive and defeat a climactic **navy flagship / pirate-hunter**
  that notoriety eventually unleashes (our "final boss").
- **Meta-progression (between runs):** completing milestones unlocks new **starting captains**
  (different trait loadouts) and **starting ships**, plus codex/lore — replayability in FTL's
  unlock spirit. (Scope: optional; can ship after the core loop.)

---

## 12. Technical architecture (intended; built later)

> Recorded here so implementation can begin directly from this document. **None of this is built
> yet.**

- **Platform:** Browser, **vanilla JavaScript, no build step, no dependencies.** Runs by opening
  an HTML file; plain `<script>` files. Keeps iteration fast and the project self-contained.
- **Rendering:** **Full canvas.** A single `<canvas>` 2-D context renders *everything* — battle,
  world map, ports, and menus. No DOM UI widgets; buttons/panels are drawn and hit-tested on the
  canvas. (We will build a tiny in-house immediate-mode UI helper: draw-rect/text + click
  hit-testing.)
- **Scene/screen manager:** a stack/state machine over screens — `Title → Captain Creation →
  World Map → Battle → Boarding → Port → Event → Game Over`. Each screen implements
  `update(dt)`, `render(ctx)`, and input handlers.
- **Main loop:** **fixed-timestep** simulation (e.g. 60 Hz) via `requestAnimationFrame` + an
  accumulator, so the real-time-with-pause battle sim is **deterministic**; rendering interpolates
  between sim steps. Pause simply stops advancing the accumulator while still rendering + accepting
  orders.
- **Input:** keyboard for steering/sail/pause (Space) and hotkeys; mouse for canvas UI, targeting,
  and order issuing.
- **Data-driven content:** all content (ship classes, ship areas + damage rules, weapons/shot
  types, crew traits, skills, equipment, ports, sea-map node types, events) lives in a separate
  **data module**, behind a single **`TUNING`** object holding every balance constant in one place
  — so tuning never means hunting through engine code.
- **Save/load:** `localStorage` (single save slot to start), permadeath roguelike.
- **Headless validation:** a small Node script (no browser) that loads the data module and asserts
  every record's shape and key formulas — fast regression safety net for content/balance.
- **Suggested file layout** (when we start coding, all under `pirates/`):
  ```
  pirates/
    index.html      # canvas element + script tags
    data.js         # window.PIRATEDATA: all content + TUNING (no engine logic)
    engine.js       # loop, scene manager, sim (movement, combat, boarding, damage), save/load
    ui.js           # immediate-mode canvas UI + rendering helpers
    main.js         # bootstraps the canvas, input, and the scene stack
    _smoke.js       # headless Node data/formula validation (not shipped)
    DESIGN.md       # this document
  ```
  (Exact split is provisional; the engine may be one file to start.)

---

## 13. First playable milestone (the vertical slice) — **IMPLEMENTED**

This slice is now built (see `README.md`). It is a **thin but complete end-to-end loop** that
proves the core fantasy, ready to expand:

1. **Captain & ship creation** — pick a starting captain (trait loadout) and the **sloop**.
2. **Small open-sea map** — a handful of nodes: open water, one **port**, one roaming enemy.
3. **One full sea battle** — real-time + pause: steer with **wind**, fire **broadsides** at a
   targeted enemy **area**, see **localized damage** (a felled mast slows them, a hull breach
   floods), evade or close.
4. **One boarding** — chain/grape the enemy, close, grapple, send a party, resolve a **deck melee**
   with traits/skills/equipment, **capture** for loot.
5. **One port** — repair, recruit one crew, buy a weapon/upgrade, sell loot.
6. **Economy + persistence** — gold, crew, supplies, ship condition, **save/load**, **permadeath**
   on sinking, a victory/credits stub.
7. **Headless `_smoke.js`** green; documented run/serve instructions.

**Explicitly out of the slice (later milestones):** port **raiding** + full notoriety escalation,
the broad **event/quest** system, the full ship roster and weapon catalog, factions/reputation
depth, weather variety, meta-progression unlocks, and audio.

---

## 14. Open questions & risks

- **Name & art direction.** "Black Tide" is a placeholder. Full-canvas art could be simple vector
  shapes (fast to build, readable) or pixel sprites (more charming, more asset work) — decide early
  as it shapes the renderer. The slice can use clean vector/top-down shapes.
- **Battle camera & scale.** Single-screen arena vs. a scrolling/zooming camera. Recommendation:
  start single-screen, add camera later.
- **Multi-ship battles.** The model should allow 3+ ships (navy fleets, third parties), but the
  slice should start 1-v-1 for tractability.
- **Depth vs. scope.** The crew/trait/economy/faction systems are deep; the risk is breadth
  without a fun core. Mitigation: the vertical slice (§13) locks the fun of *maneuver → cripple →
  board* before widening.
- **Boarding UX.** Resolving deck melee on the canvas (abstract bars vs. little fighting figures)
  needs prototyping to feel good without micromanagement.
- **Determinism vs. RNG.** Fixed-timestep sim plus seeded RNG keeps runs reproducible/testable;
  confirm how much randomness combat should carry.

---

## Sources (FTL research)

- FTL: Faster Than Light — Wikipedia: <https://en.wikipedia.org/wiki/FTL:_Faster_Than_Light>
- FTL Wiki — Systems: <https://ftl.fandom.com/wiki/Systems>
- FTL Wiki — Boarding: <https://ftl.fandom.com/wiki/Boarding>
- FTL Wiki — Crew skills: <https://ftl.fandom.com/wiki/Crew_skills>
- Steam Community — "Practical FTL" guide: <https://steamcommunity.com/sharedfiles/filedetails/?id=266502670>
- Digital Trends — 10 tips for surviving FTL: <https://www.digitaltrends.com/gaming/ftl-faster-than-light-advanced-edition-guide/>

---

*End of design document. Next step: review/iterate this design, then build the §13 vertical slice.*
