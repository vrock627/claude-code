// Black Tide — content + tuning. Pure data, no engine logic.
// Exposes window.PIRATEDATA. Loadable in a browser or in Node (for _smoke.js).
(function () {
  "use strict";

  // Ship areas. Each tracks condition 0..100 (100 = pristine). Damage to a
  // given area causes a distinct problem — the heart of the localized-damage
  // design. `key` is the state field; `effect` documents the consequence.
  const AREAS = [
    { key: "hull",   label: "Hull",    effect: "breach → flooding; reaches 0 condition and floods → you sink" },
    { key: "masts",  label: "Masts",   effect: "shot away → less speed (chain-shot excels here)" },
    { key: "rudder", label: "Rudder",  effect: "smashed → sluggish turning, hard to bring guns to bear or flee" },
    { key: "guns",   label: "Guns",    effect: "dismounted → fewer guns fire, lighter broadside" },
    { key: "deck",   label: "Deck",    effect: "raked → crew casualties (grape-shot excels here)" },
  ];

  // Shot types. `bias` multiplies damage dealt to the matching area so the
  // player picks shot to suit intent (cripple, de-crew, or sink).
  // `base` is damage PER HIT; a broadside lands several hits, so keep these
  // low — a hull should take several good salvos to breach, not one.
  const SHOT_TYPES = {
    round: { label: "Round-shot", key: "round", base: 6, bias: { hull: 1.6 },  casualty: 0.10, desc: "Hull-breaker. Sinks ships." },
    chain: { label: "Chain-shot", key: "chain", base: 5, bias: { masts: 2.2 }, casualty: 0.04, desc: "Tears rigging. Kills mobility." },
    grape: { label: "Grape-shot", key: "grape", base: 5, bias: { deck: 1.7 },  casualty: 0.45, desc: "Shreds crew on deck." },
  };

  // Ship classes form a ladder (tier 0..3). `cost` is the drydock buy price,
  // `sellValue` the trade-in credit (< cost). Bigger = more guns + crew but
  // slower to turn. The sloop is the free starting hull.
  const SHIP_CLASSES = {
    sloop: {
      key: "sloop", name: "Sloop", tier: 0, cost: 0, sellValue: 60,
      maxSpeed: 132, turnRate: 1.55, gunsPerSide: 3,
      crewCap: 10, crewIdeal: 2, length: 46, beam: 16, gunRange: 270,
      desc: "Fast and nimble, but thin-hulled. A raider's first command.",
    },
    brig: {
      key: "brig", name: "Brig", tier: 1, cost: 220, sellValue: 110,
      maxSpeed: 108, turnRate: 1.15, gunsPerSide: 5,
      crewCap: 18, crewIdeal: 3, length: 60, beam: 20, gunRange: 300,
      desc: "A balanced all-rounder with a respectable broadside.",
    },
    frigate: {
      key: "frigate", name: "Frigate", tier: 2, cost: 560, sellValue: 300,
      maxSpeed: 92, turnRate: 0.85, gunsPerSide: 8,
      crewCap: 26, crewIdeal: 4, length: 76, beam: 24, gunRange: 330,
      desc: "A heavy warship: slow to turn, brutal to cross.",
    },
    galleon: {
      key: "galleon", name: "Galleon", tier: 3, cost: 1200, sellValue: 650,
      maxSpeed: 74, turnRate: 0.6, gunsPerSide: 12,
      crewCap: 36, crewIdeal: 5, length: 96, beam: 32, gunRange: 350,
      desc: "A floating fortress — ponderous to turn, devastating to face.",
    },
  };
  // Ship keys ordered by tier (used for enemy class-upgrades and the drydock).
  const SHIP_LADDER = Object.keys(SHIP_CLASSES).sort((a, b) => SHIP_CLASSES[a].tier - SHIP_CLASSES[b].tier);

  // Non-gun battle stations the player distributes hands across (cannons are
  // manned individually — see the cannon model). Effectiveness is driven by
  // (assigned / ideal), lightly weighted by the relevant skill.
  const STATIONS = [
    { key: "sails", label: "Sails", skill: "sailing", desc: "More/skilled hands → more speed" },
    { key: "helm",  label: "Helm",  skill: "sailing", desc: "More/skilled hands → sharper turns" },
    { key: "pumps", label: "Pumps", skill: "repair",  desc: "More/skilled hands → fight flooding" },
  ];

  const SKILLS = ["gunnery", "sailing", "repair", "melee", "medicine", "navigation"];

  // Crew traits are personality/ability QUIRKS — not jobs. A hand's competence at
  // any task comes from the skills they level by doing it (see SKILLS); quirks
  // modify their overall abilities. Each hand carries 1–2 of these. The engine
  // reads the typed fields in `effects` (see traitSum/hasTrait in game.js):
  //   skillAffinity {skill:+n}  starting-skill lean (an aptitude, not a job)
  //   board  +/- boarding melee    acc  +gunnery accuracy   maxHp +hp ceiling
  //   misfire chance a shot is lost   xpMult faster learning (all skills)
  //   healPerLeg extra ship-wide healing   repairMult cheaper repairs
  //   areaResist less incoming area damage   stormImmune  ambushDodge/scout
  //   loy starting-loyalty lean   moraleAura per-leg morale   mutinyResist
  //   rumLove   lootMult capture gold   demandsShares (greed → mutiny if unpaid)
  //   moraleWinBonus / quietLegMorale (bloodthirsty)
  const TRAITS = {
    brawler:      { key: "brawler",      label: "Brawler",      blurb: "Lethal in a boarding fight.",             effects: { board: 0.15, skillAffinity: { melee: 2 } } },
    crackshot:    { key: "crackshot",    label: "Crack Shot",   blurb: "A deadeye at the guns.",                  effects: { acc: 0.05, skillAffinity: { gunnery: 2 } } },
    tough:        { key: "tough",        label: "Tough",        blurb: "Hard to put down; soaks up wounds.",      effects: { maxHp: 40 } },
    coward:       { key: "coward",       label: "Coward",       blurb: "Wavers when the odds turn against you.",  effects: { board: -0.12, cowardly: true } },
    bloodthirsty: { key: "bloodthirsty", label: "Bloodthirsty", blurb: "Lives for the fight; restless in calm.",  effects: { board: 0.05, moraleWinBonus: 5, quietLegMorale: 2 } },
    drunkard:     { key: "drunkard",     label: "Drunkard",     blurb: "Merry and cheap, but unreliable.",        effects: { misfire: 0.10, loy: -8, rumLove: true } },
    sawbones:     { key: "sawbones",     label: "Sawbones",     blurb: "A knack for keeping the wounded alive.",  effects: { healPerLeg: 6, skillAffinity: { medicine: 2 } } },
    handy:        { key: "handy",        label: "Handy",        blurb: "Patches the ship quick and cheap.",       effects: { repairMult: 0.85, areaResist: 0.12, skillAffinity: { repair: 2 } } },
    sealegs:      { key: "sealegs",      label: "Sea Legs",     blurb: "Unbothered by storm or dead calm.",       effects: { stormImmune: true, skillAffinity: { sailing: 2 } } },
    sharpeyed:    { key: "sharpeyed",    label: "Sharp-Eyed",   blurb: "Spots trouble — and treasure — early.",   effects: { ambushDodge: 0.5, scout: true, skillAffinity: { navigation: 2 } } },
    quickstudy:   { key: "quickstudy",   label: "Quick Study",  blurb: "Learns any craft in half the time.",      effects: { xpMult: 0.6 } },
    loyal:        { key: "loyal",        label: "Loyal",        blurb: "Steadies the crew; won't turn on you.",   effects: { loy: 18, moraleAura: 2, mutinyResist: 0.4 } },
    greedy:       { key: "greedy",       label: "Greedy",       blurb: "Sharp nose for loot — and for their cut.", effects: { lootMult: 0.15, demandsShares: true, loy: -6 } },
  };

  // Skill ranks: a skill value maps to the highest rank whose `min` it meets.
  // Effect formulas already scale on the raw value; ranks are the UI face of it.
  const RANKS = [
    { min: 0,   label: "Green",  tag: "Grn" },
    { min: 1.5, label: "Able",   tag: "Abl" },
    { min: 3.5, label: "Salt",   tag: "Slt" },
    { min: 5.5, label: "Master", tag: "Mst" },
  ];

  // Officer roles — an appointment, one holder each (stored as crew.role). Since
  // there are no jobs, an officer's strength scales with their level in the
  // relevant `skill` (green ≈ 0.3 → master ≈ 1.0). Engine reads the numeric
  // effect fields; see officerFactor/officer* in game.js.
  const OFFICER_ROLES = {
    quartermaster: { key: "quartermaster", label: "Quartermaster", skill: "melee",      blurb: "Keeps order; steadier morale, fiercer boarding.", moraleDecayMult: 0.5, boardBonus: 0.15 },
    boatswain:     { key: "boatswain",     label: "Boatswain",     skill: "sailing",    blurb: "Drives the rigging; more speed and sharper turns.", sailMult: 1.18 },
    master_gunner: { key: "master_gunner", label: "Master Gunner", skill: "gunnery",    blurb: "Runs the gun deck; quicker reloads, better aim.", reloadMult: 0.9, accBonus: 0.04 },
    ships_doctor:  { key: "ships_doctor",  label: "Ship's Doctor", skill: "medicine",   blurb: "Runs the cockpit; the wounded mend faster.", healMult: 1.7, saveChance: 0.45 },
    navigator:     { key: "navigator",     label: "Navigator",     skill: "navigation", blurb: "Reads chart and sky; thriftier, safer voyages.", supplyPerLeg: -1, scout: 1 },
  };

  // Captain backgrounds chosen at creation. Grants a crew-wide perk.
  const CAPTAIN_TRAITS = {
    privateer: { key: "privateer", label: "Privateer",  blurb: "Trained gun crews. Reloads come quicker.", perk: { reloadMult: 0.85 } },
    smuggler:  { key: "smuggler",  label: "Smuggler",   blurb: "Slick rigging. Your ship runs faster.",    perk: { speedMult: 1.12 } },
    buccaneer: { key: "buccaneer", label: "Buccaneer",  blurb: "Feared boarder. Your crew hit harder.",    perk: { meleeMult: 1.25 } },
  };

  // Crew melee weapons (equipment). `melee` is added to a crew member's melee
  // power during boarding.
  const WEAPONS = {
    fists:     { key: "fists",     label: "Bare fists",   melee: 0, cost: 0 },
    cutlass:   { key: "cutlass",   label: "Cutlass",      melee: 3, cost: 30 },
    axe:       { key: "axe",       label: "Boarding axe", melee: 4, cost: 45 },
    pistol:    { key: "pistol",    label: "Flintlock",    melee: 5, cost: 70 },
  };

  // Enemy ship templates encountered in the slice.
  const ENEMIES = {
    merchant: {
      key: "merchant", name: "Merchant Brig", shipClass: "brig", faction: "merchants",
      crew: 4, gunnery: 1, aggression: 0.35, gold: 120, supplies: 4,
      blurb: "Fat with cargo, light on fight. A pirate's bread and butter.",
    },
    cutter: {
      key: "cutter", name: "Navy Cutter", shipClass: "sloop", faction: "navy",
      crew: 9, gunnery: 3, aggression: 0.85, gold: 90, supplies: 2,
      blurb: "Fast and aggressive. The crown's hounds.",
    },
  };

  // Factions track how the powers of the sea regard you. Deeds shift reputation;
  // reputation colours prices, quest offers, and who comes hunting.
  const FACTIONS = {
    navy:      { key: "navy",      label: "The Crown's Navy", blurb: "Law and the gallows." },
    merchants: { key: "merchants", label: "Merchant Guild",   blurb: "Coin, cargo, safe passage." },
    brethren:  { key: "brethren",  label: "Pirate Brethren",  blurb: "The free companies of the account." },
  };

  // Branching sea events. `req`/`cond`/`effect` receive (run, H) where H is a
  // helper bundle the engine supplies (see game.js eventAPI). `effect` returns
  // { lines:[...], battle?:enemyKey }.
  const EVENTS = {
    longboat: {
      id: "longboat", weight: 10,
      title: "A Drifting Longboat",
      text: "A longboat wallows in the swell, a handful of sunburnt souls waving weakly.",
      options: [
        { label: "Take them aboard", effect: (run, H) => { const nm = H.addCrew(); return { lines: [nm ? ("You haul them up. " + nm + " swears to pull their weight.") : "Your decks are already full; you share water and send them on."] }; } },
        { label: "Rob them, then cut them loose", effect: (run, H) => { H.gold(35); H.rep("brethren", 2); H.rep("merchants", -2); return { lines: ["You take their coin and trinkets — 35 gold — and leave them the oars."] }; } },
        { label: "Sail on", effect: () => ({ lines: ["You hold your course. Their cries fade astern."] }) },
      ],
    },
    distress: {
      id: "distress", weight: 8,
      title: "Merchant in Distress",
      text: "A merchant brig flies a distress pennant — a lean Crown cutter is closing to take her.",
      options: [
        { label: "Drive off the cutter", effect: (run, H) => { H.rep("merchants", 5); H.rep("navy", -3); return { lines: ["You come about to engage the attacker."], battle: "cutter" }; } },
        { label: "Join the wolves — take her yourself", effect: (run, H) => { H.rep("merchants", -4); return { lines: ["You run up the black. Easy pickings…"], battle: "merchant" }; } },
        { label: "None of your business", effect: () => ({ lines: ["You slip away. Not your fight."] }) },
      ],
    },
    wreck: {
      id: "wreck", weight: 9,
      title: "Floating Wreckage",
      text: "Spars and shattered planking drift on the tide — a ship died here recently.",
      options: [
        { label: "Salvage what floats", effect: (run, H) => { const g = 20 + Math.floor(Math.random() * 40); H.gold(g); const l = ["You pull " + g + " gold of goods from the wrack."]; if (Math.random() < 0.3) { H.damage("hull", 12); l.push("A jagged timber gouges your hull below the waterline."); } return { lines: l }; } },
        { label: "Search for survivors", req: (run, H) => H.has("sawbones") || H.skillAtLeast("medicine", 3), reqText: "needs a Sawbones or a skilled medic", effect: (run, H) => { const nm = H.addCrew(); return { lines: [nm ? ("A steady hand coaxes life back into a half-drowned sailor: " + nm + ".") : "You find one alive, but your decks are full."] }; } },
        { label: "Leave it be", effect: () => ({ lines: ["Bad luck to loot the drowned, some say. You pass on."] }) },
      ],
    },
    patrol: {
      id: "patrol", weight: 7,
      title: "Naval Patrol",
      text: "A Crown cutter signals you to heave to and be searched.",
      options: [
        { label: "Pay the 'inspection fee' (40g)", req: (run) => run.gold >= 40, reqText: "need 40 gold", effect: (run, H) => { H.gold(-40); H.notor(-6); return { lines: ["Coin changes hands. The officer finds nothing amiss."] }; } },
        { label: "Run up the black and fight", effect: (run, H) => { H.rep("navy", -3); return { lines: ["You show your true colours."], battle: "cutter" }; } },
        { label: "Try to slip away", effect: (run, H) => { if (Math.random() < 0.5) return { lines: ["You lose them in a squall."] }; H.damage("masts", 14); return { lines: ["A parting shot cracks a spar as you flee."] }; } },
      ],
    },
    becalmed: {
      id: "becalmed", weight: 6,
      title: "Becalmed",
      text: "The wind dies. Sails hang limp under a white sky.",
      options: [
        { label: "Wait it out", effect: (run, H) => { H.supplies(-2); return { lines: ["Two days of still air and dwindling water before the breeze returns."] }; } },
        { label: "Let the Sea Legs read the water", req: (run, H) => H.has("sealegs"), reqText: "needs a Sea Legs hand", effect: () => ({ lines: ["Your sea-legged hand finds a cat's-paw of wind and works you clear."] }) },
      ],
    },
    bottle: {
      id: "bottle", weight: 5, cond: (run) => !run.flags.tmap,
      title: "A Message in a Bottle",
      text: "A barnacled bottle bobs alongside. Inside: a scrap of chart marked with an inked cross.",
      options: [
        { label: "Follow the map", effect: (run, H) => { H.flag("tmap", true); H.addQuest("treasure_map"); return { lines: ["You mark the bearing. Somewhere out there, X marks the spot."] }; } },
        { label: "Toss it back", effect: () => ({ lines: ["Probably a hoax. You let it drift."] }) },
      ],
    },
    fever: {
      id: "fever", weight: 6, cond: (run) => run.crew.length > 2,
      title: "Fever Below Decks",
      text: "A sweating sickness spreads in the forecastle.",
      options: [
        { label: "Physic the sick", req: (run, H) => H.has("sawbones") || H.skillAtLeast("medicine", 3), reqText: "needs a Sawbones or a skilled medic", effect: () => ({ lines: ["A skilled hand breaks the fever. All hands pull through."] }) },
        { label: "Dose them with rum and hope", effect: (run, H) => { if (Math.random() < 0.5) return { lines: ["The fever passes on its own. Lucky."] }; const nm = H.loseCrew(); return { lines: [(nm || "A hand") + " doesn't see the morning. Buried at sea."] }; } },
      ],
    },
    parley: {
      id: "parley", weight: 6,
      title: "A Rival of the Account",
      text: "A pirate sloop hails you — not for a fight, but a word.",
      options: [
        { label: "Share a drink and news", effect: (run, H) => { H.rep("brethren", 4); H.supplies(2); return { lines: ["You trade rumours and rum. The brethren remember friends."] }; } },
        { label: "Demand tribute", effect: (run, H) => { if (Math.random() < 0.5) { H.gold(45); return { lines: ["They pay rather than bleed. 45 gold."] }; } H.rep("brethren", -4); return { lines: ["They laugh and sheer off, insulted."] }; } },
      ],
    },
    // --- Quirk-driven events (gated by who's aboard) ---
    broached_rum: {
      id: "broached_rum", weight: 5, cond: (run) => run.crew.some((c) => (c.traits || []).includes("drunkard")),
      title: "The Rum's Gone",
      text: "The rum cask is dry a week early. All eyes turn to the ship's known drunkard, grinning sheepishly.",
      options: [
        { label: "Flog them as an example", effect: (run, H) => { H.morale(-6); return { lines: ["Discipline is kept, but it's a grim morning. The crew mutters."] }; } },
        { label: "Laugh it off and share what's left", effect: (run, H) => { H.morale(6); H.supplies(-1); return { lines: ["You make a joke of it. The hands love you the more for it."] }; } },
        { label: "Dock it from their share", effect: (run, H) => { H.gold(10); return { lines: ["A quiet word and a lighter purse for the culprit. 10 gold recouped."] }; } },
      ],
    },
    red_sky: {
      id: "red_sky", weight: 6,
      title: "Red Sky at Morning",
      text: "The dawn comes up blood-red and the old hands go quiet. Sailors take such omens to heart.",
      options: [
        { label: "Steady them — an old salt reads the weather", req: (run, H) => H.has("sealegs"), reqText: "needs a Sea Legs hand", effect: () => ({ lines: ["Your sea-legged hand calls it plain weather, and the mood lifts."] }) },
        { label: "A loyal hand leads a song", req: (run, H) => H.has("loyal"), reqText: "needs a Loyal hand", effect: (run, H) => { H.morale(5); return { lines: ["A trusted voice starts a shanty, and the omen is forgotten by noon."] }; } },
        { label: "Say nothing and sail on", effect: (run, H) => { H.morale(-5); return { lines: ["You keep your counsel. The unease lingers below decks."] }; } },
      ],
    },
    the_shares: {
      id: "the_shares", weight: 5, cond: (run) => run.crew.some((c) => (c.traits || []).includes("greedy")),
      title: "A Word About Shares",
      text: "A greedy hand corners you: the plunder's been thin, and they want their cut — now.",
      options: [
        { label: "Pay a bonus from the chest (40g)", req: (run) => run.gold >= 40, reqText: "need 40 gold", effect: (run, H) => { H.gold(-40); H.morale(8); return { lines: ["Coin quiets the grumbling. For now, they're content."] }; } },
        { label: "Promise them the next prize", effect: (run, H) => { H.morale(-4); return { lines: ["Fine words, no coin. Their eyes narrow — you'd best deliver."] }; } },
        { label: "Put them in their place", effect: (run, H) => { H.morale(-8); return { lines: ["You face them down. It holds — but resentment festers."] }; } },
      ],
    },
  };

  // Multi-stage-ish quests. Completion applies `reward` (gold + faction rep).
  const QUESTS = {
    bounty_drake: {
      id: "bounty_drake", type: "bounty", faction: "brethren", title: "Bounty: the Red Drake",
      blurb: "The brethren will pay to see a Crown pirate-hunter on the bottom.",
      targetEnemy: "cutter", reqRep: { brethren: -100 },
      reward: { gold: 200, rep: { brethren: 10, navy: -5 } },
      log: "Sink or take a Navy Cutter.",
    },
    deliver_silk: {
      id: "deliver_silk", type: "delivery", faction: "merchants", title: "Cargo: Bolts of Silk",
      blurb: "The Guild needs silk carried to Nassau — quietly, and soon.",
      targetPort: "Nassau", reqRep: { merchants: -8 },
      reward: { gold: 150, rep: { merchants: 12 } },
      log: "Deliver the silk to Nassau.",
    },
    treasure_map: {
      id: "treasure_map", type: "treasure", faction: "brethren", title: "The Inked Cross",
      blurb: "A map from a bottle points to buried gold in the shallows.",
      targetNode: 2, reward: { gold: 260, rep: { brethren: 6 } },
      log: "Sail to the Reef Shallows and dig.",
    },
  };
  // Quests offered on port rumour boards (treasure comes from an event instead).
  const PORT_QUESTS = ["bounty_drake", "deliver_silk"];

  const FIRST_NAMES = ["Anne", "Jack", "Mary", "Edward", "Grace", "Henry", "Bess",
    "Tom", "Nell", "Will", "Kit", "Rourke", "Diego", "Mei", "Cuffee", "Salim",
    "Bart", "Jonah", "Rode", "Cato", "Isabel", "Owen", "Greer", "Finn"];
  const NICKNAMES = ["the Knife", "Blacktooth", "One-Eye", "Saltlung", "Quickhand",
    "the Gull", "Ironwrist", "Lowtide", "Halfpenny", "Bloodgut", "the Quiet",
    "Driftwood", "Cannonball", "Wormwood", "Sister Shark", "Longshanks"];

  // Port shop. Repair price is per condition-point restored.
  const PORT = {
    repairPerPoint: 1.4,        // gold per area condition point
    repairHullPerPoint: 2.0,    // hull costs more
    recruitCost: 60,            // gold per new hand
    supplyCost: 6,              // gold per supply unit
    weaponStock: ["cutlass", "axe", "pistol"],
    retireGold: 1500,           // reach this, retire at any port → victory
  };

  // Every balance knob lives here, so tuning never means hunting the engine.
  const TUNING = {
    // World map
    startGold: 80,
    startSupplies: 14,
    startCrew: 5,
    supplyPerLeg: 2,            // supplies burned sailing one map leg
    notorietyPerRaid: 25,
    notorietyDecayPerLeg: 3,
    eventChance: 0.6,          // chance an open-water/island leg triggers an event
    repPriceSwing: 0.006,      // per merchant-rep point, how much prices shift

    // Battle plane (world units; camera maps to canvas)
    arenaW: 1200,
    arenaH: 760,
    windStrength: 1.0,         // multiplier on wind speed effect
    // Sailing into the wind is slow; with it, fast. Factor by |angle to wind|.
    windMinFactor: 0.45,       // dead into the wind
    windMaxFactor: 1.35,       // running before the wind
    accel: 70,                 // u/s^2 toward target speed
    drag: 1.8,                 // how fast speed relaxes when sails eased

    // Gunnery — cannons are manned individually; each gun's gunner sets its
    // own reload time and accuracy. No auto-fire: the player orders each volley.
    reloadBase: 3.4,           // per-cannon base; divided by (0.6 + gunnerReloadK×skill)
    gunnerReloadK: 0.25,       // how much a gunner's gunnery skill speeds reload
    gunnerAccK: 0.05,          // how much gunnery skill improves accuracy
    gunneryXpPerFire: 0.03,    // gunnery skill a gunner earns each time they fire
    skillMax: 9,               // skill cap
    gunArcDeg: 40,             // half-arc each side of the beam a broadside covers
    accuracyBase: 0.62,
    accuracyRangeFalloff: 0.45,// fraction of accuracy lost at max range
    accuracyMotionPenalty: 0.30,// max accuracy lost vs a fast crossing target
    areaMax: 100,

    // Damage / flooding
    floodGain: 0.045,          // water/s per missing hull point
    pumpRate: 9.0,             // water/s removed at full pump manning
    floodSink: 100,            // water >= this → sink
    healRate: 1.6,             // crew hp/s per medicine point at infirmary (out of battle)

    // Boarding
    grappleRange: 70,          // must be this close to grapple
    boardTickSec: 0.6,         // melee exchange interval
    boardLethality: 0.02,      // casualties per exchange = side strength × this
    meleeBase: 4,              // base melee power per crew before skill/gear

    // Surrender thresholds (enemy yields)
    enemyHullSurrender: 28,    // enemy hull area below this may strike colors
    enemyCrewSurrender: 2,     // ...or crew this low

    // Economy
    loomSellRate: 0.6,        // (reserved) cargo sell fraction
    sinkGoldMult: 0.45,        // sinking yields less than capturing

    // --- Crew depth (iteration 3) ---
    // Skill growth (gunnery uses gunneryXpPerFire above)
    xpSailPerSec: 0.02,        // sailing XP for Sails/Helm crew, per battle second
    xpRepairPerSec: 0.05,      // repair XP for Pumps crew while flooding is fought
    xpMeleePerBoardTick: 0.06, // melee XP for boarders per exchange
    xpMedicinePerHeal: 0.05,   // medicine XP for the healer each leg they mend someone
    xpNavPerLeg: 0.08,         // navigation XP per map leg (extra for a Navigator/Lookout)
    xpRepairPerPortFix: 0.4,   // repair XP shared when the shipwright patches you up

    // Wounds & healing (crew hp 0..100; 0 = dead)
    woundGrape: 30,            // hp a grape casualty takes off a random hand
    woundBoardScale: 100,      // boarding "casualty points" → hp damage multiplier
    healBase: 9,               // hp a wounded hand recovers per leg
    healPerMedicine: 3,        // extra hp/leg per point of the best medicine aboard
    infirmaryCostPerHp: 0.7,   // gold per hp when resting the crew at a port

    // Morale & mutiny (run.morale 0..100)
    startMorale: 65,
    moraleMax: 100,
    moraleWin: 8,              // beat/drive off a foe
    moraleCapture: 12,         // take a prize
    moraleTreasure: 15,
    moraleLoss: 16,            // (subtracted) losing/fleeing a fight
    moraleLostHand: 6,         // (subtracted) each hand who dies
    moraleStarve: 12,          // (subtracted) a leg with no supplies
    moraleOverwork: 2,         // (subtracted) per leg beyond the grace period at sea
    overworkGraceLegs: 3,      // legs at sea before overwork bites
    rumRationSupplies: 3,      // cost of a rum ration
    rumRationMorale: 14,
    sharePerCrew: 7,           // gold per hand to divide the plunder
    shareMorale: 18,
    loyaltyStart: 60,
    mutinyThreshold: 25,       // morale below this risks mutiny
    mutinyChancePerPoint: 0.012, // per point below threshold, per leg

    // --- Quirk wiring (iteration 4) ---
    officerRefSkill: 8,        // skill at which an officer gives ~full effect
    officerFloor: 0.3,         // effect factor for a freshly-appointed (green) officer
    greedyMutinyBump: 0.05,    // added mutiny chance per greedy hand once shares run stale
    greedyStaleLegs: 4,        // legs without dividing plunder before greed bites
    scoutHops: 1,             // extra map hops a Sharp-Eyed hand / Navigator reveals

    // --- Notoriety-driven enemy scaling (iteration 5) ---
    notorCrewK: 0.010,         // enemy crew multiplier per notoriety point
    notorGunneryEvery: 45,     // +1 enemy gunnery per this much notoriety
    notorShipEvery: 40,        // enemy ship climbs one tier per this much notoriety
    notorGoldK: 0.006,         // enemy gold multiplier per notoriety point
    notorPerWin: 6,            // notoriety gained per victory
    notorNavyBonus: 4,         // extra notoriety for beating a navy foe
    notorHunted: 60,           // at/above this you are "hunted" (HUD cue)
  };

  window.PIRATEDATA = {
    AREAS, SHOT_TYPES, SHIP_CLASSES, SHIP_LADDER, STATIONS, SKILLS, TRAITS, CAPTAIN_TRAITS,
    RANKS, OFFICER_ROLES, WEAPONS, ENEMIES, FACTIONS, EVENTS, QUESTS, PORT_QUESTS,
    FIRST_NAMES, NICKNAMES, PORT, TUNING,
  };
})();
