# Black Tide — Unity 6 port (vertical slice)

A C# port of the pirate sea-battle roguelike (the browser original lives in `../pirates/`).
This is a **code-driven** Unity 6 project: it builds its camera, UI, and rendering in C# at
runtime, so there's **no scene or prefab wiring** — you open it and press Play.

> **Status:** a playable **vertical slice** — title → choose captain → open-sea map → sail →
> an **FTL-style station battle** (post your crew to the guns, rigging, pumps and repair
> party; reload and fire at a chosen part of the enemy; pump out flooding; patch damage;
> sink *or* board for the prize) → port (repair / drydock / tavern) → save. Notoriety makes
> foes tougher and bigger as you win. Quests, the full crew/quirks depth, and more content
> come in follow-up passes.

## Run it on your PC

1. **Install Unity 6.** Get **Unity Hub** (https://unity.com/download), and in Hub install an
   editor in the **6000.x** line (any 6000.0 LTS patch is fine — Hub will offer to open the
   project with the version you have).
2. **Add the project.** In Unity Hub: **Add → Add project from disk** → select this
   `unity/BlackTide` folder. Open it. First open takes a minute while Unity imports.
3. **Press Play** (the ▶ button at the top). The game starts on an empty scene — no setup
   needed; a bootstrap script spawns everything.

To make a standalone `.exe`: **File → Build Profiles** (or Build Settings) → add an empty
scene if prompted → **Build**.

## Controls

The battle is real-time with pause — there's no steering. You win by managing the ship.

- **Mouse** — everything: menus, ports, enemy target area, and the crew stations.
- **Post a crew member** — click a mate, then click a station (Gun Deck / Rigging / Bilge
  Pumps / Repair Party) to send them there. The gun deck reloads and aims; the rigging helps
  you dodge and mends masts; the pumps bail water and patch the hull; the repair party mends
  the rudder, guns and deck and resists boarders.
- **Space** — pause (issue orders freely while paused).
- **1 / 2 / 3** — round / chain / grape shot.
- **F** — fire the loaded guns at the chosen area. **B** — grapple and board for the prize.

## Project layout

```
BlackTide/
  Assets/Scripts/
    Core/   # engine-agnostic C# (no UnityEngine) — all game logic & rules
    App/    # Unity layer: GameBoot (runtime bootstrap) + GameHost (IMGUI render + input)
  Packages/manifest.json          # minimal; Unity fills in the rest on first open
  ProjectSettings/ProjectVersion.txt
_coretests/   # .NET console harness that unit-tests Core off-Editor (not part of the game)
```

The **Core** is deliberately free of any UnityEngine dependency: it's unit-tested with plain
.NET (`dotnet run --project unity/_coretests`) — data/ladder invariants, firing, flooding &
sinking, the drydock economy, prize capture, and notoriety scaling all pass there before the
game ever opens in Unity. The **App** layer only renders that state and feeds it input.

## If the Unity Console shows a compile error

The whole project was authored without a Unity Editor in the loop (it was type-checked against
a UnityEngine stub, which catches most issues but not everything). If the Console reports an
error on first open, **paste it back** and it'll be fixed quickly.

## Notes
- The browser build in `../pirates/` is unchanged and still runs by opening its `index.html`.
- Saves use Unity `PlayerPrefs` (key `blackTideSave_v1`); permadeath clears it.
