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

  // Player-selectable ship classes (slice ships in the sloop/brig range).
  const SHIP_CLASSES = {
    sloop: {
      key: "sloop", name: "Sloop", maxSpeed: 132, turnRate: 1.55, gunsPerSide: 3,
      crewCap: 10, crewIdeal: 2, length: 46, beam: 16, gunRange: 270,
      desc: "Fast and nimble, but thin-hulled. A raider's first command.",
    },
    brig: {
      key: "brig", name: "Brig", maxSpeed: 108, turnRate: 1.15, gunsPerSide: 5,
      crewCap: 18, crewIdeal: 3, length: 60, beam: 20, gunRange: 300,
      desc: "A balanced all-rounder with a respectable broadside.",
    },
    frigate: {
      key: "frigate", name: "Frigate", maxSpeed: 92, turnRate: 0.85, gunsPerSide: 8,
      crewCap: 26, crewIdeal: 4, length: 76, beam: 24, gunRange: 330,
      desc: "A heavy warship: slow to turn, brutal to cross.",
    },
  };

  // Battle crew stations the player distributes hands across. Each has an
  // effectiveness curve driven by (assigned / ideal).
  const STATIONS = [
    { key: "guns",  label: "Guns",  desc: "More hands → faster reload" },
    { key: "sails", label: "Sails", desc: "More hands → more speed" },
    { key: "helm",  label: "Helm",  desc: "More hands → sharper turns" },
    { key: "pumps", label: "Pumps", desc: "More hands → fight flooding" },
  ];

  const SKILLS = ["gunnery", "sailing", "repair", "melee", "medicine", "navigation"];

  // Crew traits — innate modifiers. `mods` adjust skills; `melee`/`reload`/etc.
  // are flat multipliers/bonuses read by the engine.
  const TRAITS = {
    brawler:  { key: "brawler",  label: "Brawler",   blurb: "Lethal in a boarding fight.",      mods: { melee: 2 } },
    gunner:   { key: "gunner",   label: "Master Gunner", blurb: "Loads and aims fast.",          mods: { gunnery: 2 } },
    carpenter:{ key: "carpenter",label: "Carpenter", blurb: "Patches hull, fights floods.",      mods: { repair: 2 } },
    surgeon:  { key: "surgeon",  label: "Surgeon",   blurb: "Keeps the wounded breathing.",      mods: { medicine: 2 } },
    sailor:   { key: "sailor",   label: "Old Salt",  blurb: "Reads wind and sail by instinct.",  mods: { sailing: 2 } },
    lookout:  { key: "lookout",  label: "Lookout",   blurb: "Eagle-eyed; sees trouble early.",   mods: { navigation: 2 } },
    drunkard: { key: "drunkard", label: "Drunkard",  blurb: "Cheap and merry, but unreliable.",  mods: { melee: 1, gunnery: -1 } },
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
      key: "merchant", name: "Merchant Brig", shipClass: "brig",
      crew: 4, gunnery: 1, aggression: 0.35, gold: 120, supplies: 4,
      blurb: "Fat with cargo, light on fight. A pirate's bread and butter.",
    },
    cutter: {
      key: "cutter", name: "Navy Cutter", shipClass: "sloop",
      crew: 9, gunnery: 3, aggression: 0.85, gold: 90, supplies: 2,
      blurb: "Fast and aggressive. The crown's hounds.",
    },
  };

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
    retireGold: 600,            // reach this, retire at any port → victory
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

    // Battle plane (world units; camera maps to canvas)
    arenaW: 1200,
    arenaH: 760,
    windStrength: 1.0,         // multiplier on wind speed effect
    // Sailing into the wind is slow; with it, fast. Factor by |angle to wind|.
    windMinFactor: 0.45,       // dead into the wind
    windMaxFactor: 1.35,       // running before the wind
    accel: 70,                 // u/s^2 toward target speed
    drag: 1.8,                 // how fast speed relaxes when sails eased

    // Gunnery
    reloadBase: 3.4,           // seconds at ideal manning
    gunArcDeg: 38,             // half-arc each side of the beam a broadside covers
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
  };

  window.PIRATEDATA = {
    AREAS, SHOT_TYPES, SHIP_CLASSES, STATIONS, SKILLS, TRAITS, CAPTAIN_TRAITS,
    WEAPONS, ENEMIES, FIRST_NAMES, NICKNAMES, PORT, TUNING,
  };
})();
