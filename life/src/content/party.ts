// Parties, v2. Every party rolls: a LOCATION (Dex's house / frat blowout /
// pool party / rooftop), a SPICE level (1 mellow, 2 lively, 3 wild), one of
// two intros, and two event rooms plus the truth-or-dare circle every party
// has somewhere. Spice changes dialogue, choices, and how far the games go —
// beer pong becomes strip pong at a spice-3 frat party.
//
// The night flows FORWARD through phases (early → peak → late → last call):
// rooms are one-shot, the connective "flow" text changes every phase, and the
// Krystalle arc is a progressive chain — spot her, approach, two rounds of
// conversation that never repeat, a location-specific moment, and a late-night
// coda. No hub loops.
//
// Wardrobe is tracked per scene (SceneState.wardrobe): swimsuits at the pool,
// and if you lose strip pong or take the wrong dare, you stay shirtless for
// the rest of the night and the writing knows it.

import type { GameState, Scene, SceneNode } from '../engine/types';
import { CALLBACK_LINES, MEMORY_FACTS } from './krystalle';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const L = (s: GameState) => String(s.scene!.vars.loc ?? 'house');
const sp = (s: GameState) => Number(s.scene!.vars.spice ?? 1);
const intro = (s: GameState) => Number(s.scene!.vars.intro ?? 0);
const beats = (s: GameState) => Number(s.scene!.vars.beats ?? 0);
const drinks = (s: GameState) => Number(s.scene!.vars.drinks ?? 0);
const rolled = (s: GameState, room: string) =>
  String(s.scene!.vars.rooms ?? '').split(',').includes(room);
const done = (s: GameState, key: string) => s.scene!.vars['done_' + key] === true;
const roomOpen = (s: GameState, room: string) =>
  rolled(s, room) && !done(s, room) && beats(s) < 4;
const kHere = (s: GameState) => s.scene!.vars.kHere === true;
const spotted = (s: GameState) => kHere(s) && s.scene!.vars.kSpotted === true;
const kphase = (s: GameState) => Number(s.scene!.vars.kphase ?? 0);
const topicDone = (s: GameState, t: string) => s.scene!.vars['ktopic_' + t] === true;
const m = (s: GameState) => s.scene!.date!.meters;
const dating = (s: GameState) => s.k.hasNumber;
const shirtless = (s: GameState) => s.scene!.wardrobe.player === 'p-shirtless';

const NUMBER_JUDGE = (s: GameState) =>
  m(s).interest >= 52 && m(s).comfort >= 48 && m(s).momentum >= 30;

// ---------------------------------------------------------------------------
// scene
// ---------------------------------------------------------------------------

const NODES: Record<string, SceneNode> = {
  // ======================================================== ARRIVAL
  arrive: {
    id: 'arrive',
    text: (s) => {
      const v = intro(s);
      switch (L(s)) {
        case 'frat':
          return v === 0
            ? 'Sigma Rho announces itself from two blocks out — bass, a bedsheet banner, a lawn full of people holding the same red cup like a uniform. Dex meets you on the porch with a handshake he invented on the spot. Inside, the house is a weather system.'
            : 'You arrive at Sigma Rho mid-chant. A human pyramid is being attempted and litigated at the same time. Dex appears from the crowd, already hoarse: “PACE yourself. This place doesn’t.” The floor is sticky. The energy is prehistoric.';
        case 'pool':
          return v === 0
            ? 'The Marlowe’s pool deck is all late sun and turquoise — towels staked out like territories, a grill sending up signals, somebody’s speaker doing summer things. You’re in trunks and optimism. Priya waves you in past the towel checkpoint.'
            : 'You come up to the Marlowe deck just as a cannonball detonates applause across the water. Chlorine, sunscreen, grill smoke. Dex, inexplicably already dry and holding a kebab, salutes you from a deck chair. Trunks and optimism — it’s that kind of afternoon.';
        case 'rooftop':
          return v === 0
            ? 'Noor’s rooftop is string lights and skyline — blankets, wine in mugs, a guitar making its way around. The city glitters below like it’s doing it on purpose. Conversations are low and good. Dex is here somewhere; you can hear the laugh.'
            : 'You come up the last flight into open sky — Noor’s rooftop, candles in jars, someone pointing a telescope at nothing in particular. It’s the kind of party where people say “anyway, the moon” and mean it. The night air is doing half the hosting.';
        default:
          return v === 0
            ? sp(s) >= 2
              ? 'You hear Dex’s party before you see it — bass through brick, a knot of strangers on the stoop. Inside it’s shoulder-to-shoulder, string lights, a hundred conversations in a blender. Dex hands you a cup of something loud and vanishes.'
              : 'Dex’s place is glowing amber — records on low, candles that are a fire risk and worth it, people draped over couches mid-conversation. Dex points you at the kitchen, mouths “everything’s in there,” and drifts off hosting.'
            : 'Dex’s door is opened by a stranger who greets you like a co-conspirator. The hallway smells like someone’s ambitious cooking experiment; the living room has already reached the “group photo nobody will remember taking” stage. Dex yells your name from another room entirely.';
      }
    },
    next: 'flow',
    nextLabel: 'Into the night',
  },

  // ======================================================== THE FLOW
  // Connective tissue between events. Its text changes with the phase of the
  // night, and its choices shrink as rooms get used up. No two visits read
  // the same, and once the beats run out the night winds down for real.
  flow: {
    id: 'flow',
    text: (s) => {
      const b = beats(s);
      const loc = L(s);
      const early: Record<string, string> = {
        frat: 'The party is still climbing — every ten minutes the chant changes and the floor gets stickier.',
        pool: 'Golden hour settles over the deck. The pool is at maximum splash, the grill line moves with purpose.',
        rooftop: 'The rooftop hums, low and warm, the city switching its lights on building by building.',
        house: 'The party finds its cruising altitude — rooms filling up, the playlist winning arguments.',
      };
      const peak: Record<string, string> = {
        frat: 'Peak Sigma Rho: three games running at once, a couch relocated for reasons nobody can reconstruct, a dog in sunglasses.',
        pool: 'The deck hits its stride — floaties commandeered, an unsanctioned diving competition forming a bracket.',
        rooftop: 'The rooftop reaches its perfect hour — guitar handed off mid-song, someone naming constellations wrong with total confidence.',
        house: 'Peak party: the kitchen is a talk show, the hallway is a confessional, and the living room has a moment happening every four minutes.',
      };
      const late: Record<string, string> = {
        frat: 'The house downshifts — casualties on couches, the chants gone tender and nostalgic. Survivors only now.',
        pool: 'The sun is gone and the pool glows from below. Towel-wrapped clusters trade stories in the blue light.',
        rooftop: 'Candles gutter in their jars. The blanket supply is exhausted; the city below has gone quiet and glittering.',
        house: 'The party thins to its inner circle — the good records, the honest conversations, the last slice claimed.',
      };
      const base = b <= 1 ? early[loc] : b === 2 ? peak[loc] : late[loc];
      const drunkLine =
        drinks(s) >= 3 ? ' Your own edges have gone pleasantly approximate.' : '';
      const shirt = shirtless(s)
        ? ' You are still, per the terms of your defeat, without a shirt — a fact strangers keep toasting.'
        : '';
      const kTail =
        spotted(s) && kphase(s) === 0
          ? ' And across it all: Krystalle, exactly where you left off noticing her.'
          : '';
      return base + drunkLine + shirt + kTail;
    },
    choices: [
      // ---- dynamic room choices (2 rolled per location, one-shot) ----
      {
        text: 'Join the pong table.',
        cond: (s) => roomOpen(s, 'pong'),
        goto: 'pong',
      },
      {
        text: 'Wade into the kitchen debate.',
        cond: (s) => roomOpen(s, 'kitchen'),
        goto: 'kitchen',
      },
      {
        text: 'Get on the dance floor.',
        cond: (s) => roomOpen(s, 'dance'),
        goto: 'dance',
      },
      {
        text: 'Slip into the record lounge.',
        cond: (s) => roomOpen(s, 'vinyl'),
        goto: 'vinyl',
      },
      {
        text: 'Answer the call of the keg line.',
        cond: (s) => roomOpen(s, 'keg'),
        goto: 'keg',
      },
      {
        text: 'Sit in on the basement card game.',
        cond: (s) => roomOpen(s, 'cards'),
        goto: 'cards',
      },
      {
        text: 'Get in the water.',
        cond: (s) => roomOpen(s, 'swim'),
        goto: 'swim',
      },
      {
        text: 'Answer the chicken-fight draft.',
        cond: (s) => roomOpen(s, 'chicken'),
        goto: 'chicken',
      },
      {
        text: 'Claim a spot in the hot tub.',
        cond: (s) => roomOpen(s, 'hottub') && sp(s) >= 2,
        goto: 'hottub',
      },
      {
        text: 'Work the grill line.',
        cond: (s) => roomOpen(s, 'grill'),
        goto: 'grill',
      },
      {
        text: 'Take a turn at the telescope.',
        cond: (s) => roomOpen(s, 'telescope'),
        goto: 'telescope',
      },
      {
        text: 'Drift toward the guitar circle.',
        cond: (s) => roomOpen(s, 'acoustic'),
        goto: 'acoustic',
      },
      {
        text: 'Lean on the rail and take in the skyline crowd.',
        cond: (s) => roomOpen(s, 'skyline'),
        goto: 'skyline',
      },
      {
        text: 'Join the slow dance forming under the lights.',
        cond: (s) => roomOpen(s, 'slowdance'),
        goto: 'slowdance',
      },
      {
        text: 'The circle in the corner is playing truth or dare. Sit down.',
        cond: (s) => roomOpen(s, 'tod'),
        goto: 'tod',
      },
      // ---- static spine ----
      {
        text: 'Grab a drink.',
        cond: (s) => beats(s) < 4 && drinks(s) < 4,
        addVars: { drinks: 1 },
        goto: 'drink',
      },
      {
        text: 'Scan the crowd properly.',
        cond: (s) => kHere(s) && !spotted(s) && beats(s) < 4,
        setVars: { kSpotted: true },
        goto: 'spotK',
      },
      {
        text: 'Scan the crowd properly.',
        cond: (s) => (!kHere(s) || spotted(s)) && !done(s, 'scan') && beats(s) < 4,
        setVars: { done_scan: true },
        goto: 'scanRoom',
      },
      {
        text: 'Find your host.',
        cond: (s) => !done(s, 'dex') && beats(s) < 4,
        goto: 'dex',
      },
      // ---- Krystalle arc entries (progressive, no repeats) ----
      {
        text: 'Go to her.',
        cond: (s) => spotted(s) && kphase(s) === 0,
        setVars: { kphase: 1 },
        goto: 'kApproach',
      },
      {
        text: 'Find Krystalle one more time before the night ends.',
        cond: (s) => spotted(s) && kphase(s) === 2 && !done(s, 'klater'),
        setVars: { done_klater: true },
        goto: 'kLater',
      },
      // ---- late-night events (spice-gated) ----
      {
        text: 'Midnight. Priya kills the pool lights and the deck starts counting down — the traditional plunge.',
        cond: (s) => L(s) === 'pool' && sp(s) >= 3 && beats(s) >= 3 && !done(s, 'dip'),
        setVars: { done_dip: true },
        goto: 'dip',
      },
      // ---- wind-down ----
      {
        text: 'One last lap before you go.',
        cond: (s) => beats(s) >= 4 && kHere(s) && !spotted(s),
        setVars: { kSpotted: true },
        goto: 'spotLate',
      },
      {
        text: 'Call it a night.',
        judge: {
          pass: (s) => !!s.scene!.date && spotted(s) && m(s).interest >= 60,
          onPass: 'leaveSeen',
          onFail: 'leaveSolo',
        },
      },
    ],
  },

  // ======================================================== DRINKS
  drink: {
    id: 'drink',
    text: (s) => {
      const d = drinks(s);
      const menu: Record<string, string[]> = {
        frat: [
          'The jungle juice is a color not found in nature. It tastes like fruit punch with a criminal record.',
          'Round two of the jungle juice. A brother nods at you with deep respect and zero recognition.',
          'Three deep. The jungle juice has started narrating your thoughts in its own voice — loud, agreeable, wrong.',
          'You consider a fourth and even the jungle juice seems concerned.',
        ],
        pool: [
          'Something frozen from Priya’s blender station, garnished like it won an award.',
          'Second frozen thing. The brain freeze is somehow worth it every time.',
          'Third round and the pool lights have begun to strobe gently on their own. That’s you. You’re the strobe.',
          'The blender is unplugged “for everyone’s good,” Priya says, looking at you.',
        ],
        rooftop: [
          'Wine, in a mug that says WORLD’S OKAYEST LANDLORD. It’s good wine. It’s a good mug.',
          'The mug refills. The skyline improves correspondingly.',
          'Third mug. You have opinions about the moon now and they are urgent.',
          'Noor swaps your mug for tea without breaking eye contact or conversation.',
        ],
        house: [
          'Something citrusy and overconfident from Dex’s “bar,” which is an ironing board.',
          'Round two from the ironing board. The bartender is a stranger who has decided you two are best friends.',
          'Three in. Your stories are gaining length and losing structure.',
          'The ironing-board bartender cuts you off with surprising professionalism.',
        ],
      };
      return menu[L(s)][Math.min(d - 1, 3)];
    },
    choices: [
      {
        text: 'Back to the night.',
        cond: (s) => drinks(s) <= 2,
        effects: { momentum: 4, mood: 3 },
        goto: 'flow',
      },
      {
        text: 'Back to the night — carefully.',
        cond: (s) => drinks(s) >= 3,
        effects: { momentum: -6, comfort: -6, mood: 2 },
        goto: 'flow',
      },
    ],
  },

  // ======================================================== SCANNING
  spotK: {
    id: 'spotK',
    text: (s) => {
      const where: Record<string, string> = {
        frat: 'and then, impossibly, through a doorway of chanting strangers: Krystalle — cropped jacket, high-waist jeans, holding a red cup she is visibly not drinking from, judging a dance-off with the gravity of an Olympic official.',
        pool: 'and then you see her at the pool\u2019s far edge: Krystalle — emerald one-piece, denim shorts, sunglasses pushed up into her hair, mid-argument with a beach ball\u2019s owner about pool rules she is inventing on the spot.',
        rooftop: 'and then, near the rail: Krystalle — wrap dress, someone\u2019s borrowed blanket around her shoulders like a cape, pointing at the skyline and misnaming buildings for an audience of three.',
        house: 'and then the crowd shifts by the big window and there she is: Krystalle — leather jacket over something soft, holding court in a half-circle, hands drawing the story in the air.',
      };
      return 'You do a slow lap with your cup as cover \u2014 ' + where[L(s)] + ' She hasn\u2019t seen you. The night just changed shape.';
    },
    mood: 'neutral',
    choices: [
      { text: 'Go to her now.', setVars: { kphase: 1 }, goto: 'kApproach' },
      {
        text: 'Not yet \u2014 let the night build first. Timing is a skill.',
        effects: { momentum: 2 },
        goto: 'flow',
      },
    ],
  },
  spotLate: {
    id: 'spotLate',
    text: (s) =>
      L(s) === 'pool'
        ? 'One last lap of the deck \u2014 and there, wrapped in a towel by the shallow end, hair dripping: Krystalle. She\u2019s been here the whole time. The night suddenly has ten minutes left and a lot to do with them.'
        : 'One last lap \u2014 and there she is, jacket on, saying her goodbyes near the door. Krystalle. Here the whole time, and you\u2019ve got the length of one goodbye to matter in.',
    mood: 'neutral',
    choices: [
      { text: 'Catch her before she goes.', setVars: { kphase: 1 }, goto: 'kApproach' },
      { text: 'Let it be a story about timing.', goto: 'leaveSolo' },
    ],
  },
  scanRoom: {
    id: 'scanRoom',
    text: (s) => {
      const flavor: Record<string, string> = {
        frat: 'You take inventory: the pong dynasty defending its banner, the keg line self-organizing, a philosophy major explaining the stock market to a ficus.',
        pool: 'You take inventory: the diving board bracket, the grill diplomacy, two people falling in love over sunscreen logistics, one man asleep on a flamingo.',
        rooftop: 'You take inventory: the guitar\u2019s slow orbit, the telescope queue, a couple slow-dancing to a song only they can hear \u2014 there is always exactly one such couple.',
        house: 'You take inventory: kitchen factions, hallway confessions, the record lounge\u2019s lamplight congregation.',
      };
      return flavor[L(s)] + ' A party is a menu with worse lighting.';
    },
    next: 'flow',
    nextLabel: 'Pick something',
  },

  // ======================================================== THE HOST
  dex: {
    id: 'dex',
    text: (s) => {
      const hostBit: Record<string, string> = {
        frat: 'You find Dex coaching Tanner \u2014 Sigma Rho\u2019s social chair \u2014 through a hosting crisis involving ice, a bathtub, and the concept of consequences. Dex throws an arm around you mid-sentence.',
        pool: 'You find Dex holding court from a deck chair while Priya actually runs everything. He gestures at the entire pool like he built it.',
        rooftop: 'You find Dex helping Noor relight candle jars, narrating each one like a documentary. He hands you a lighter as if you\u2019ve enlisted.',
        house: 'You find Dex refereeing a dispute about ice with genuine statesmanship. He throws an arm around you like you\u2019ve survived something together.',
      };
      return hostBit[L(s)];
    },
    choices: [
      {
        text: '\u201cWho\u2019s here tonight? Give me the map.\u201d',
        cond: (s) => kHere(s) && !spotted(s),
        setVars: { kSpotted: true, done_dex: true },
        goto: 'dexPointsK',
      },
      {
        text: '\u201cWho\u2019s here tonight? Give me the map.\u201d',
        cond: (s) => !kHere(s) || spotted(s),
        setVars: { done_dex: true },
        goto: 'dexMap',
      },
      {
        text: 'Talk shop \u2014 Dex knows everyone\u2019s managers, including yours.',
        check: {
          stat: 'intelligence',
          label: 'Talk shop smart',
          dc: 12,
          onWin: 'dexShopWin',
          onLose: 'dexShopLose',
          winEffects: { performance: 8, mood: 4 },
          loseEffects: {},
        },
        setVars: { done_dex: true },
      },
    ],
  },
  dexPointsK: {
    id: 'dexPointsK',
    text: (s) => {
      const point: Record<string, string> = {
        frat: '\u201cDance-off judging table,\u201d Dex says instantly, reading your scan. \u201cKrystalle. Been disqualifying people for twenty minutes. Nobody knows what the rules are. Go before she retires undefeated.\u201d',
        pool: 'Dex tips his kebab toward the far edge of the water. \u201cKrystalle. Deep-end jurisdiction. She threw Tanner\u2019s flip-flop in the pool for a crime she won\u2019t name. Go pay your respects.\u201d',
        rooftop: 'Dex points with a candle jar. \u201cRail, north side. Krystalle\u2019s been renaming the skyline all night. The bank tower is now \u2018Gerald.\u2019 Go, before all the good buildings are taken.\u201d',
        house: 'Dex runs the guest list like a tour guide \u2014 \u201cbike people by the stereo, nurses by the window\u2014\u201d and your brain snags on nurses. He follows your look and grins enormously. \u201cWindow. Scooter story, ten minutes in. Go, before the ending.\u201d',
      };
      return point[L(s)];
    },
    mood: 'neutral',
    choices: [
      { text: 'Go.', setVars: { kphase: 1 }, goto: 'kApproach' },
      { text: 'Circle the long way. Build suspense.', effects: { momentum: 2 }, goto: 'flow' },
    ],
  },
  dexMap: {
    id: 'dexMap',
    text: 'Dex gives you the full sociology: which cluster is coworkers, which is exes maintaining a demilitarized zone, which stranger is \u201cbasically famous on the local subreddit.\u201d Useful. Mostly untrue. Excellent delivery.',
    next: 'flow',
    nextLabel: 'Armed with lore',
  },
  dexShopWin: {
    id: 'dexShopWin',
    text: 'You end up deep in supply-chain talk \u2014 espresso margins, the oat-milk cartel \u2014 and you hold your own with actual numbers. Dex looks impressed, which he does for everyone, and then thoughtful, which he does for almost no one. \u201cI\u2019m telling Marco you said that.\u201d',
    next: 'flow',
    nextLabel: 'That\u2019ll help at work',
  },
  dexShopLose: {
    id: 'dexShopLose',
    text: 'You attempt an opinion about wholesale pricing and Dex pats your shoulder mid-sentence, which is how he ends conversations he loves you too much to finish.',
    next: 'flow',
    nextLabel: 'Fair',
  },

  // ======================================================== PONG (house/frat)
  pong: {
    id: 'pong',
    text: (s) => {
      if (L(s) === 'frat') {
        return spotted(s)
          ? 'The Sigma Rho pong table is a sanctioned arena \u2014 bracket on a whiteboard, a heckling section. You get drafted, and the crowd, sensing narrative, drafts Krystalle onto the opposing team. She cracks her knuckles like a safecracker.'
          : 'The Sigma Rho pong table has a bracket, a commissioner, and a heckling section with flashcards. You\u2019re up.';
      }
      return spotted(s)
        ? 'The dining-room pong table needs a challenger and the crowd volunteers you. Worse \u2014 or better \u2014 Krystalle gets drafted to the opposing side by popular demand, rolling up her sleeves with theatrical menace.'
        : 'The pong table hums with quiet, respectful violence. The reigning team has a hand-drawn banner. You\u2019re offered the next slot.';
    },
    kLine: (s) => (spotted(s) ? '\u201cNo mercy, superstar. Biscuit will hear of your defeat.\u201d' : ''),
    choices: [
      {
        text: 'Play it straight \u2014 clean arc, steady hand.',
        check: {
          stat: 'fitness',
          label: 'The clutch shot',
          dc: 12,
          onWin: 'pongWin',
          onLose: 'pongLose',
          winEffects: { interest: 6, momentum: 10, mood: 4 },
          winFlags: ['confident'],
          loseEffects: { momentum: -4 },
        },
        setVars: { done_pong: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Call your shot. Behind the back. The crowd demands legend.',
        check: {
          stat: 'charm',
          label: 'The legend attempt',
          dc: 16,
          onWin: 'pongLegend',
          onLose: 'pongFlop',
          winEffects: { interest: 10, momentum: 16, mood: 6 },
          winFlags: ['confident', 'funny'],
          loseEffects: { momentum: -8, interest: -3 },
          loseFlags: ['tryhard'],
        },
        setVars: { done_pong: true },
        addVars: { beats: 1 },
      },
      {
        text: 'The table votes: STRIP PONG rules. Loser sheds a layer per cup.',
        cond: (s) => L(s) === 'frat' && sp(s) >= 3,
        goto: 'stripPong',
      },
    ],
  },
  stripPong: {
    id: 'stripPong',
    text: (s) =>
      spotted(s)
        ? 'The whiteboard commissioner amends the bracket with a marker flourish: STRIP RULES. The heckling section goes feral. Krystalle \u2014 opposing team \u2014 removes exactly one earring and sets it down like a poker chip, which somehow constitutes a full psychological victory before the first throw.'
        : 'The whiteboard commissioner amends the bracket: STRIP RULES. The heckling section produces, from nowhere, a kazoo. Stakes have never been higher or dumber.',
    choices: [
      {
        text: 'Play. Win. Keep your dignity and your shirt.',
        check: {
          stat: 'fitness',
          label: 'Strip pong, high stakes',
          dc: 14,
          onWin: 'stripWin',
          onLose: 'stripLose',
          winEffects: { interest: 8, momentum: 14, mood: 6 },
          winFlags: ['confident', 'sexy'],
          loseEffects: { momentum: -4 },
        },
        setVars: { done_pong: true },
        addVars: { beats: 1 },
      },
      {
        text: '\u201cI respect the institution too much to play it drunk.\u201d Bow out with a joke.',
        effects: { momentum: 2 },
        flags: ['funny'],
        setVars: { done_pong: true },
        addVars: { beats: 1 },
        goto: 'stripOut',
      },
    ],
  },
  stripWin: {
    id: 'stripWin',
    text: (s) =>
      spotted(s)
        ? 'You run the table. Opposing players surrender hats, one shoe, a novelty tie somebody was inexplicably wearing \u2014 and you finish untouched. Krystalle retrieves her earring with narrowed eyes and genuine, reluctant applause.'
        : 'You run the table. The other side surrenders hats, a shoe, and a novelty tie. You finish untouched, and the kazoo plays you off like royalty.',
    kLine: (s) => (spotted(s) ? '\u201cUndefeated AND fully clothed. Insufferable. Noted in the file with a star.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Retire a legend',
  },
  stripLose: {
    id: 'stripLose',
    text: (s) =>
      spotted(s)
        ? 'The dynasty is merciless. Cup by cup: your watch, your shoes, and finally \u2014 to a stadium roar \u2014 your shirt, which is hoisted onto the banner pole like a captured flag. Krystalle has both hands over her mouth, cackling, phone conspicuously NOT out, which you will later understand was mercy.'
        : 'The dynasty is merciless. Watch, shoes, and finally your shirt, which ascends the banner pole to a stadium roar. Strangers salute you. The kazoo plays taps.',
    kLine: (s) => (spotted(s) ? '\u201cGood news: you lost with honor. Bad news: there is a POLE involved now.\u201d' : ''),
    choices: [
      {
        text: 'Own it. Shirtless is a lifestyle now.',
        setOutfit: { player: 'p-shirtless' },
        judge: {
          pass: (s) => s.stats.fitness >= 5,
          onPass: 'stripOwnGood',
          onFail: 'stripOwnMeh',
        },
      },
      {
        text: 'Demand the rematch. Double or nothing — winner takes the pole.',
        setOutfit: { player: 'p-shirtless' },
        check: {
          stat: 'fitness',
          label: 'Double or nothing',
          dc: 15,
          onWin: 'stripRedeem',
          onLose: 'stripBottom',
          winEffects: { interest: 8, momentum: 12, mood: 6 },
          winFlags: ['confident', 'sexy'],
          loseEffects: { momentum: -4 },
        },
      },
    ],
  },
  stripRedeem: {
    id: 'stripRedeem',
    text: (s) =>
      spotted(s)
        ? 'Down goes the dynasty. You run six cups clean, reclaim your shirt from the banner pole to a standing ovation, and put it on with the slow ceremony of a knight re-armoring. Krystalle is on a chair leading the chant, which is your name, which is a lot to process.'
        : 'Down goes the dynasty. You reclaim your shirt from the pole to a standing ovation and re-dress with full ceremony. The kazoo attempts a fanfare. The whiteboard now just says LEGEND.',
    kLine: (s) => (spotted(s) ? '“COMEBACK OF THE SEASON. The file is now a shrine. I have concerns about the file.”' : ''),
    choices: [
      {
        text: 'Retire forever at the summit.',
        setOutfit: { player: '$default' },
        goto: 'flow',
      },
    ],
  },
  stripBottom: {
    id: 'stripBottom',
    text: (s) =>
      spotted(s)
        ? 'The rematch is a massacre. Cup by cup the table takes its tax until you are standing in your boxers under the string lights while the commissioner, with genuine gravity, drapes a beach towel over your shoulders like a title belt. You are somehow still not the most underdressed person here — a streaker chose this exact moment to cross the lawn in nothing but a captain’s hat, to thunderous applause, pursued at a light jog by campus security. Krystalle has fully given up on composure; she is wheezing into her cup, one hand extended toward you in something between apology and applause.'
        : 'The rematch is a massacre. You end up in your boxers under the string lights, towel-caped by the commissioner like defeated royalty — and are immediately upstaged by a streaker crossing the lawn in nothing but a captain’s hat, pursued at a light jog by campus security. The party awards him the win. Fair.',
    kLine: (s) => (spotted(s) ? '“I want you to know—” wheeze “—that you lost to a HOUSE. A literal fraternity. And STILL placed second-worst-dressed. Tonight has been incredible.”' : ''),
    choices: [
      {
        text: 'Take a bow. Wear the towel-cape like it was the plan all along.',
        setOutfit: { player: 'p-boxers' },
        judge: {
          pass: (s) => !spotted(s) || m(s).interest >= 55,
          onPass: 'stripBottomK',
          onFail: 'stripBottomOof',
        },
      },
    ],
  },
  stripBottomK: {
    id: 'stripBottomK',
    text: (s) =>
      spotted(s)
        ? 'You bow. The lawn loses it. And here is the strange arithmetic of a spice-three party: losing everything with total commitment plays better than winning carefully ever could. Krystalle crosses over, straightens your towel-cape with mock solemnity, and pats it flat.'
        : 'You bow. The lawn loses it. Three strangers pledge allegiance to the cape. For the rest of the night you are “the double-or-nothing guy,” said with respect.',
    kLine: (s) =>
      spotted(s)
        ? '“Superstar. Listen to me. This is the hardest I’ve laughed in a calendar year.” A beat, quieter, adjusting the cape one more time than it needed: “The confidence is doing you more favors than the shirt did. Don’t tell the shirt.”'
        : '',
    next: 'flow',
    nextLabel: 'Reign, capewise',
  },
  stripBottomOof: {
    id: 'stripBottomOof',
    text: 'You bow; the lawn cheers; the bow is fine. But across the yard the math is different — some nights the towel-cape reads as legend, and some nights it reads as a man who didn’t know when to fold. Her laughter is real, and it is also the laughter you give a stranger’s misadventure, and you can hear the difference from here.',
    next: 'flow',
    nextLabel: 'Colder now, in several ways',
  },
  stripOwnGood: {
    id: 'stripOwnGood',
    text: (s) =>
      spotted(s)
        ? 'The gym hours, it turns out, were for this exact moment. You carry it off with enough shrug that the loss reads as a flex. Krystalle\u2019s laughter downshifts into something one degree quieter, which the file will show she did not plan.'
        : 'The gym hours were apparently for this exact moment. You carry it off. Two strangers ask about your routine.',
    kLine: (s) => (spotted(s) ? '\u201cOkay. Well. The pole keeps the shirt, them\u2019s the rules.\u201d She is not looking at the pole.' : ''),
    next: 'flow',
    nextLabel: 'Onward, breezily',
  },
  stripOwnMeh: {
    id: 'stripOwnMeh',
    text: 'You own it the way one owns a losing lottery ticket \u2014 publicly and with jokes. It mostly works. The night is forgiving; the temperature is not.',
    next: 'flow',
    nextLabel: 'Onward, goosebumped',
  },
  stripOut: {
    id: 'stripOut',
    text: 'The commissioner grants you honorable discharge. The kazoo plays something respectful. A freshman takes your slot and loses his shirt in four minutes.',
    next: 'flow',
    nextLabel: 'The institution endures',
  },
  pongWin: {
    id: 'pongWin',
    text: (s) =>
      spotted(s)
        ? 'You sink the last cup with a shot so clean the table goes silent before erupting. Across the table Krystalle boos at maximum volume with a grin that undermines the whole performance.'
        : 'You sink the last cup clean. The dynasty falls. Someone updates the banner with genuine grief.',
    kLine: (s) => (spotted(s) ? '\u201cBOO. Boooo. Okay that was gorgeous, boo.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Retire undefeated',
  },
  pongLose: {
    id: 'pongLose',
    text: 'Rim, rim, floor. The crowd exhales in communal sympathy. The dynasty lives.',
    next: 'flow',
    nextLabel: 'A noble death',
  },
  pongLegend: {
    id: 'pongLegend',
    text: (s) =>
      spotted(s)
        ? 'Behind the back, no look \u2014 splash. The room detonates. Three people are already retelling it wrong. Krystalle has both hands on her head like she\u2019s witnessing a moon landing.'
        : 'Behind the back, no look \u2014 splash. The room detonates. You will never do that again in your life and it does not matter.',
    kLine: (s) => (spotted(s) ? '\u201cWHO taught you that?! Reyna could never. REYNA COULD NEVER.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Walk away in slow motion',
  },
  pongFlop: {
    id: 'pongFlop',
    text: 'You announce the trick shot loudly enough that the failure needs no announcement at all. The ball ends up in the guacamole. The guacamole\u2019s owner is gracious. It\u2019s worse that way.',
    next: 'flow',
    nextLabel: 'Live with it',
  },

  // ======================================================== KITCHEN (house)
  kitchen: {
    id: 'kitchen',
    text: (s) =>
      spotted(s)
        ? 'The kitchen has split into factions over whether a hotdog is a sandwich, and Krystalle \u2014 arrived before you, sleeves up \u2014 is running the debate like a supreme court. She spots you and points: \u201cFresh juror. Sworn in. Opinion, now.\u201d'
        : 'The kitchen has split into factions over whether a hotdog is a sandwich. Alliances have formed. A man in a paper crown bangs a spatula for order.',
    choices: [
      {
        text: 'Deliver an actual argument \u2014 structure, precedent, a devastating closing.',
        check: {
          stat: 'intelligence',
          label: 'The closing argument',
          dc: 13,
          onWin: 'kitchenWin',
          onLose: 'kitchenLose',
          winEffects: { interest: 8, momentum: 10, mood: 4 },
          winFlags: ['smart'],
          loseEffects: { momentum: -4 },
        },
        setVars: { done_kitchen: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Concede charmingly to whichever side Krystalle\u2019s on.',
        cond: (s) => spotted(s),
        effects: { comfort: 6, interest: 3, momentum: 4 },
        flags: ['nice'],
        setVars: { done_kitchen: true },
        addVars: { beats: 1 },
        goto: 'kitchenConcede',
      },
      {
        text: '\u201cWell, actually, by strict culinary taxonomy\u2014\u201d Correct everyone. At length.',
        effects: { interest: -5, momentum: -8, comfort: -4 },
        flags: ['boring'],
        setVars: { done_kitchen: true },
        addVars: { beats: 1 },
        goto: 'kitchenBore',
      },
    ],
  },
  kitchenWin: {
    id: 'kitchenWin',
    text: (s) =>
      spotted(s)
        ? 'You land the closer \u2014 \u201ca hotdog is a sandwich the way a ladder is furniture\u201d \u2014 and the kitchen LOSES it. Krystalle bangs the spatula. \u201cVerdict! VERDICT!\u201d She\u2019s looking at you like you just got more interesting.'
        : 'You land the closer \u2014 \u201ca hotdog is a sandwich the way a ladder is furniture\u201d \u2014 and the kitchen LOSES it. The spatula man declares you attorney general of the party.',
    kLine: (s) => (spotted(s) ? '\u201cObjection: that was better than it needed to be. Sustained anyway.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Rest your case',
  },
  kitchenLose: {
    id: 'kitchenLose',
    text: 'Your argument has a hole in it the size of a hotdog, and the opposing faction drives a bus through it. You are laughed out of the kitchen \u2014 warmly, but out.',
    next: 'flow',
    nextLabel: 'Appeal denied',
  },
  kitchenConcede: {
    id: 'kitchenConcede',
    text: 'You defect to her faction mid-argument, citing \u201cthe evidence, and also the judge.\u201d Cheap? Extremely. Effective? Her grin says the court accepts bribes.',
    kLine: '\u201cShameless. The court loves it. The court notes it, though.\u201d',
    next: 'flow',
    nextLabel: 'Noted is fine',
  },
  kitchenBore: {
    id: 'kitchenBore',
    text: 'You cite an actual food-classification standard and watch the fun leave the room like air from a valve. Somebody changes the subject to rent.',
    next: 'flow',
    nextLabel: 'You did this',
  },

  // ======================================================== DANCE (house/frat)
  dance: {
    id: 'dance',
    text: (s) => {
      const base =
        L(s) === 'frat'
          ? 'The living room is a mosh of questionable choreography \u2014 at this house the dance floor is a contact sport with a dress code of none.'
          : 'The living room found its second wind \u2014 somebody\u2019s cousin took over the queue and got it right.';
      return spotted(s)
        ? base + ' Krystalle\u2019s at the floor\u2019s edge, moving just enough to make standing still look like a decision.'
        : base + ' The floor is open and the crowd absorbs anyone who commits.';
    },
    choices: [
      {
        text: 'Pull her onto the floor.',
        cond: (s) => spotted(s),
        move: 'lightTouch',
        moveWin: 'danceK',
        moveLose: 'danceKNo',
        setVars: { done_dance: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Commit to the floor. Full send, zero irony.',
        check: {
          stat: 'fitness',
          label: 'The full send',
          dc: 12,
          onWin: 'danceWin',
          onLose: 'danceMeh',
          winEffects: { mood: 8, momentum: 10, interest: 4 },
          winFlags: ['confident'],
          loseEffects: { mood: 3, momentum: -3 },
        },
        setVars: { done_dance: true },
        addVars: { beats: 1 },
      },
    ],
  },
  danceK: {
    id: 'danceK',
    text: (s) =>
      (sp(s) >= 2
        ? 'She takes your hand and the floor makes room. The song is faster than sense; she\u2019s a shameless, joyful dancer, close and then away and then closer, laughing off beat on purpose.'
        : 'She takes your hand and the floor makes room the way floors do for people having more fun than everyone else. Two songs disappear.'),
    kLine: '\u201cOkay, you can move! This is going in the file. The file is getting thick, superstar.\u201d',
    mood: 'laughing',
    choices: [
      {
        text: 'Pull her in for the slow part of the song.',
        move: 'leanClose',
        moveWin: 'danceClose',
        moveLose: 'danceCloseNo',
      },
      {
        text: 'Finish big, bow, quit while immortal.',
        effects: { interest: 5, momentum: 8, mood: 5 },
        flags: ['funny'],
        goto: 'flow',
      },
    ],
  },
  danceKNo: {
    id: 'danceKNo',
    text: 'She lifts her cup \u2014 internationally recognized dance exemption \u2014 and awards your solo effort a judge\u2019s score of seven point five, hand-signaled.',
    kLine: '\u201cStrong start, shaky dismount. The Russian judge is being generous.\u201d',
    next: 'flow',
    nextLabel: 'Take the 7.5',
  },
  danceClose: {
    id: 'danceClose',
    text: 'The song drops to its slow bridge and she comes in close without ceremony \u2014 her hand finding your shoulder, the crowd blurring to bokeh. Neither of you talks over it.',
    mood: 'flushed',
    next: 'flow',
    nextLabel: 'Let the song end it',
  },
  danceCloseNo: {
    id: 'danceCloseNo',
    text: 'You reach for the slow-song moment and she spins out of it with a laugh \u2014 a move, technically, which is the kindest available no.',
    kLine: '\u201cBold DJ request. Denied on tempo grounds.\u201d',
    next: 'flow',
    nextLabel: 'Respect the tempo',
  },
  danceWin: {
    id: 'danceWin',
    text: 'You commit and the floor commits back. A stranger high-fives you mid-song for no articulable reason. This is the whole point of parties.',
    next: 'flow',
    nextLabel: 'Ride the high',
  },
  danceMeh: {
    id: 'danceMeh',
    text: 'You dance like a man assembling furniture, but with conviction, and conviction is most of dancing.',
    next: 'flow',
    nextLabel: 'Good enough',
  },

  // ======================================================== VINYL (house)
  vinyl: {
    id: 'vinyl',
    text: (s) =>
      spotted(s)
        ? 'The back bedroom is a record lounge \u2014 lamplight, crates, a turntable with a congregation. Krystalle\u2019s cross-legged on the rug, three albums deep in a crate, and when she pulls one sleeve out she actually gasps.'
        : 'The back bedroom is a record lounge \u2014 lamplight, crates, a turntable with a small serious congregation debating what plays next.',
    kLine: (s) => (spotted(s) ? '\u201cNo WAY. Dex has VST & Company?? Dex doesn\u2019t deserve this.\u201d' : ''),
    choices: [
      {
        text: '\u201cPlay it. Whatever it is, that reaction means it plays next.\u201d',
        cond: (s) => spotted(s),
        learn: 'opm',
        effects: { interest: 7, comfort: 8, momentum: 6 },
        flags: ['nice'],
        setVars: { done_vinyl: true },
        addVars: { beats: 1 },
        goto: 'vinylK',
      },
      {
        text: 'Talk records with the congregation \u2014 hold your own.',
        check: {
          stat: 'intelligence',
          label: 'Deep cuts',
          dc: 12,
          onWin: 'vinylWin',
          onLose: 'vinylLose',
          winEffects: { mood: 5, momentum: 6, interest: 4 },
          winFlags: ['smart'],
          loseEffects: { momentum: -3 },
        },
        setVars: { done_vinyl: true },
        addVars: { beats: 1 },
      },
    ],
  },
  vinylK: {
    id: 'vinylK',
    text: MEMORY_FACTS.opm.shareLine +
      ' The record crackles on and she narrates the whole first side \u2014 her dad\u2019s kitchen, the Sunday cleaning playlist, why the bassline matters. This is her room now, and you got the front-row seat by asking one right question.',
    mood: 'warm',
    next: 'flow',
    nextLabel: 'Side A ends too soon',
  },
  vinylWin: {
    id: 'vinylWin',
    text: 'You drop one genuinely obscure reference and the congregation parts like you flashed credentials. Twenty minutes of the good kind of nerd communion.',
    next: 'flow',
    nextLabel: 'Blessed by the aux priests',
  },
  vinylLose: {
    id: 'vinylLose',
    text: 'You confuse two bands the congregation considers opposites. The silence is brief but liturgical.',
    next: 'flow',
    nextLabel: 'Excommunicated, mildly',
  },

  // ======================================================== KEG (frat)
  keg: {
    id: 'keg',
    text: (s) =>
      sp(s) >= 3
        ? 'The keg line has evolved into a full ceremony \u2014 chants, a scoreboard, a brother with a stopwatch offering keg stands to anyone whose life choices are negotiable tonight.'
        : 'The keg line is Sigma Rho\u2019s DMV: slow, procedural, weirdly social. The man with the tap holds court like a bartender-priest.',
    choices: [
      {
        text: 'Take the keg stand. The stopwatch demands tribute.',
        cond: (s) => sp(s) >= 3,
        check: {
          stat: 'fitness',
          label: 'The keg stand',
          dc: 13,
          onWin: 'kegWin',
          onLose: 'kegLose',
          winEffects: { mood: 6, momentum: 12, interest: 4 },
          winFlags: ['confident'],
          loseEffects: { mood: -4, momentum: -6, comfort: -5 },
          loseFlags: ['tryhard'],
        },
        setVars: { done_keg: true },
        addVars: { beats: 1, drinks: 1 },
      },
      {
        text: 'Work the line \u2014 make friends with the tap priest.',
        effects: { mood: 5, momentum: 4 },
        flags: ['nice'],
        setVars: { done_keg: true },
        addVars: { beats: 1 },
        goto: 'kegSocial',
      },
    ],
  },
  kegWin: {
    id: 'kegWin',
    text: (s) =>
      spotted(s)
        ? 'Up, count, chant, DOWN \u2014 a respectable number, announced like a title fight decision. Across the room Krystalle gives you a slow golf clap that manages to be both mockery and applause, a genre she owns.'
        : 'Up, count, chant, down \u2014 a respectable number, announced like a title fight decision. The stopwatch brother writes it on the wall. You are, briefly, infrastructure.',
    next: 'flow',
    nextLabel: 'Descend a legend',
  },
  kegLose: {
    id: 'kegLose',
    text: 'The physics betray you almost immediately. There is foam. There is applause of the wrong kind. The stopwatch brother writes something on the wall you choose not to read.',
    next: 'flow',
    nextLabel: 'Towel off your pride',
  },
  kegSocial: {
    id: 'kegSocial',
    text: 'You hold cups, relay orders, learn the tap priest\u2019s life story (double major, one true love: this keg). By the end of the line you know half the party by name.',
    next: 'flow',
    nextLabel: 'Networked',
  },

  // ======================================================== CARDS (frat)
  cards: {
    id: 'cards',
    text: 'The basement holds a card game that predates everyone at the table \u2014 house rules only, stakes in quarters and errands. The dealer nods at the empty chair.',
    choices: [
      {
        text: 'Count cards politely. Play the odds, not the table.',
        check: {
          stat: 'intelligence',
          label: 'Play the odds',
          dc: 13,
          onWin: 'cardsWin',
          onLose: 'cardsLose',
          winEffects: { money: 25, mood: 5, momentum: 4 },
          winFlags: ['smart'],
          loseEffects: { money: -10 },
        },
        setVars: { done_cards: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Bluff enormous. Style over math.',
        check: {
          stat: 'charm',
          label: 'The enormous bluff',
          dc: 14,
          onWin: 'cardsBluff',
          onLose: 'cardsCaught',
          winEffects: { money: 40, momentum: 8, mood: 5 },
          winFlags: ['confident'],
          loseEffects: { money: -20, momentum: -5 },
        },
        setVars: { done_cards: true },
        addVars: { beats: 1 },
      },
    ],
  },
  cardsWin: {
    id: 'cardsWin',
    text: 'You fold twice, press once, and leave the table quietly up. The dealer tips an imaginary visor: recognition between professionals.',
    next: 'flow',
    nextLabel: 'Quit while ahead',
  },
  cardsLose: {
    id: 'cardsLose',
    text: 'The house rules contain a trap clause activated, apparently, by hubris. You pay in quarters and one future errand.',
    next: 'flow',
    nextLabel: 'Renegotiate later',
  },
  cardsBluff: {
    id: 'cardsBluff',
    text: 'You raise on nothing with the serenity of a monk and the table folds like laundry. You show the bluff, because legends require documentation.',
    next: 'flow',
    nextLabel: 'Collect and ascend',
  },
  cardsCaught: {
    id: 'cardsCaught',
    text: 'The dealer reads you like a large-print menu. The table keeps your quarters and, worse, starts calling you \u201cHollywood.\u201d',
    next: 'flow',
    nextLabel: 'Exit, Hollywood',
  },

  // ======================================================== SWIM (pool)
  swim: {
    id: 'swim',
    text: (s) =>
      spotted(s)
        ? 'The pool\u2019s main event is an argument about lane rights that Krystalle is refereeing from a flamingo floatie, gavel-ing with a pool noodle. She points the noodle at you: \u201cYou. Race the lane dispute. Winner gets the deep end.\u201d'
        : 'The water is perfect and the deep end is hosting informal races \u2014 two strokes of ceremony, then pure chaos.',
    choices: [
      {
        text: 'Dive in and race for the deep end.',
        check: {
          stat: 'fitness',
          label: 'The race',
          dc: 12,
          onWin: 'swimWin',
          onLose: 'swimLose',
          winEffects: { mood: 8, momentum: 10, interest: 5 },
          winFlags: ['confident'],
          loseEffects: { mood: 4, momentum: -2 },
        },
        setVars: { done_swim: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Cannonball. Form is temporary, splash is forever.',
        effects: { mood: 8, momentum: 8, interest: 3 },
        flags: ['funny'],
        setVars: { done_swim: true },
        addVars: { beats: 1 },
        goto: 'swimCannon',
      },
    ],
  },
  swimWin: {
    id: 'swimWin',
    text: (s) =>
      spotted(s)
        ? 'You touch the wall a full body-length ahead. The noodle gavel declares you Lord of the Deep End; Krystalle paddles the flamingo over to shake your hand with mock ceremony and real approval.'
        : 'You touch the wall a body-length ahead and inherit the deep end, a kingdom of one diving board and infinite prestige.',
    kLine: (s) => (spotted(s) ? '\u201cThe court recognizes the fastest man at this address. Don\u2019t let it go to your backstroke.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Reign wisely',
  },
  swimLose: {
    id: 'swimLose',
    text: 'You lose by a fingertip to a twelve-year-old visiting his aunt. He is gracious in victory, which is the worst part.',
    next: 'flow',
    nextLabel: 'The sea humbles all',
  },
  swimCannon: {
    id: 'swimCannon',
    text: (s) =>
      spotted(s)
        ? 'The splash radius is measured in casualties. Krystalle, caught in the spray zone, shrieks and awards it a furious perfect ten.'
        : 'The splash radius clears two deck chairs and earns a standing count from the diving board bracket. Perfect ten, one abstention (wet phone).',
    kLine: (s) => (spotted(s) ? '\u201cTEN. Ten and I\u2019m PRESSING CHARGES.\u201d Her hair is dripping. Her grin is enormous.' : ''),
    next: 'flow',
    nextLabel: 'Surface victorious',
  },

  // ======================================================== CHICKEN (pool)
  chicken: {
    id: 'chicken',
    text: (s) =>
      spotted(s)
        ? 'The chicken-fight bracket needs one more team, and the deck \u2014 sensing narrative again \u2014 chants until Krystalle wades over. \u201cFine! FINE. But I\u2019m on top and we are NOT losing to Priya.\u201d'
        : 'The chicken-fight bracket needs one more team. A stranger named Marcus, built like a jetty, volunteers to be your top half. Or bottom half. Negotiations are brief.',
    choices: [
      {
        text: 'Steady base, low center, win the bracket.',
        check: {
          stat: 'fitness',
          label: 'The chicken fight',
          dc: 13,
          onWin: 'chickenWin',
          onLose: 'chickenLose',
          winEffects: { interest: 8, comfort: 6, momentum: 10, mood: 6 },
          winFlags: ['confident'],
          loseEffects: { mood: 4, momentum: -3 },
        },
        setVars: { done_chicken: true },
        addVars: { beats: 1 },
      },
    ],
  },
  chickenWin: {
    id: 'chickenWin',
    text: (s) =>
      spotted(s)
        ? 'You hold the line through three rounds \u2014 her hands gripping your shoulders, her trash talk raining down like artillery \u2014 and when Priya\u2019s team finally topples, Krystalle vaults off your back into the water and surfaces with both fists up. High fives are exchanged underwater, where they are hardest.'
        : 'You and Marcus run the bracket like a military operation. The trophy is a pool noodle scepter. Marcus weeps, or it\u2019s pool water. Brotherhood either way.',
    kLine: (s) => (spotted(s) ? '\u201cWE\u2019RE UNDEFEATED. Retire with me, superstar \u2014 champions never do a rematch.\u201d' : ''),
    mood: 'laughing',
    next: 'flow',
    nextLabel: 'Retire undefeated',
  },
  chickenLose: {
    id: 'chickenLose',
    text: (s) =>
      spotted(s)
        ? 'Round two, Priya feints left and the whole tower goes over. You surface to Krystalle already laughing so hard she has to hold the pool edge \u2014 defeat, but the kind that becomes a favorite story by the retelling.'
        : 'Priya\u2019s team has a technique described only as \u201cthe windmill.\u201d You go down honorably. Marcus takes it hard.',
    kLine: (s) => (spotted(s) ? '\u201cWe were SABOTAGED. I want an inquiry. I want snacks first, then an inquiry.\u201d' : ''),
    next: 'flow',
    nextLabel: 'Demand the inquiry',
  },

  // ======================================================== HOT TUB (pool, spice 2+)
  hottub: {
    id: 'hottub',
    text: (s) => {
      if (spotted(s) && sp(s) >= 3)
        return 'The hot tub after dark is the deck\u2019s inner sanctum \u2014 steam, pool-glow, a rotating cast of four. A spot opens across from Krystalle just as you arrive, her hair up, shoulders bare above the waterline, the day\u2019s noise finally rinsed off her.';
      if (spotted(s))
        return 'The hot tub has become the quiet annex of the party. Krystalle\u2019s in the corner seat, towel-turbaned, holding a lime seltzer like a senator. She nods at the open spot beside her.';
      return 'The hot tub is where the party\u2019s philosophers have gathered to overheat gently and solve nothing.';
    },
    choices: [
      {
        text: 'Take the spot. Let the steam slow everything down.',
        cond: (s) => spotted(s),
        effects: { comfort: 8, momentum: 5, interest: 4 },
        setVars: { done_hottub: true, done_ktalk_bonus: true },
        addVars: { beats: 1 },
        goto: 'hottubK',
      },
      {
        text: 'Join the philosophers and overheat gently.',
        cond: (s) => !spotted(s),
        effects: { mood: 6, energy: 5 },
        setVars: { done_hottub: true },
        addVars: { beats: 1 },
        goto: 'hottubSolo',
      },
    ],
  },
  hottubK: {
    id: 'hottubK',
    text: (s) =>
      sp(s) >= 3
        ? 'The other bathers drift out one by one until the steam holds just the two of you, the pool glowing turquoise behind her. Conversation drops to a register that doesn\u2019t carry \u2014 slower, truer, punctuated by the water\u2019s small sounds. Her foot finds yours underwater. It does not apologize.'
        : 'The tub\u2019s chatter mellows around you two. She narrates the day\u2019s deck politics with senatorial gravity, seltzer as gavel, her knee resting against yours under the water like it isn\u2019t news.',
    choices: [
      {
        text: 'Close the distance in the steam.',
        cond: (s) => sp(s) >= 3,
        move: 'leanClose',
        moveWin: 'hottubClose',
        moveLose: 'hottubCloseNo',
      },
      {
        text: 'Match the register. Trade the low, true versions of the day.',
        effects: { comfort: 8, interest: 6 },
        flags: ['nice'],
        goto: 'flow',
      },
    ],
  },
  hottubClose: {
    id: 'hottubClose',
    text: 'You drift to her side of the tub and she makes room by not moving at all. Shoulder to shoulder in the steam, the party a rumor beyond the water line. \u201cHi,\u201d she says, at a volume meant for a distance this small.',
    mood: 'flushed',
    next: 'flow',
    nextLabel: 'Stay until the timer jets stop',
  },
  hottubCloseNo: {
    id: 'hottubCloseNo',
    text: 'You start the drift and she raises one eyebrow above the waterline \u2014 a border checkpoint. \u201cThe steam moves fast,\u201d she says. \u201cThe steam can slow down.\u201d',
    next: 'flow',
    nextLabel: 'The steam slows down',
  },
  hottubSolo: {
    id: 'hottubSolo',
    text: 'The philosophers induct you mid-debate (topic: whether fish know about rain). You contribute one theory, receive two compliments and a mild headrush, and exit poached and wiser.',
    next: 'flow',
    nextLabel: 'Poached and wiser',
  },

  // ================================================ MIDNIGHT PLUNGE (pool, spice 3)
  dip: {
    id: 'dip',
    text: (s) =>
      spotted(s)
        ? 'The underwater lights die and the pool goes black-glass under the moon. A whoop travels the deck; towels are staked; the countdown starts at ten and the first swimsuits are already landing on deck chairs by seven. It’s the Marlowe’s worst-kept tradition and tonight it has quorum. Krystalle stands at the edge of the countdown crowd, arms crossed, grinning at the whole institution — unreadable, for once, about her own plans.'
        : 'The underwater lights die and the pool goes black-glass under the moon. A whoop travels the deck; the countdown starts at ten, and the first swimsuits are already landing on deck chairs by seven. The Marlowe’s worst-kept tradition has quorum tonight.',
    choices: [
      {
        text: 'Join the plunge. When in Rome — and Rome is counting down.',
        check: {
          stat: 'fitness',
          label: 'Commit at “three”',
          dc: 10,
          onWin: 'dipIn',
          onLose: 'dipIn',
          winEffects: { mood: 8, momentum: 10 },
          winFlags: ['confident'],
          loseEffects: { mood: 6, momentum: 6 },
        },
        setOutfit: { player: 'p-towel' },
      },
      {
        text: 'Catch her eye across the countdown. This one’s a two-person decision.',
        cond: (s) => spotted(s) && dating(s),
        judge: {
          pass: (s) => s.k.stage >= 3 && m(s).comfort >= 68,
          onPass: 'dipTogether',
          onFail: 'dipDecline',
        },
      },
      {
        text: '“C’mon, everyone’s going in—” Press her toward the water.',
        cond: (s) => spotted(s),
        effects: { comfort: -12, interest: -4, momentum: -8 },
        flags: ['tryhard'],
        addVars: { beats: 1 },
        goto: 'dipPressed',
      },
      {
        text: 'Hold towels for the brave. Every tradition needs civilians.',
        effects: { comfort: 4, mood: 4 },
        flags: ['nice'],
        addVars: { beats: 1 },
        goto: 'dipWatch',
      },
    ],
  },
  dipIn: {
    id: 'dipIn',
    text: (s) =>
      spotted(s) && dating(s) && s.k.stage >= 3 && m(s).comfort >= 68
        ? 'You go in at “one” with the pack — cold shock, moon-white bubbles, the surface closing overhead like a held breath. When you come up, the pool is all voices and dark water, clothes abandoned on twenty deck chairs, everything below the surface the water’s business and no one else’s. And two arm-lengths away, hair slicked back and grinning like she got away with something: Krystalle. She made her own call at “four,” apparently. Her earrings are still on. Nothing else is the moon’s concern.'
        : 'You go in at “one” with the pack — cold shock, moon-white bubbles, the whole deck’s clothes abandoned on chairs, the water keeping everyone’s counsel below the surface. You surface into a pool of laughing silhouettes and instantly understand the tradition: it isn’t about daring. It’s about how the city looks from water level with the lights off.',
    kLine: (s) =>
      spotted(s) && dating(s) && s.k.stage >= 3 && m(s).comfort >= 68
        ? '“Don’t make it a thing, superstar.” Her voice is low and bright over the water. “The moon and I have an understanding. You can be in on it.”'
        : '',
    choices: [
      {
        text: 'Float on your back and let the tradition explain itself.',
        effects: { mood: 8, comfort: 6, interest: 4 },
        addVars: { beats: 1 },
        goto: 'dipAfter',
      },
      {
        text: 'Drift closer to her in the dark water.',
        cond: (s) => spotted(s) && dating(s) && s.k.stage >= 3 && m(s).comfort >= 68,
        move: 'leanClose',
        moveWin: 'dipClose',
        moveLose: 'dipCloseNo',
        addVars: { beats: 1 },
      },
    ],
  },
  dipTogether: {
    id: 'dipTogether',
    text: 'She holds your look through “six” and “five,” and then — a decision arriving visibly, like weather — she laughs once at herself, hands her drink to a stranger, and tips her head toward the far end, away from the cannonball chaos. The two of you slip into the deep-end dark at “one” while the shallow end explodes. Her clothes end on the chair with her jacket; the water takes the rest of it into its confidence. What the moon gets is shoulders and collarbones and her slicked-back hair; what you get is her laugh, lower than usual, carrying across two feet of black water, and the understanding that she is exactly this spontaneous and has simply been waiting for the night to earn it.',
    kLine: '“Okay,” she breathes, treading close, city lights doubled in the water between you. “Two truths: this was MY idea the second Priya touched the lights. And you were always getting invited. I just wanted to watch you do the math first.”',
    mood: 'flushed',
    choices: [
      {
        text: 'Close the two feet of black water.',
        move: 'kiss',
        moveWin: 'dipKiss',
        moveLose: 'dipCloseNo',
        addVars: { beats: 1 },
      },
      {
        text: 'Stay at arm’s length and just be in on it with her — the moon, the water, the whole conspiracy.',
        effects: { comfort: 10, interest: 8, momentum: 6 },
        flags: ['confident'],
        addVars: { beats: 1 },
        goto: 'dipAfter',
      },
    ],
  },
  dipKiss: {
    id: 'dipKiss',
    text: 'Treading water makes it clumsy and the clumsiness makes it better — her hand finding your shoulder for ballast, both of you half-laughing into it, the cold of the water and the warmth of the kiss filing separate reports. The shallow-end chaos is a city away. When you separate she stays close, forehead to yours, both of you keeping each other afloat in the technical and every other sense.',
    kLine: '“Cold water,” she says, against your cheek, in the voice of a scientist falsifying her own data. “That’s all this is. Extremely cold water.”',
    mood: 'flushed',
    next: 'dipAfter',
    nextLabel: 'Until your teeth chatter',
  },
  dipClose: {
    id: 'dipClose',
    text: 'You drift; she lets you arrive. Shoulder to shoulder in the dark water, heads tipped back at the same patch of sky, the pool holding the two of you like a secret it intends to keep. Nobody performs anything. It’s the quietest place the party has.',
    mood: 'flushed',
    next: 'dipAfter',
    nextLabel: 'The cold wins eventually',
  },
  dipCloseNo: {
    id: 'dipCloseNo',
    text: 'She reads the drift and backstrokes one easy stroke out of range, grinning, a boundary drawn in dark water with total good humor.',
    kLine: '“Moon rules, superstar: everybody floats their own float. Tonight the water is a co-op, not a couple thing.”',
    next: 'dipAfter',
    nextLabel: 'Respect the co-op',
  },
  dipAfter: {
    id: 'dipAfter',
    text: (s) =>
      spotted(s) && dating(s) && s.k.stage >= 3 && m(s).comfort >= 68
        ? 'Out, eventually, when the shivering files a formal complaint — towels grabbed from the stack, hers wrapped to the collarbone and turbaned with expert speed, yours worn like a matador. You sit on the deck edge side by side, feet still in the black water, sharing the towel-warmth and a stranger’s abandoned bag of chips, steam rising off the hot tub crowd across the deck. Her shoulder is against yours and stays there.'
        : 'Out, eventually, when the shivering wins — the deck a flapping chaos of towels and triumphant re-dressing, everyone suddenly best friends the way only shared bad ideas manage. Someone starts a round of applause for the pool itself. It deserves it.',
    kLine: (s) =>
      spotted(s) && dating(s) && s.k.stage >= 3 && m(s).comfort >= 68
        ? '“For the file,” she says, watching the water settle, “tonight goes in the section I don’t show people.” She bumps your shoulder. “You’re in a lot of that section lately.”'
        : '',
    next: 'flow',
    nextLabel: 'The night, warmer now',
  },
  dipDecline: {
    id: 'dipDecline',
    text: 'She catches your look, reads the invitation in it, and answers with a cheerful lifeguard’s headshake — then confiscates your towel to hold, which is somehow both a no and a promotion.',
    kLine: '“Go! Represent us. I did the plunge in June, I have tenure. I’ll judge your form from here — the moon and I are on a break.”',
    choices: [
      {
        text: 'Go in with the pack, then — she’s holding your towel, after all.',
        setOutfit: { player: 'p-towel' },
        effects: { mood: 6, momentum: 6, interest: 3 },
        flags: ['confident'],
        addVars: { beats: 1 },
        goto: 'dipIn',
      },
      {
        text: 'Stay dry with her instead. The countdown can have the others.',
        effects: { comfort: 8, interest: 4 },
        flags: ['nice'],
        addVars: { beats: 1 },
        goto: 'dipWatch',
      },
    ],
  },
  dipPressed: {
    id: 'dipPressed',
    text: 'It lands exactly as badly as every version of this sentence has ever landed at every pool since pools began. She doesn’t even stop smiling — she just plants her feet a half-inch more deliberately, and the temperature between you drops faster than the water would have.',
    kLine: '“Funny thing about ‘everyone,’” she says, light as a closing door. “It’s a word people use when they’ve stopped asking about *someone.* I’m good right here.”',
    next: 'flow',
    nextLabel: 'Walk that back slowly',
  },
  dipWatch: {
    id: 'dipWatch',
    text: (s) =>
      spotted(s)
        ? 'The plunge detonates without you — a moonlit churn of noise and dark water. You and she work the towel stack like pit crew, wrapping shivering swimmers as they climb out, her doing triage-nurse efficiency jokes the whole time. It is, weirdly, a great way to spend a countdown: warm, dry, and laughing at the same chaos from the same square meter.'
        : 'The plunge detonates without you. You work the towel stack like pit crew, wrapping the shivering as they climb out, collecting three new friends and one marriage proposal (retracted upon warming). Civilization needs its civilians.',
    kLine: (s) => (spotted(s) ? '“We’re the emergency services of this party and I feel GREAT about it.”' : ''),
    next: 'flow',
    nextLabel: 'The deck steams gently',
  },

  // ======================================================== GRILL (pool)
  grill: {
    id: 'grill',
    text: 'The grill is short-staffed and long-lined. The tongs are offered to you the way a falling king offers a crown.',
    choices: [
      {
        text: 'Take the tongs. Feed the people.',
        effects: { mood: 6, momentum: 4, interest: 3 },
        flags: ['nice'],
        setVars: { done_grill: true },
        addVars: { beats: 1 },
        goto: 'grillRun',
      },
      {
        text: 'Improvise a signature item from what\u2019s left in the cooler.',
        check: {
          stat: 'intelligence',
          label: 'Cooler engineering',
          dc: 12,
          onWin: 'grillWin',
          onLose: 'grillLose',
          winEffects: { mood: 6, interest: 5, momentum: 6 },
          winFlags: ['smart'],
          loseEffects: { mood: -2 },
        },
        setVars: { done_grill: true },
        addVars: { beats: 1 },
      },
    ],
  },
  grillRun: {
    id: 'grillRun',
    text: (s) =>
      spotted(s)
        ? 'You run the grill like a service window \u2014 orders called back, buns toasted, no casualties. Krystalle materializes in line, accepts a perfectly turned kebab, and inspects you over it. \u201cCompetence,\u201d she says, \u201cat a PARTY. Rare and troubling.\u201d'
        : 'You run the grill like a service window. The line moves; the people are fed; Priya declares you deck staff emeritus. Two strangers owe you their afternoons.',
    next: 'flow',
    nextLabel: 'Hang up the tongs',
  },
  grillWin: {
    id: 'grillWin',
    text: 'From cooler scraps you engineer a grilled-pineapple situation that develops a line of its own. Somebody photographs it. Priya asks for the recipe; you invent units on the spot.',
    next: 'flow',
    nextLabel: 'Trademark pending',
  },
  grillLose: {
    id: 'grillLose',
    text: 'The experimental item fuses to the grate and enters legend as \u201cthe incident.\u201d Priya relieves you of the tongs with the gentleness of a hostage negotiator.',
    next: 'flow',
    nextLabel: 'Witness protection',
  },

  // ======================================================== TELESCOPE (rooftop)
  telescope: {
    id: 'telescope',
    text: (s) =>
      spotted(s)
        ? 'The telescope queue has become a small planetarium lecture, currently hostage to a man being wrong about Saturn. Krystalle is next in line, visibly composing an objection.'
        : 'The telescope points at the sky; its queue points at a man being confidently wrong about Saturn.',
    choices: [
      {
        text: 'Correct the Saturn guy \u2014 kindly, precisely, fatally.',
        check: {
          stat: 'intelligence',
          label: 'Saturn, actually',
          dc: 12,
          onWin: 'telescopeWin',
          onLose: 'telescopeLose',
          winEffects: { interest: 8, momentum: 8, mood: 4 },
          winFlags: ['smart'],
          loseEffects: { momentum: -4 },
        },
        setVars: { done_telescope: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Skip the debate. Aim the telescope at the city instead of the sky.',
        effects: { mood: 5, momentum: 5, interest: 4 },
        flags: ['funny'],
        setVars: { done_telescope: true },
        addVars: { beats: 1 },
        goto: 'telescopeCity',
      },
    ],
  },
  telescopeWin: {
    id: 'telescopeWin',
    text: (s) =>
      spotted(s)
        ? 'You dismantle the Saturn thesis in three sentences, gently enough that he thanks you. Behind you, Krystalle mouths a silent, delighted \u201cfinally,\u201d and bumps your fist with hers like a co-conspirator collecting a debt.'
        : 'You dismantle the Saturn thesis so gently he thanks you for it. The queue applauds with their eyebrows.',
    next: 'flow',
    nextLabel: 'Justice for Saturn',
  },
  telescopeLose: {
    id: 'telescopeLose',
    text: 'You engage the Saturn guy on the merits and discover he has infinite stamina and a podcast. The queue disperses. The moon watches, neutral.',
    next: 'flow',
    nextLabel: 'Retreat to open sky',
  },
  telescopeCity: {
    id: 'telescopeCity',
    text: (s) =>
      spotted(s)
        ? 'You swing the telescope down to the streets \u2014 a man walking six dogs, a rooftop argument two buildings over, a cat patrolling a fire escape. A narration forms; a small audience forms around it; Krystalle joins mid-broadcast and starts producing the segment, feeding you leads. \u201cDog man is turning LEFT. This changes everything.\u201d'
        : 'You swing the telescope down to the streets and narrate the city \u2014 the six-dog man, the fire-escape cat. A small audience forms. This is journalism now.',
    next: 'flow',
    nextLabel: 'Sign off the broadcast',
  },

  // ======================================================== ACOUSTIC (rooftop)
  acoustic: {
    id: 'acoustic',
    text: (s) =>
      spotted(s)
        ? 'The guitar completes its orbit and lands, catastrophically, in your hands. The circle waits. Krystalle, cross-legged on a blanket at the edge of the lamplight, props her chin on her fist: this should be good.'
        : 'The guitar completes its orbit and lands in your hands. The circle waits with the patience of people who have already heard three bad Wonderwalls.',
    choices: [
      {
        text: 'Play the one song you actually know \u2014 all the way, no apologies.',
        check: {
          stat: 'charm',
          label: 'The one song',
          dc: 13,
          onWin: 'acousticWin',
          onLose: 'acousticMeh',
          winEffects: { interest: 9, momentum: 10, comfort: 5, mood: 5 },
          winFlags: ['confident'],
          loseEffects: { momentum: -3, mood: 2 },
        },
        setVars: { done_acoustic: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Pass it along \u2014 but request the song the night deserves.',
        effects: { mood: 5, comfort: 5, momentum: 4 },
        flags: ['nice'],
        setVars: { done_acoustic: true },
        addVars: { beats: 1 },
        goto: 'acousticPass',
      },
    ],
  },
  acousticWin: {
    id: 'acousticWin',
    text: (s) =>
      spotted(s)
        ? 'You play it plain and honest, voice low, no performance in it \u2014 which up here is the whole performance. The circle hums the last chorus with you. When you look up, Krystalle isn\u2019t producing a bit or composing a heckle. She\u2019s just listening, blanket pulled tight, eyes reflecting candle jars.'
        : 'You play it plain and honest, and the rooftop does the rest \u2014 the hum, the skyline, the candle jars. The circle asks for one more; you decline correctly.',
    mood: 'warm',
    next: 'flow',
    nextLabel: 'Pass the guitar while ahead',
  },
  acousticMeh: {
    id: 'acousticMeh',
    text: 'The chorus escapes you twice but the rooftop is generous \u2014 someone harmonizes over the wreckage and the song limps home to warm applause.',
    next: 'flow',
    nextLabel: 'Pass the guitar',
  },
  acousticPass: {
    id: 'acousticPass',
    text: 'You hand it to the girl who\u2019s been air-fretting for ten minutes and request \u201cwhatever you\u2019ve been practicing.\u201d She detonates the rooftop. Correct call, credited to you.',
    next: 'flow',
    nextLabel: 'Producer credit',
  },

  // ======================================================== SKYLINE (rooftop)
  skyline: {
    id: 'skyline',
    text: (s) =>
      spotted(s)
        ? 'The rail crowd is renaming buildings. Krystalle has already rechristened the bank tower \u201cGerald\u201d and is taking nominations for the opera house. She hands you the imaginary gavel: \u201cNew judge. I recuse myself. Gerald was nepotism.\u201d'
        : 'The rail crowd is renaming the skyline building by building. The bank tower is now \u201cGerald.\u201d This is apparently load-bearing lore.',
    choices: [
      {
        text: 'Rename the opera house something perfect.',
        check: {
          stat: 'charm',
          label: 'The naming',
          dc: 12,
          onWin: 'skylineWin',
          onLose: 'skylineMeh',
          winEffects: { interest: 7, momentum: 10, mood: 4 },
          winFlags: ['funny'],
          loseEffects: { momentum: -3 },
        },
        setVars: { done_skyline: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Ask the rail crowd what they\u2019d change about the city, actually.',
        effects: { comfort: 6, interest: 4, mood: 4 },
        flags: ['smart'],
        setVars: { done_skyline: true },
        addVars: { beats: 1 },
        goto: 'skylineDeep',
      },
    ],
  },
  skylineWin: {
    id: 'skylineWin',
    text: (s) =>
      spotted(s)
        ? 'Your nomination lands so cleanly the rail crowd ratifies it by acclaim, and Krystalle overturns her own recusal to second it. The opera house has a new name now. The city will not be informed.'
        : 'Your nomination passes by acclaim. The opera house has a new name now, known to eleven people forever.',
    next: 'flow',
    nextLabel: 'The map is redrawn',
  },
  skylineMeh: {
    id: 'skylineMeh',
    text: 'Your nomination gets polite consideration and loses to \u201cBeyonc\u00e9 (the building).\u201d Democracy is imperfect.',
    next: 'flow',
    nextLabel: 'Respect the vote',
  },
  skylineDeep: {
    id: 'skylineDeep',
    text: (s) =>
      spotted(s)
        ? 'The question lands deeper than the game did \u2014 the rail crowd goes quiet and then honest: rent, the river, the buses. Krystalle talks about the hospital\u2019s neighborhood, what it needs, who shows up for it. She catches you listening \u2014 really listening \u2014 and files it.'
        : 'The question flips the game into something quieter and better \u2014 rent, the river, the hours between buses. The rail crowd disperses closer than it gathered.',
    next: 'flow',
    nextLabel: 'The city glitters on',
  },

  // ======================================================== SLOW DANCE (rooftop)
  slowdance: {
    id: 'slowdance',
    text: (s) =>
      spotted(s)
        ? 'The guitar finds a slow one and the rooftop pairs off under the lights \u2014 the couple who came together, the couple who might leave together, the host dancing with a broom for comedy. Krystalle is at the edge of it, swaying on her own, blanket-caped, watching the lights.'
        : 'The guitar finds a slow one and the rooftop pairs off. Standing this one out is allowed but conspicuous.',
    choices: [
      {
        text: 'Offer her your hand, palm up. No line. Just the hand.',
        cond: (s) => spotted(s),
        move: 'leanClose',
        moveWin: 'slowdanceK',
        moveLose: 'slowdanceKNo',
        setVars: { done_slowdance: true },
        addVars: { beats: 1 },
      },
      {
        text: 'Dance with the broom host\u2019s abandoned broom. Commit utterly.',
        effects: { mood: 6, momentum: 6, interest: 3 },
        flags: ['funny'],
        setVars: { done_slowdance: true },
        addVars: { beats: 1 },
        goto: 'slowdanceBroom',
      },
    ],
  },
  slowdanceK: {
    id: 'slowdanceK',
    text: 'She looks at the hand, then at you, and sets the blanket on the rail like a flag being lowered. The dance is small \u2014 a slow orbit under string lights, her temple near your jaw, the guitar doing all the talking. The city below has the decency not to honk once.',
    mood: 'flushed',
    next: 'flow',
    nextLabel: 'The song ends; the orbit doesn\u2019t, quite',
  },
  slowdanceKNo: {
    id: 'slowdanceKNo',
    text: 'She squeezes the offered hand once and returns it \u2014 the blanket stays on. \u201cNext slow one,\u201d she says, and the way she says it makes it a real appointment rather than an exit.',
    next: 'flow',
    nextLabel: 'Hold the appointment',
  },
  slowdanceBroom: {
    id: 'slowdanceBroom',
    text: (s) =>
      spotted(s)
        ? 'You dip the broom at the bridge. The rooftop loses it. Krystalle laughs so hard the blanket cape slides off, and when the song ends she awards the broom a rose that is actually a churro.'
        : 'You dip the broom at the bridge and the rooftop loses it. The broom gets a standing ovation. You accept on its behalf.',
    next: 'flow',
    nextLabel: 'Retire the broom',
  },

  // ======================================================== TRUTH OR DARE
  // Every party has the circle somewhere. Three rounds, always forward. The
  // prompts scale with the party's spice level, and if Krystalle is in the
  // circle the game knows it \u2014 including a kiss dare that still has to get
  // past HER, not just the crowd.
  tod: {
    id: 'tod',
    text: (s) => {
      const where: Record<string, string> = {
        frat: 'The circle convenes on the relocated couch \u2014 a bottle, a shoebox of folded dares, and a chairman who takes the office far too seriously.',
        pool: 'The circle forms on towels at the shallow end, feet in the water, a waterproof speaker keeping time.',
        rooftop: 'The circle assembles on blankets between candle jars, voices low, the skyline eavesdropping.',
        house: 'The circle claims the hallway rug \u2014 a bottle from the recycling, a jury of strangers, immediate bylaws.',
      };
      const spiceNote =
        sp(s) === 1
          ? ' House rules tonight: keep it silly, keep it kind.'
          : sp(s) === 2
            ? ' House rules tonight: secrets are currency and cowardice is taxed.'
            : ' House rules tonight, announced with a grin: no limits the group doesn\u2019t set, and the group is feeling brave.';
      const kNote = spotted(s)
        ? ' Krystalle is already IN the circle \u2014 of course she is \u2014 and pats the spot across from her with maximum menace.'
        : '';
      return where[L(s)] + spiceNote + kNote;
    },
    kLine: (s) => (spotted(s) ? '\u201cOh, he\u2019s playing. Everyone, he\u2019s playing. This is going to be excellent.\u201d' : ''),
    choices: [
      { text: 'Sit down. The bottle knows what it\u2019s doing.', goto: 'todR1' },
      {
        text: 'Watch one round from outside the blast radius, then get pulled in anyway.',
        effects: { comfort: 3 },
        goto: 'todR1',
      },
    ],
  },
  todR1: {
    id: 'todR1',
    text: (s) =>
      'The bottle does two theatrical orbits and stops on you. The circle inhales as one. The chairman\u2019s eyebrows ask the eternal question.' +
      (spotted(s) ? ' Krystalle mouths it with him: truth or dare.' : ''),
    choices: [
      { text: 'Truth.', goto: 'todTruth1' },
      { text: 'Dare.', goto: 'todDare1' },
    ],
  },

  // ---- round 1: truth ----
  todTruth1: {
    id: 'todTruth1',
    text: (s) =>
      sp(s) === 1
        ? 'The circle confers and delivers: \u201cMost embarrassing thing you\u2019ve done to impress someone.\u201d Gentle opener. The circle leans in anyway.'
        : sp(s) === 2
          ? 'The circle confers and delivers: \u201cLast lie you told, verbatim, and who caught you.\u201d Medium heat. The circle grins.'
          : 'The circle confers and delivers, with eye contact: \u201cBest kiss of your life. Details optional, honesty mandatory.\u201d' +
            (spotted(s) ? ' Somebody \u2014 a hero, a villain \u2014 glances at Krystalle. Krystalle examines her nails.' : ''),
    choices: [
      {
        text: 'Answer straight. The truth, told plainly, at karaoke volume.',
        effects: { comfort: 6, interest: 5, momentum: 4 },
        flags: ['nice'],
        goto: 'todTruth1Honest',
      },
      {
        text: 'Answer TRUE but make it a bit \u2014 timing, structure, a callback.',
        check: {
          stat: 'charm',
          label: 'Truth, but funny',
          dc: 12,
          onWin: 'todTruth1Funny',
          onLose: 'todTruth1Flat',
          winEffects: { interest: 7, momentum: 10 },
          winFlags: ['funny'],
          loseEffects: { momentum: -4 },
        },
      },
      {
        text: 'Deflect with a non-answer. Some doors stay shut.',
        effects: { momentum: -6, interest: -4 },
        flags: ['boring'],
        goto: 'todTruth1Dodge',
      },
    ],
  },
  todTruth1Honest: {
    id: 'todTruth1Honest',
    text: (s) =>
      sp(s) >= 3 && spotted(s)
        ? 'You tell it true and unglamorous \u2014 and you keep your eyes off Krystalle the whole time, which the circle notices, and which Krystalle notices the circle noticing. The chairman declares the answer \u201cdevastatingly sincere.\u201d Krystalle\u2019s nails have become very interesting to her.'
        : 'You tell it true and unglamorous, and the circle rewards honesty the way circles do \u2014 with a collective groan of recognition and one \u201coh no, same.\u201d',
    next: 'todR2',
    nextLabel: 'The bottle spins on',
  },
  todTruth1Funny: {
    id: 'todTruth1Funny',
    text: 'The true story arrives with load-bearing pauses and a callback to the chairman\u2019s own introduction. The circle pounds the floor. \u201cPOINT OF ORDER,\u201d someone weeps.',
    next: 'todR2',
    nextLabel: 'The bottle spins on',
  },
  todTruth1Flat: {
    id: 'todTruth1Flat',
    text: 'The bit needed one fewer draft or one more. The circle awards partial credit and a merciful topic change.',
    next: 'todR2',
    nextLabel: 'The bottle spins on',
  },
  todTruth1Dodge: {
    id: 'todTruth1Dodge',
    text: (s) =>
      'You give the non-answer. The circle boos with parliamentary procedure.' +
      (spotted(s) ? ' Krystalle\u2019s eyebrow files the dodge under a heading you can\u2019t read.' : ''),
    next: 'todR2',
    nextLabel: 'The bottle spins on',
  },

  // ---- round 1: dare ----
  todDare1: {
    id: 'todDare1',
    text: (s) => {
      if (sp(s) === 1)
        return 'The shoebox produces: \u201cDo the rest of this round in a dramatic movie-trailer voice.\u201d The circle is already delighted.';
      if (sp(s) === 2) {
        const d: Record<string, string> = {
          pool: 'The shoebox produces: \u201cBackflip off the diving board, or belly-flop trying.\u201d The circle is already standing.',
          frat: 'The shoebox produces: \u201cSerenade the keg. A full verse. It has feelings.\u201d',
          rooftop: 'The shoebox produces: \u201cDeclare your love to the skyline. Loudly. It\u2019s a good listener.\u201d',
          house: 'The shoebox produces: \u201cLet the circle redo your hairstyle. No mirror until morning.\u201d',
        };
        return d[L(s)];
      }
      const d3: Record<string, string> = {
        pool: 'The shoebox produces, to whoops: \u201cShirt in the pool. It stays there till the game ends.\u201d' ,
        frat: 'The shoebox produces, to a chant already forming: \u201cShirt on the banner pole. Contribute to the flag.\u201d',
        rooftop: 'The shoebox produces: \u201cSwap shirts with the person to your left for the rest of the night.\u201d The person to your left is a man named Gus, built like a different species.',
        house: 'The shoebox produces: \u201cShirt goes on the lamp. The lamp has earned it.\u201d',
      };
      return d3[L(s)];
    },
    choices: [
      {
        text: 'Do the dare. Fully. This is not a house of half measures.',
        judge: { pass: (s) => sp(s) >= 3, onPass: 'todDare1Shirt', onFail: 'todDare1Do' },
      },
      {
        text: 'Negotiate it down with charm \u2014 counteroffer something funnier.',
        check: {
          stat: 'charm',
          label: 'The counteroffer',
          dc: 13,
          onWin: 'todDare1Counter',
          onLose: 'todDare1Chicken',
          winEffects: { momentum: 8, interest: 5 },
          winFlags: ['funny'],
          loseEffects: { momentum: -6, interest: -3 },
          loseFlags: ['boring'],
        },
      },
    ],
  },
  todDare1Do: {
    id: 'todDare1Do',
    text: (s) => {
      if (sp(s) === 1)
        return 'IN A WORLD, you begin, WHERE ONE MAN SITS IN A CIRCLE \u2014 and the round proceeds entirely in trailer voice, which improves everything, especially the chairman\u2019s rulings.';
      const d: Record<string, string> = {
        pool: 'The backflip is \u2014 charitably \u2014 a flip. The impact is heard at street level. You surface to a 10, an 8, and one card that just says OW. Worth it.',
        frat: 'You serenade the keg with real feeling. The keg says nothing, which in this house counts as being moved. Three brothers join the final chorus on their knees.',
        rooftop: 'You declare your love to the skyline at full volume. A window lights up two buildings over. It flickers \u2014 twice. The skyline loves you back.',
        house: 'The circle descends on your hair with clips and theories. You emerge as \u201ca Renaissance prince, if he lost a bet.\u201d You wear it with dignity. It wears you back.',
      };
      return d[L(s)];
    },
    next: 'todR2',
    nextLabel: 'The circle approves',
  },
  todDare1Shirt: {
    id: 'todDare1Shirt',
    text: (s) =>
      spotted(s)
        ? 'The shirt comes off to a stadium reaction and goes where the dare demands. Cold? Yes. A retreat? Never. Krystalle applauds exactly three times, slow, then pointedly fans herself with a coaster in a way that is 60% bit.'
        : 'The shirt comes off to a stadium reaction and goes where the dare demands. Strangers salute. Somewhere, a kazoo.',
    choices: [
      {
        text: 'Carry it like a man who planned this.',
        setOutfit: { player: 'p-shirtless' },
        judge: { pass: (s) => s.stats.fitness >= 5, onPass: 'todShirtGood', onFail: 'todShirtMeh' },
      },
    ],
  },
  todShirtGood: {
    id: 'todShirtGood',
    text: (s) =>
      spotted(s)
        ? 'The gym hours report for duty. The circle\u2019s heckling dies into a brief, honest \u201coh.\u201d Krystalle\u2019s coaster-fanning drops to 40% bit.'
        : 'The gym hours report for duty. The circle\u2019s heckling dies into a brief, honest \u201coh.\u201d Two recruitment offers follow (beach volleyball, moving a couch).',
    next: 'todR2',
    nextLabel: 'Play on, shirtless',
  },
  todShirtMeh: {
    id: 'todShirtMeh',
    text: 'You carry it with jokes, which is its own kind of shape. The circle respects commitment over contour. The night is warm enough. Mostly.',
    next: 'todR2',
    nextLabel: 'Play on, breezy',
  },
  todDare1Counter: {
    id: 'todDare1Counter',
    text: 'Your counteroffer \u2014 objectively funnier, technically legal \u2014 passes the circle\u2019s vote by acclaim. You perform it. It becomes the reference dare for the rest of the game: \u201cokay but is it counteroffer good?\u201d',
    next: 'todR2',
    nextLabel: 'Precedent set',
  },
  todDare1Chicken: {
    id: 'todDare1Chicken',
    text: 'The counteroffer dies in committee. The circle smells retreat and invokes the coward\u2019s clause: you hold the shoebox for a round, which is somehow worse than any dare.',
    next: 'todR2',
    nextLabel: 'Hold the box of shame',
  },

  // ---- round 2: the circle turns on her (or on the chaos) ----
  todR2: {
    id: 'todR2',
    text: (s) => {
      if (!spotted(s))
        return 'The bottle moves on and the game escalates around the circle \u2014 a man eats a lime whole, a girl calls her ex \u201cjust to say the bridge is water under the bridge,\u201d the chairman rules it \u201cpoetry.\u201d Then the bottle finds its next victim, and the circle starts arguing about what to ask.';
      const q =
        sp(s) === 1
          ? 'The bottle stops on Krystalle. The circle, gently: \u201cMost trouble the scooter ever got you into.\u201d She\u2019s mid-story in four seconds, gesturing with somebody else\u2019s drink.'
          : sp(s) === 2
            ? 'The bottle stops on Krystalle. The circle smells blood: \u201cOkay \u2014 who HERE would you trust to drive Biscuit?\u201d A test with one right answer and twelve wrong ones. The circle looks at you. She looks at the ceiling.'
            : 'The bottle stops on Krystalle. A guy in a backwards cap \u2014 three drinks past his own judgment \u2014 grins around the circle: \u201cDare. Lap dance for the birthday boy. Full song, no skips.\u201d The laughter drops half a register; half the circle checks her face to see how it landed. She sets her cup down, unhurried, and looks straight at him. The smile stays on. The eyes above it don\u2019t.';
      return q;
    },
    choices: [
      {
        text: 'Let her handle it \u2014 she\u2019s the best show in the circle.',
        cond: (s) => spotted(s) && sp(s) <= 2,
        effects: { comfort: 5, interest: 4, momentum: 5 },
        goto: 'todR2Show',
      },
      {
        text: '\u201cNew dare: the ORIGINAL asker does it first. House rules.\u201d Redirect the circle, no lecture, all timing.',
        cond: (s) => spotted(s) && sp(s) >= 3,
        check: {
          stat: 'charm',
          label: 'The redirect',
          dc: 12,
          onWin: 'todR2Save',
          onLose: 'todR2SaveClumsy',
          winEffects: { comfort: 14, interest: 8 },
          winFlags: ['gentleman', 'nice'],
          loseEffects: { comfort: 6 },
        },
      },
      {
        text: 'Egg it on with the circle \u2014 it\u2019s all part of the game, right?',
        cond: (s) => spotted(s) && sp(s) >= 3,
        effects: { comfort: -16, interest: -8, momentum: -8 },
        flags: ['creep'],
        goto: 'todR2Egg',
      },
      {
        text: 'Watch the chaos round unfold and survive being collateral.',
        cond: (s) => !spotted(s),
        effects: { mood: 5, momentum: 4 },
        goto: 'todR2Chaos',
      },
    ],
  },
  todR2Show: {
    id: 'todR2Show',
    text: (s) =>
      sp(s) === 1
        ? 'The scooter story has four acts and a false ending. By the finale \u2014 Biscuit, a hill, a bishop somehow \u2014 the circle is wiped out and she takes a seated bow with someone else\u2019s drink raised.'
        : 'She answers the Biscuit-trust question with a full driving exam \u2014 posture requirements, a written portion, \u201cand NONE of you passed the vibe check, which is question one.\u201d The circle riots. Her eyes catch yours for half a second on \u201cnone,\u201d with an asterisk in them.',
    mood: 'laughing',
    next: 'todR3',
    nextLabel: 'The game rolls on',
  },
  todR2Save: {
    id: 'todR2Save',
    text: 'The redirect lands as pure game \u2014 no sermon, no spotlight on her, just house rules and comic justice. The asker balks at his own dare; the circle turns on him joyfully; the moment dissolves into noise. Under it, Krystalle exhales. Her eyes find you: that was surgery, and she watched every stitch.',
    kLine: '\u201cHouse rules,\u201d she repeats to the circle, approvingly. Quieter, to the space between you: \u201cNice hands, doctor.\u201d',
    mood: 'warm',
    next: 'todR3',
    nextLabel: 'The game rolls on',
  },
  todR2SaveClumsy: {
    id: 'todR2SaveClumsy',
    text: 'The redirect comes out one notch too earnest \u2014 the circle hears a lecture in it and boos on principle \u2014 but it works: the dare dies in committee. Krystalle\u2019s look says the style points were missed and the substance was not.',
    next: 'todR3',
    nextLabel: 'The game rolls on',
  },
  todR2Egg: {
    id: 'todR2Egg',
    text: 'You add your voice to the push, and hers is the only face you see change. She handles it \u2014 she was always going to handle it, a joke that beheads the dare and its asker in one motion \u2014 but something closes toward you specifically, with a click you feel in your teeth.',
    kLine: '\u201cAnyway,\u201d she says, to the circle, in a tone that has removed you from it.',
    mood: 'annoyed',
    next: 'todR3',
    nextLabel: 'The game limps on',
  },
  todR2Chaos: {
    id: 'todR2Chaos',
    text: 'The chaos round claims two phones and a friendship (recoverable). You survive by keeping your eyes down and your cup steady, the circle\u2019s equivalent of a hedgehog defense.',
    next: 'todR3',
    nextLabel: 'The bottle hunts again',
  },

  // ---- round 3: the closer ----
  todR3: {
    id: 'todR3',
    text: (s) => {
      if (sp(s) >= 3 && spotted(s) && !s.k.flags.creep)
        return 'Final round, and the bottle \u2014 spun by the chairman with the showmanship of a man who knows exactly what he\u2019s doing \u2014 stops on you. The circle confers for two seconds, which is how long it takes twelve people to agree on the obvious. \u201cDare,\u201d the chairman announces, \u201cwas not requested, and yet: kiss her. One kiss, circle as witness, no tongue unless the lady legislates otherwise.\u201d He points from you to Krystalle. The circle detonates.';
      if (sp(s) === 2)
        return 'Final round. The bottle finds you again \u2014 the chairman swears it\u2019s random \u2014 and the circle, mellowing toward last call, asks for a closer: \u201cBest night of this year. Go.\u201d';
      return 'Final round. The shoebox\u2019s last card is a group dare: the entire circle must howl at the moon/ceiling/skylight for ten seconds. It is, structurally, a treaty.';
    },
    choices: [
      {
        text: 'Look at her, not the circle. Make it a question she can answer either way.',
        cond: (s) => sp(s) >= 3 && spotted(s) && !s.k.flags.creep,
        move: 'kiss',
        moveWin: 'todKissYes',
        moveLose: 'todKissNo',
      },
      {
        text: '\u201cThe circle doesn\u2019t get this one.\u201d Decline the dare FOR her, before she has to.',
        cond: (s) => sp(s) >= 3 && spotted(s) && !s.k.flags.creep,
        effects: { comfort: 10, interest: 4 },
        flags: ['gentleman'],
        goto: 'todKissDeclined',
      },
      {
        text: 'Answer the closer honestly.',
        cond: (s) => sp(s) === 2,
        effects: { comfort: 6, interest: 5, mood: 4 },
        flags: ['nice'],
        goto: 'todCloser',
      },
      {
        text: 'Howl. Obviously. Howl.',
        cond: (s) => sp(s) === 1 || (sp(s) >= 3 && (!spotted(s) || s.k.flags.creep === true)),
        effects: { mood: 8, momentum: 6 },
        flags: ['funny'],
        goto: 'todHowl',
      },
    ],
  },
  todKissYes: {
    id: 'todKissYes',
    text: 'You make it a question. Her answer is to cross the circle \u2014 unhurried, eyes rolled for the audience, entirely sure \u2014 take your face in both hands, and kiss you properly while twelve strangers achieve liftoff. She sits back down like a senator returning from a vote.',
    kLine: '\u201cDare fulfilled,\u201d she tells the chairman, senatorial. To you, only mouthed: \u201cLater.\u201d',
    mood: 'flushed',
    next: 'todEnd',
    nextLabel: 'The circle will speak of this for years',
  },
  todKissNo: {
    id: 'todKissNo',
    text: 'You make it a question, and she answers it kindly and in full view: a hand to your jaw, a kiss pressed to her own two fingers and transferred to your cheek \u2014 theatrical enough to satisfy the circle, unmistakable enough to satisfy the truth. \u201cRain check,\u201d she announces, \u201cwitnessed and notarized.\u201d The circle, robbed, applauds anyway.',
    next: 'todEnd',
    nextLabel: 'Notarized is binding',
  },
  todKissDeclined: {
    id: 'todKissDeclined',
    text: 'You wave the dare off before it can put her on the spot \u2014 lightly, no speech, the game rolling past it in seconds. The chairman substitutes a howling clause. Krystalle studies you through the noise like a puzzle that just did something interesting.',
    kLine: (s) => (dating(s) ? '\u201cYou didn\u2019t have to do that,\u201d she says after, low. \u201cI know,\u201d you say. \u201cThat\u2019s the review,\u201d she says. \u201cFive stars.\u201d' : '\u201cInteresting,\u201d she says to her cup, in the voice of a woman updating a file.'),
    mood: 'warm',
    next: 'todEnd',
    nextLabel: 'The game winds down',
  },
  todCloser: {
    id: 'todCloser',
    text: (s) =>
      spotted(s)
        ? 'You answer the closer honestly, and if the best night of your year happens to feature someone in this circle, you decline to specify, and everyone \u2014 EVERYONE \u2014 specifies it for you with their eyebrows. Krystalle inspects the middle distance, freckles fighting a smile.'
        : 'You answer the closer honestly, and the circle receives it the way circles receive honesty at midnight: with a soft \u201cayyy\u201d and a toast of mismatched cups.',
    next: 'todEnd',
    nextLabel: 'To good nights',
  },
  todHowl: {
    id: 'todHowl',
    text: 'Ten seconds of full-throated communal howling. Dogs answer from three yards over. Someone\u2019s mother calls mid-howl and is placed, respectfully, on speaker. A perfect treaty, perfectly ratified.',
    next: 'todEnd',
    nextLabel: 'The treaty holds',
  },
  todEnd: {
    id: 'todEnd',
    text: 'The chairman adjourns the circle with a gavel that is a shoe. Members disperse into the party carrying new secrets, minor injuries, and the specific closeness of people who have howled together.',
    choices: [
      {
        text: 'Back into the night.',
        setVars: { done_tod: true },
        addVars: { beats: 1 },
        goto: 'flow',
      },
    ],
  },

  // ======================================================== KRYSTALLE ARC
  // Progressive chain: approach -> exchange one -> exchange two (new topics
  // only) -> a location moment -> late coda. Never the same beat twice.
  kApproach: {
    id: 'kApproach',
    text: (s) => {
      if (!s.k.met) {
        const v: Record<string, string> = {
          frat: 'You cross between chants. Up close: dark hair, freckles, a red cup used purely as a gavel. A stranger \u2014 the most interesting one in the building \u2014 disqualifying a dance-off contestant for \u201ccrimes of hubris.\u201d',
          pool: 'You wade the deck to the far edge. Up close: freckles under sunscreen, wet hair pushed back, an argument about invented pool law that she is winning against the ball\u2019s actual owner.',
          rooftop: 'You drift down the rail. Up close: blanket cape, mug of wine, freckles in candlelight, a skyline being renamed one building at a time for an audience of three.',
          house: 'You angle through the crowd to the window. Up close: dark hair, freckles, a laugh pulling the half-circle in tighter. She\u2019s landing the ending of a story about a scooter with a name.',
        };
        return v[L(s)];
      }
      if (!dating(s))
        return 'You cross to her and the story stops mid-gesture when she clocks you. Recognition, then a slow, delighted squint \u2014 caf\u00e9 guy, at large, again.';
      const v2: Record<string, string> = {
        frat: 'You cross to the judging table and she stands down from office immediately, grabbing your arm. \u201cFinally, a credible witness. These people have never seen footwork in their LIVES.\u201d',
        pool: 'She spots you mid-argument and abandons it entirely, wading over with the water\u2019s slow drama. \u201cYou\u2019re here! Good. I need backup, the beach ball lobby is strong.\u201d',
        rooftop: 'She sees you and lifts the blanket like a wing. \u201cThere you are. Get under, it\u2019s load-bearing. I\u2019ve renamed six buildings and I saved you the opera house.\u201d',
        house: 'She breaks off her own story when she sees you \u2014 grabs your wrist and pulls you into the half-circle like reclaiming luggage. \u201cThis is the guy,\u201d she announces, which you will replay later.',
      };
      return v2[L(s)];
    },
    kLine: (s) =>
      !s.k.met
        ? '\u201cYou\u2019ve been approaching for a while. Commit or orbit, those are the rules here.\u201d'
        : !dating(s)
          ? '\u201cThe universe has a group chat and it is CLEARLY gossiping about me.\u201d'
          : '',
    choices: [
      {
        text: 'Enter the bit mid-flight \u2014 riff like you were always part of it.',
        check: {
          stat: 'charm',
          label: 'Enter the bit',
          dc: 12,
          onWin: 'kRiffWin',
          onLose: 'kRiffLose',
          winEffects: { interest: 8, momentum: 12 },
          winFlags: ['funny'],
          loseEffects: { momentum: -5 },
        },
      },
      {
        text: 'Borrow her from the crowd \u2014 \u201cstealing the storyteller, official business.\u201d',
        move: 'lightTouch',
        moveWin: 'kAside',
        moveLose: 'kAsideNo',
      },
      {
        text: 'Take the audience seat and give the show its due.',
        effects: { comfort: 5, momentum: -2 },
        goto: 'kListen',
      },
    ],
  },
  kRiffWin: {
    id: 'kRiffWin',
    text: 'You tag in with a fabricated eyewitness account so committed the crowd takes your side of it. She gawps at the audacity, then yes-ands you without missing a beat, and the two of you land the ending as co-authors.',
    kLine: '\u201cHe wasn\u2019t even THERE. That\u2019s the worst part. That\u2019s the BEST part.\u201d',
    mood: 'laughing',
    next: 'kTalk1',
    nextLabel: 'The crowd disperses; she doesn\u2019t',
  },
  kRiffLose: {
    id: 'kRiffLose',
    text: 'You jump in a beat early and step on her punchline. The crowd laughs anyway, but she has to rebuild the landing, and it landed better in rehearsal.',
    kLine: '\u201cCo-authors get vetted, walk-on.\u201d Light \u2014 but the copyright office is watching you now.',
    next: 'kTalk1',
    nextLabel: 'Prove yourself in the paperwork',
  },
  kAside: {
    id: 'kAside',
    text: 'She lets herself be stolen \u2014 hands the crowd off to a lieutenant mid-sentence and follows you to the quiet edge of things, close enough that the party drops to backing track.',
    kLine: '\u201cOkay, thief. You have my attention. Limited engagement \u2014 use it well.\u201d',
    next: 'kTalk1',
    nextLabel: 'Use it well',
  },
  kAsideNo: {
    id: 'kAsideNo',
    text: 'The steal comes a notch too proprietary and she converts your hand into a co-gesturer for her story instead. You are a prop now. The crowd loves the prop.',
    kLine: '\u201c\u2014he does THIS, look\u2014\u201d she says, puppeting your arm. This is fine.',
    next: 'kTalk1',
    nextLabel: 'Serve with dignity',
  },
  kListen: {
    id: 'kListen',
    text: 'You take the edge seat and give the show a real audience. When the ending lands she finds your face inside the laugh \u2014 checking whether you\u2019re the kind who needs to be the show, or can enjoy one.',
    next: 'kTalk1',
    nextLabel: 'The circle loosens',
  },

  // ---- exchange one: pick a thread, each is its own branch ----
  kTalk1: {
    id: 'kTalk1',
    text: (s) => {
      const setting: Record<string, string> = {
        frat: 'You end up sharing the porch rail, the chants muffled behind glass, moths committing to the porch light.',
        pool: 'You end up at the pool\u2019s glowing edge, feet in the water, the deck\u2019s noise skimming past overhead.',
        rooftop: 'You end up sharing the north rail and one blanket\u2019s jurisdiction, the city doing its slow glitter below.',
        house: 'You end up in the hallway\u2019s quiet pocket, framed by coats, close enough to talk under the music.',
      };
      return setting[L(s)] + ' She turns toward you, unhurried. Pick a thread \u2014 it only gets pulled once.';
    },
    choices: [
      {
        text: '\u201cHardest shift this week. Go. I can take it.\u201d',
        setVars: { ktopic_work: true },
        goto: 'kTopicWork',
      },
      {
        text: '\u201cRank this party. Full review. Spare no one.\u201d',
        setVars: { ktopic_party: true },
        goto: 'kTopicParty',
      },
      {
        text: '\u201cTell me something true. Trade you mine for yours.\u201d',
        setVars: { ktopic_true: true },
        goto: 'kTopicTrue',
      },
    ],
  },
  kTopicWork: {
    id: 'kTopicWork',
    text: 'She tells you about the week \u2014 a seven-year-old who fought his IV like a knight, the vending machine that stole two dollars at 3 a.m., the small victory nobody claps for. She tells it funny because that\u2019s the container it survives in, and watches whether you can hear the heavy thing inside the funny thing.',
    kLine: '\u201cAnyway, he named the IV pole. Sir Drips-a-Lot. He\u2019s FINE, he went home Tuesday, stop making that face.\u201d',
    choices: [
      {
        text: '\u201cYou can put it down for one night. I\u2019ve got the watch.\u201d',
        effects: { comfort: 10, interest: 6 },
        flags: ['nice'],
        goto: 'kTalk2',
      },
      {
        text: 'Callback: \u201cSir Drips-a-Lot outranks Reyna the mic? Careful, she\u2019s vindictive.\u201d',
        callback: 'karaoke',
        goto: 'kTalk2cb',
      },
      {
        text: '\u201cI have this thing on my elbow, actually\u2014\u201d Present the elbow. Again or anew.',
        check: {
          stat: 'charm',
          label: 'Medical comedy',
          dc: 12,
          onWin: 'kTalk2funny',
          onLose: 'kTalk2flat',
          winEffects: { interest: 6, momentum: 10 },
          winFlags: ['funny'],
          loseEffects: { momentum: -5 },
        },
      },
    ],
  },
  kTopicParty: {
    id: 'kTopicParty',
    text: (s) => {
      const review: Record<string, string> = {
        frat: 'She delivers the Sigma Rho review like a war correspondent: \u201cAtmosphere: biblical. Beverage program: a crime scene. The chanting? Honestly? Elite. Two and a half stars, would evacuate again.\u201d',
        pool: '\u201cThe Marlowe review,\u201d she announces. \u201cWater temperature: divine. Towel politics: Byzantine. Priya\u2019s blender: the true host. Four stars, docked half for the beach ball lobby.\u201d',
        rooftop: '\u201cNoor\u2019s rooftop, reviewed: ambience weaponized, wine in mugs \u2014 correct, telescope guy \u2014 wrong about Saturn but committed. Four and a half stars. The city itself: carrying.\u201d',
        house: '\u201cThe Dex review: curation strong, ironing-board bar \u2014 iconic, the man himself \u2014 a golden retriever with a guest list. Four stars, one withheld for suspense.\u201d',
      };
      return review[L(s)] + ' She hands you the imaginary microphone: your rebuttal.';
    },
    choices: [
      {
        text: 'Deliver a rebuttal review of equal rigor \u2014 including of her judging.',
        check: {
          stat: 'charm',
          label: 'The rebuttal',
          dc: 13,
          onWin: 'kTalk2funny',
          onLose: 'kTalk2flat',
          winEffects: { interest: 8, momentum: 12 },
          winFlags: ['funny'],
          loseEffects: { momentum: -4 },
        },
      },
      {
        text: '\u201cStar withheld for suspense \u2014 so what earns the last star?\u201d',
        effects: { interest: 6, comfort: 5, momentum: 5 },
        flags: ['smart'],
        goto: 'kTalk2star',
      },
    ],
  },
  kTopicTrue: {
    id: 'kTopicTrue',
    text: 'You go first \u2014 that\u2019s the whole trick \u2014 something true and unflattering, told straight, no three-act structure. She listens with her head tipped, checking the seams for polish and finding none.',
    kLine: '\u201cYou went FIRST. People never go first.\u201d A beat while she decides something. Then she pays up: a real one \u2014 not a bit, the kind with a hospital in it, the kind she doesn\u2019t hand to circles.',
    mood: 'warm',
    choices: [
      {
        text: 'Hold it carefully. Ask the one right follow-up, then let it rest.',
        effects: { comfort: 12, interest: 8 },
        flags: ['nice'],
        goto: 'kTalk2',
      },
      {
        text: 'Match it with one more of yours \u2014 deeper, uninvited.',
        judge: { pass: (s) => m(s).comfort >= 55, onPass: 'kTalk2deep', onFail: 'kTalk2much' },
      },
    ],
  },

  // ---- bridges into exchange two ----
  kTalk2cb: {
    id: 'kTalk2cb',
    text: CALLBACK_LINES.karaoke + ' The thread pulls easily after that \u2014 rhinestone lore, ward gossip, the vending machine\u2019s crimes.',
    next: 'kTalk2',
    nextLabel: 'Keep pulling',
  },
  kTalk2funny: {
    id: 'kTalk2funny',
    text: 'It lands clean and she cracks fully open laughing \u2014 the whole-body one, the one that makes two strangers nearby smile at nothing. She wipes an eye with her wrist.',
    kLine: '\u201cOkay. OKAY. You\u2019re funnier at parties. Most people are worse. What is that.\u201d',
    mood: 'laughing',
    next: 'kTalk2',
    nextLabel: 'Ride the laugh forward',
  },
  kTalk2flat: {
    id: 'kTalk2flat',
    text: 'The bit stalls on the runway. She pats it kindly on the fuselage and moves the conversation to safer weather.',
    next: 'kTalk2',
    nextLabel: 'Safer weather',
  },
  kTalk2star: {
    id: 'kTalk2star',
    text: 'She considers the question with real jurisprudence. \u201cThe last star,\u201d she rules, \u201cis for the thing you can\u2019t book. The moment the night stops being an event and starts being a memory. Can\u2019t schedule it. You just notice it going by.\u201d She glances at you, quick audit. \u201cWhy, you seen one?\u201d',
    mood: 'warm',
    next: 'kTalk2',
    nextLabel: '\u201cMight be watching one.\u201d',
  },
  kTalk2deep: {
    id: 'kTalk2deep',
    text: 'You go again, deeper, and it holds \u2014 the conversation drops into that late-night register where sentences stop performing. She pulls her knees up, settled in for the version of you that doesn\u2019t come out at parties.',
    mood: 'warm',
    next: 'kTalk2',
    nextLabel: 'Stay down here a while',
  },
  kTalk2much: {
    id: 'kTalk2much',
    text: 'The second one is a step past where the night is standing. She receives it gently but the register resets \u2014 back up to party altitude, a little politer than a minute ago.',
    kLine: '\u201cBig one. Save some for the paid subscribers, yeah?\u201d',
    next: 'kTalk2',
    nextLabel: 'Back to altitude',
  },

  // ---- exchange two: only unpulled threads, or make the move to a moment ----
  kTalk2: {
    id: 'kTalk2',
    text: (s) => {
      const remaining =
        [!topicDone(s, 'work'), !topicDone(s, 'party'), !topicDone(s, 'true')].filter(Boolean).length;
      return remaining > 0
        ? 'The conversation breathes \u2014 a beat of comfortable quiet while the party churns somewhere else. There\u2019s more night left, and more of her, and the threads you haven\u2019t pulled are right there.'
        : 'The threads are all pulled and neither of you has moved. That\u2019s its own information. The night leans in to see what you do with it.';
    },
    choices: [
      {
        text: '\u201cHardest shift this week. Go. I can take it.\u201d',
        cond: (s) => !topicDone(s, 'work'),
        setVars: { ktopic_work: true },
        goto: 'kTopicWork',
      },
      {
        text: '\u201cRank this party. Full review. Spare no one.\u201d',
        cond: (s) => !topicDone(s, 'party'),
        setVars: { ktopic_party: true },
        goto: 'kTopicParty',
      },
      {
        text: '\u201cTell me something true. Trade you mine for yours.\u201d',
        cond: (s) => !topicDone(s, 'true'),
        setVars: { ktopic_true: true },
        goto: 'kTopicTrue',
      },
      {
        text: 'Steal her away from the party entirely \u2014 there\u2019s a better spot.',
        goto: 'kMoment',
      },
      {
        text: 'Give her back to her public \u2014 the night\u2019s still young and so is the file.',
        effects: { comfort: 4, momentum: 2 },
        setVars: { kphase: 2 },
        addVars: { beats: 1 },
        goto: 'flow',
      },
    ],
  },

  // ---- the location moment ----
  kMoment: {
    id: 'kMoment',
    text: (s) => {
      const v: Record<string, string> = {
        frat: 'The better spot is the porch swing around the side \u2014 chipped paint, chain creak, chants reduced to weather. She curls into her corner of it and pushes off with one foot, unhurried for the first time all night.',
        pool: 'The better spot is the deep end\u2019s far corner after the crowd migrates to the grill \u2014 the water glowing from below, steam coming off it into the night. She sits at the edge, feet in, and the party finally exhales.',
        rooftop: 'The better spot is the west corner past the planter boxes \u2014 no string lights, just city glow and the one blanket with jurisdiction. She shares it without negotiation, shoulder against yours.',
        house: 'The better spot is the little balcony off the back \u2014 two chairs, one string of lights, the bass reduced to a heartbeat through the wall. She steals your jacket by prior right and settles against the rail.',
      };
      return v[L(s)];
    },
    kLine: (s) =>
      dating(s)
        ? '\u201cGood extraction. Ten out of ten. The party was getting between us and the\u2014\u201d she gestures at everything and possibly you, \u201c\u2014this.\u201d'
        : '\u201cOkay, you found the spot. Points. The spot is doing a lot of work for you right now, I hope you know.\u201d',
    mood: 'warm',
    choices: [
      {
        text: 'Kiss her \u2014 the night has been building the case all evening.',
        cond: (s) => dating(s),
        move: 'kiss',
        moveWin: 'kMomentKiss',
        moveLose: 'kMomentKissNo',
      },
      {
        text: 'Closer \u2014 shoulder to shoulder, her space offered not taken.',
        move: 'leanClose',
        moveWin: 'kMomentClose',
        moveLose: 'kMomentCloseNo',
      },
      {
        text: '\u201cBefore the night swallows us \u2014 can I get your number?\u201d',
        cond: (s) => !dating(s),
        judge: { pass: NUMBER_JUDGE, onPass: 'kNumYes', onFail: 'kNumNo' },
      },
      {
        text: 'Let the spot do its work in silence for a while.',
        effects: { comfort: 8, interest: 5 },
        flags: ['nice'],
        goto: 'kAfter',
      },
    ],
  },
  kMomentKiss: {
    id: 'kMomentKiss',
    text: (s) => {
      const v: Record<string, string> = {
        frat: 'The porch swing stops its arc because she stopped it \u2014 foot down, turn, and she\u2019s kissing you before the chain finishes creaking, unhurried, the chants two rooms and one world away.',
        pool: 'She pulls you down to the pool edge by the wrist and kisses you with the water glowing beneath your feet \u2014 chlorine and warmth and the whole deck politely ceasing to exist.',
        rooftop: 'Under the blanket\u2019s jurisdiction she turns, city light on her freckles, and closes the distance herself \u2014 soft, sure, the skyline holding its breath on professional courtesy.',
        house: 'She sets the borrowed jacket\u2019s collar straight \u2014 hers now \u2014 takes a fistful of your shirt, and kisses you against the rail while the bass keeps the time.',
      };
      return v[L(s)];
    },
    kLine: '\u201cParties,\u201d she says eventually, to no one, approvingly.',
    mood: 'flushed',
    next: 'kAfter',
    nextLabel: 'Stay in the spot a while',
  },
  kMomentKissNo: {
    id: 'kMomentKissNo',
    text: 'She reads the lean at distance and intercepts with two fingers on your chest \u2014 a stop sign with good manners and, notably, no anger in it.',
    kLine: '\u201cNot out of the question. Out of SEQUENCE. Sequence matters, superstar.\u201d',
    next: 'kAfter',
    nextLabel: 'Respect the sequence',
  },
  kMomentClose: {
    id: 'kMomentClose',
    text: 'You close the space by offering it \u2014 and she takes the offer, settling against your shoulder like it was always furniture. The party hums on without either of you.',
    mood: 'flushed',
    next: 'kAfter',
    nextLabel: 'Hold still; hold on',
  },
  kMomentCloseNo: {
    id: 'kMomentCloseNo',
    text: 'She keeps her coordinates, friendly and fixed, and redirects with a story about the last person who tried the yawn-and-stretch at this very party, whose name is now legend and a warning.',
    next: 'kAfter',
    nextLabel: 'Heed the legend',
  },
  kNumYes: {
    id: 'kNumYes',
    text: 'She looks at you for a long moment \u2014 party light doing a slow carousel across her face \u2014 then holds out her palm for your phone like a toll collector.',
    kLine: '\u201cKrystalle. Two L\u2019s, don\u2019t abbreviate it. One opening text, graded harshly. Parties inflate everyone\u2019s numbers \u2014 the bar is HIGH tonight.\u201d',
    mood: 'warm',
    event: 'gotNumber',
    next: 'kAfter',
    nextLabel: 'Pocket the phone like it\u2019s made of glass',
  },
  kNumNo: {
    id: 'kNumNo',
    text: 'She winds her cup between her hands, friendly and final for tonight.',
    kLine: '\u201cMm \u2014 not yet. Impress me somewhere with worse lighting and better odds, and ask me again.\u201d',
    next: 'kAfter',
    nextLabel: 'Worse lighting. Noted.',
  },
  kAfter: {
    id: 'kAfter',
    text: (s) => {
      const v: Record<string, string> = {
        frat: 'Eventually a delegation finds you \u2014 the dance-off needs its judge, appeals are backing up. She surrenders to office with a sigh that fools no one.',
        pool: 'Eventually Priya\u2019s voice carries over the deck \u2014 towel arbitration, only Krystalle can be trusted. She stands, wrings out the night\u2019s hem, mock-bows.',
        rooftop: 'Eventually the guitar circle sends an envoy \u2014 they need her verse, apparently there\u2019s a verse that\u2019s hers now. She yields the blanket to you like a deed.',
        house: 'Eventually Dex\u2019s voice booms through the wall, auctioning the last slice, and she straightens \u2014 duty calls, the half-circle needs its center back.',
      };
      return v[L(s)];
    },
    choices: [
      {
        text: 'Watch her go. Rejoin the night with the file updated.',
        setVars: { kphase: 2 },
        addVars: { beats: 1 },
        goto: 'flow',
      },
    ],
  },
  kLater: {
    id: 'kLater',
    text: (s) =>
      m(s).interest >= 60
        ? 'Late in the night she finds YOU \u2014 materializes at your elbow with two glasses of water, hands you one, and clinks it like champagne. \u201cHydration toast. To tonight. It\u2019s making the highlight reel; I don\u2019t make the rules, I just cut the tape.\u201d'
        : 'Late in the night you cross paths once more by the drinks \u2014 a friendly orbit, a raised cup across the room, the night filed under \u2018fine\u2019 with a pencil, not a pen.',
    next: 'flow',
    nextLabel: 'The night rolls toward last call',
  },

  // ======================================================== ENDINGS
  leaveSeen: {
    id: 'leaveSeen',
    text: (s) => {
      const v: Record<string, string> = {
        frat: 'You make your exits \u2014 Tanner salutes, Dex demands the invented handshake back \u2014 and she peels off the party to walk you as far as the lawn, arms crossed against the small hours, in no hurry to end the sentence.',
        pool: 'The deck has gone to towels and blue glow. She walks you to the gate barefoot, flip-flops hooked on two fingers, hair drying wavy, the water still lapping its applause behind you.',
        rooftop: 'She walks you to the stairwell door and stands in it so it can\u2019t close \u2014 blanket caped, city humming below, the candle jars down to their last acts.',
        house: 'Dex demands a formal handshake at the door, and she walks you out to the stoop \u2014 the party\u2019s glow behind her, the night air sharp and quiet after all that noise.',
      };
      return v[L(s)];
    },
    kLine: (s) =>
      dating(s)
        ? '\u201cText me when you\u2019re home. Yes, still nosy. It\u2019s chronic. Goodnight, superstar.\u201d'
        : '\u201cGo, before the night ruins its own ending. This was a good chapter, window guy.\u201d',
    mood: 'warm',
    endScene: true,
  },
  leaveSolo: {
    id: 'leaveSolo',
    text: (s) =>
      kHere(s) && !spotted(s) && s.k.met
        ? 'You slip out into the cool air, ears ringing pleasantly. Halfway down the block your phone buzzes \u2014 Sam: \u201cu were at that party?? krystalle was there lol. u2 keep missing each other.\u201d You stare at the message for a while.'
        : shirtless(s)
          ? 'You slip out into the cool air \u2014 noticeably cool, given the shirt situation \u2014 with your dignity intact in the ways that count and absent in the ways that make the best stories.'
          : 'You slip out into the cool air, ears ringing pleasantly, the party\u2019s glow shrinking behind you window by window.',
    endScene: true,
  },
  crash: {
    id: 'crash',
    text: (s) => {
      const v: Record<string, string> = {
        frat: 'The party closes over the space where your evening was \u2014 she\u2019s back at the judging table, office resumed, and the chant swallows everything else.',
        pool: 'She\u2019s back across the water in the deck-chair parliament, and the pool between you might as well be zoned. Priya\u2019s look is not unkind. It is not kind.',
        rooftop: 'She\u2019s rejoined the rail crowd at the far corner \u2014 renamed buildings, new audience \u2014 and the rooftop, small as it is, has become a very large place.',
        house: 'The corner empties around you the way water finds a drain. She\u2019s across the room laughing with someone else at something that isn\u2019t you.',
      };
      return v[L(s)];
    },
    kLine: '\u201cEnjoy the party,\u201d she said, on her way past. Just that.',
    mood: 'annoyed',
    endScene: true,
  },
};

export const PARTY: Scene = {
  id: 'party',
  title: 'A Party',
  art: 'party',
  venueId: 'party',
  start: 'arrive',
  nodes: NODES,
};
