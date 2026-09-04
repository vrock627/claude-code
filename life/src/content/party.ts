// Dex's house party. Every party rolls its own personality: a vibe (chill or
// rowdy) and three of five possible "rooms" — so the choice list is different
// each time. Static spine choices (drink / scan / find Dex / leave) are always
// there and feed into the dynamic branches. Krystalle has a chance to be
// somewhere in the crowd; until you actually spot her, the game won't tell you.

import type { GameState, Scene } from '../engine/types';
import { CALLBACK_LINES, MEMORY_FACTS } from './krystalle';

const vibe = (s: GameState) => s.scene!.vars.vibe as string;
const rolled = (s: GameState, room: string) =>
  String(s.scene!.vars.rooms ?? '').includes(room);
const done = (s: GameState, room: string) => s.scene!.vars['done_' + room] === true;
const roomOpen = (s: GameState, room: string) => rolled(s, room) && !done(s, room);
const kHere = (s: GameState) => s.scene!.vars.kHere === true;
const spotted = (s: GameState) => kHere(s) && s.scene!.vars.kSpotted === true;
const drinks = (s: GameState) => Number(s.scene!.vars.drinks ?? 0);
const m = (s: GameState) => s.scene!.date!.meters;
const dating = (s: GameState) => s.k.hasNumber;

const NUMBER_JUDGE = (s: GameState) =>
  m(s).interest >= 52 && m(s).comfort >= 48 && m(s).momentum >= 30;

export const PARTY: Scene = {
  id: 'party',
  title: 'Dex’s House Party',
  art: 'party',
  venueId: 'party',
  start: 'arrive',
  nodes: {
    arrive: {
      id: 'arrive',
      text: (s) =>
        vibe(s) === 'rowdy'
          ? 'You hear Dex’s party before you see it — bass through brick, a knot of strangers on the stoop, somebody’s speaker making legal history. Inside it’s shoulder-to-shoulder, string lights, a hundred conversations in a blender. Dex materializes, hands you a cup of something loud, and is gone.'
          : 'Dex’s place is glowing amber when you arrive — a mellower crowd tonight, records on low, candles that are definitely a fire risk and definitely worth it. People drape over couches mid-conversation. Dex points you at the kitchen, mouths “everything’s in there,” and drifts off hosting.',
      next: 'hub',
      nextLabel: 'Wade in',
    },
    hub: {
      id: 'hub',
      text: (s) => {
        const bits: string[] = [];
        if (roomOpen(s, 'pong')) bits.push('a pong table thundering in the dining room');
        if (roomOpen(s, 'kitchen')) bits.push('a kitchen debate getting louder by the round');
        if (roomOpen(s, 'rooftop')) bits.push('a pilgrimage of people heading rooftward');
        if (roomOpen(s, 'dance')) bits.push('a living room that became a dance floor');
        if (roomOpen(s, 'vinyl')) bits.push('a bedroom-turned-record-lounge, door open');
        const scene =
          bits.length > 0
            ? `The party sprawls: ${bits.join(', ')}.`
            : 'The party has settled into its late shape — clusters, couches, someone theatrically saying goodbye for the third time.';
        const drunk =
          drinks(s) >= 3
            ? ' The room has acquired a gentle rotation you didn’t order.'
            : '';
        return scene + drunk;
      },
      choices: [
        {
          text: 'Grab a drink from the kitchen counter.',
          addVars: { drinks: 1 },
          judge: {
            pass: (s) => drinks(s) <= 2, // judged after the increment
            onPass: 'drinkOk',
            onFail: 'drinkSloppy',
          },
        },
        {
          // Static choice, dynamic destination: scanning is how she gets found.
          text: 'Scan the room properly.',
          cond: (s) => kHere(s) && !spotted(s),
          setVars: { kSpotted: true },
          goto: 'spotK',
        },
        {
          text: 'Scan the room properly.',
          cond: (s) => !kHere(s) || spotted(s),
          goto: 'scanRoom',
        },
        {
          text: 'Track down Dex, your host and alleged friend.',
          cond: (s) => !done(s, 'dex'),
          goto: 'dex',
        },
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
          text: 'Follow the crowd toward the roof.',
          cond: (s) => roomOpen(s, 'rooftop'),
          goto: 'rooftop',
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
          text: 'Find Krystalle again.',
          cond: (s) => spotted(s) && done(s, 'ktalk'),
          goto: 'kAgain',
        },
        {
          text: 'Go find Krystalle.',
          cond: (s) => spotted(s) && !done(s, 'ktalk'),
          goto: 'kCorner',
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

    // ------------------------------------------------------------- drinks
    drinkOk: {
      id: 'drinkOk',
      text: (s) =>
        drinks(s) === 1
          ? 'Something citrusy and overconfident. It helps the shoulders drop. The party gets six percent friendlier.'
          : 'Round two. Still on the right side of the line — loose, not loud.',
      choices: [
        {
          text: 'Back to the party.',
          effects: { momentum: 4, mood: 3 },
          goto: 'hub',
        },
      ],
    },
    drinkSloppy: {
      id: 'drinkSloppy',
      text: 'That’s three-plus, and the cup agrees with everything you say now. Your stories are getting longer. Your volume knob is greasy.',
      kLine: undefined,
      choices: [
        {
          text: 'Switch to water and walk it off.',
          effects: { mood: -2, comfort: -2 },
          goto: 'hub',
        },
        {
          text: 'Lean into it. The party deserves this version of you.',
          effects: { momentum: -8, comfort: -8, interest: -4, mood: 2 },
          flags: ['tryhard'],
          goto: 'hub',
        },
      ],
    },

    // ------------------------------------------------------------ scanning
    spotK: {
      id: 'spotK',
      text: 'You do a slow lap with your cup as cover — and then the crowd shifts by the big window, and there she is. Krystalle. Leather jacket over something soft, holding court in a half-circle of people, mid-story, hands drawing the shape of it in the air. She hasn’t seen you. You now know something the night didn’t tell you for free.',
      mood: 'neutral',
      choices: [
        { text: 'Go say hi before you overthink it.', goto: 'kCorner' },
        {
          text: 'Not yet — let the party happen first. Timing is a skill.',
          effects: { momentum: 2 },
          goto: 'hub',
        },
      ],
    },
    scanRoom: {
      id: 'scanRoom',
      text: (s) => {
        const seen: string[] = [];
        if (roomOpen(s, 'pong')) seen.push('the pong table’s current dynasty taking challengers');
        if (roomOpen(s, 'kitchen')) seen.push('the kitchen faction war over something deeply unimportant');
        if (roomOpen(s, 'rooftop')) seen.push('the roof crowd’s fairy lights through the window');
        if (roomOpen(s, 'dance')) seen.push('the dance floor finding its second wind');
        if (roomOpen(s, 'vinyl')) seen.push('lamplight and album covers through the far door');
        return seen.length
          ? `You take inventory: ${seen.join('; ')}. A party is just a menu with worse lighting.`
          : 'The rooms have all blurred into one warm hum. Late-party physics.';
      },
      next: 'hub',
      nextLabel: 'Pick something',
    },

    // ---------------------------------------------------------------- dex
    dex: {
      id: 'dex',
      text: 'You find Dex refereeing a dispute about ice with genuine statesmanship. He throws an arm around you like you’ve survived something together.',
      kLine: undefined,
      choices: [
        {
          text: '“Who’s here tonight? Give me the map.”',
          cond: (s) => kHere(s) && !spotted(s),
          setVars: { kSpotted: true, done_dex: true },
          goto: 'dexPointsK',
        },
        {
          text: '“Who’s here tonight? Give me the map.”',
          cond: (s) => !kHere(s) || spotted(s),
          setVars: { done_dex: true },
          goto: 'dexMap',
        },
        {
          text: 'Talk shop — Dex knows the manager at Salt & Ember.',
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
      text: 'Dex runs the guest list like a tour guide — “bike people by the stereo, nurses by the window—” and your brain snags on *nurses*. He follows your look and grins enormously. “Oh yeah. Krystalle. Window. Been telling the scooter story for ten minutes. Go, before the ending.”',
      mood: 'neutral',
      choices: [
        { text: 'Go catch the ending.', goto: 'kCorner' },
        { text: 'Play it cool. Circle the long way.', effects: { momentum: 2 }, goto: 'hub' },
      ],
    },
    dexMap: {
      id: 'dexMap',
      text: 'Dex gives you the full sociology: which cluster is coworkers, which is exes maintaining a demilitarized zone, which stranger is “basically famous on the local subreddit.” Useful. Mostly untrue. Excellent delivery.',
      next: 'hub',
      nextLabel: 'Armed with lore',
    },
    dexShopWin: {
      id: 'dexShopWin',
      text: 'You and Dex end up deep in supply-chain talk — espresso margins, the oat milk cartel — and you hold your own with actual numbers. Dex looks impressed, which he does for everyone, and then thoughtful, which he does for almost no one. “You know what, I’m telling Marco you said that.”',
      next: 'hub',
      nextLabel: 'That’ll help at work',
    },
    dexShopLose: {
      id: 'dexShopLose',
      text: 'You attempt an opinion about wholesale coffee pricing and Dex pats your shoulder mid-sentence, which is how he ends conversations he loves you too much to finish.',
      next: 'hub',
      nextLabel: 'Fair',
    },

    // --------------------------------------------------------------- pong
    pong: {
      id: 'pong',
      text: (s) =>
        spotted(s)
          ? 'The pong dynasty needs a challenger and the crowd volunteers you. Worse — or better — Krystalle drifts over to watch, then gets drafted to the opposing team by popular demand. She rolls up her sleeves with theatrical menace.'
          : vibe(s) === 'rowdy'
            ? 'The pong table is a colosseum. The reigning team has a hand-drawn banner. Someone hands you a ball like it’s a summons.'
            : 'Even at a chill party, the pong table hums with quiet, respectful violence. You’re offered the next slot.',
      kLine: (s) =>
        spotted(s) ? '“No mercy, superstar. Biscuit will hear of your defeat.”' : '',
      choices: [
        {
          text: 'Play it straight — clean arc, steady hand.',
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
        },
      ],
    },
    pongWin: {
      id: 'pongWin',
      text: (s) =>
        spotted(s)
          ? 'You sink the last cup with a shot so clean the table goes silent for a beat before erupting. Across the table Krystalle is booing at maximum volume with a grin that undermines the whole performance.'
          : 'You sink the last cup clean. The dynasty falls. Someone updates the hand-drawn banner with genuine grief.',
      kLine: (s) =>
        spotted(s) ? '“BOO. Boooo. Okay that was gorgeous, boo.”' : '',
      next: 'hub',
      nextLabel: 'Retire undefeated',
    },
    pongLose: {
      id: 'pongLose',
      text: 'Rim, rim, floor. The crowd exhales in communal sympathy. The dynasty lives.',
      next: 'hub',
      nextLabel: 'A noble death',
    },
    pongLegend: {
      id: 'pongLegend',
      text: (s) =>
        spotted(s)
          ? 'Behind the back, no look — *splash*. The room detonates. Somebody claims to have filmed it; three people are already retelling it wrong. Krystalle has both hands on her head like she’s witnessing a moon landing.'
          : 'Behind the back, no look — *splash*. The room detonates. You will never do that again in your life and it does not matter.',
      kLine: (s) => (spotted(s) ? '“WHO taught you that?! Reyna could never. REYNA COULD NEVER.”' : ''),
      next: 'hub',
      nextLabel: 'Walk away in slow motion',
    },
    pongFlop: {
      id: 'pongFlop',
      text: 'You announce the trick shot loudly enough that the failure needs no announcement at all. The ball ends up in the guacamole. The guacamole’s owner is gracious. It’s worse that way.',
      next: 'hub',
      nextLabel: 'Live with it',
    },

    // -------------------------------------------------------------- kitchen
    kitchen: {
      id: 'kitchen',
      text: (s) =>
        spotted(s)
          ? 'The kitchen has split into factions over whether a hotdog is a sandwich, and Krystalle — arrived before you, sleeves up — is running the debate like a supreme court, delighted and merciless. She spots you and points: “Fresh juror. Sworn in. Opinion, now.”'
          : 'The kitchen has split into factions over whether a hotdog is a sandwich. Voices are raised. Alliances have formed. A man in a paper crown — no relation, presumably — bangs a spatula for order.',
      choices: [
        {
          text: 'Deliver an actual argument — structure, precedent, a devastating closing.',
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
        },
        {
          text: '“Well, actually, by strict culinary taxonomy—” Correct everyone. At length.',
          effects: { interest: -5, momentum: -8, comfort: -4 },
          flags: ['boring'],
          setVars: { done_kitchen: true },
          goto: 'kitchenBore',
        },
        {
          text: 'Concede charmingly to whichever side Krystalle’s on.',
          cond: (s) => spotted(s),
          effects: { comfort: 6, interest: 3, momentum: 4 },
          flags: ['nice'],
          setVars: { done_kitchen: true },
          goto: 'kitchenConcede',
        },
      ],
    },
    kitchenWin: {
      id: 'kitchenWin',
      text: (s) =>
        spotted(s)
          ? 'You build the argument in three movements and land the closer — “a hotdog is a sandwich the way a ladder is furniture” — and the kitchen LOSES it. Krystalle bangs the spatula. “Verdict! VERDICT!” She’s looking at you like you just got more interesting.'
          : 'You build the argument in three movements and land the closer — “a hotdog is a sandwich the way a ladder is furniture” — and the kitchen LOSES it. The spatula man declares you attorney general of the party.',
      kLine: (s) => (spotted(s) ? '“Objection: that was better than it needed to be. Sustained anyway.”' : ''),
      next: 'hub',
      nextLabel: 'Rest your case',
    },
    kitchenLose: {
      id: 'kitchenLose',
      text: 'Your argument has a hole in it the size of a hotdog, and the opposing faction drives a bus through it. You are laughed out of the kitchen — warmly, but out.',
      next: 'hub',
      nextLabel: 'Appeal denied',
    },
    kitchenBore: {
      id: 'kitchenBore',
      text: 'You cite an actual food-classification standard and watch the fun leave the room like air from a valve. The spatula man lowers the spatula. Somebody changes the subject to rent.',
      next: 'hub',
      nextLabel: 'You did this',
    },
    kitchenConcede: {
      id: 'kitchenConcede',
      text: 'You defect to her faction mid-argument, citing “the evidence, and also the judge.” Cheap? Extremely. Effective? Her grin says the court accepts bribes.',
      kLine: '“Shameless. The court loves it. The court notes it, though.”',
      next: 'hub',
      nextLabel: 'Noted is fine',
    },

    // -------------------------------------------------------------- rooftop
    rooftop: {
      id: 'rooftop',
      text: (s) =>
        spotted(s)
          ? 'A crowd is migrating rooftop with fairy lights and folding chairs, chanting softly about “the view.” Krystalle’s near the stairwell, and as the group swells toward the ladder her laugh stays on but her feet have quietly stopped participating.'
          : 'A crowd is migrating rooftop with fairy lights and folding chairs. The ladder is sketchy. The view, they promise, is worth it.',
      choices: [
        {
          text: 'Callback: “The balcony’s the real spot — roof views are overrated. Come on.”',
          cond: (s) => spotted(s),
          callback: 'heights',
          goto: 'roofSave',
        },
        {
          text: '“Come up with me — the view’s supposed to be incredible.”',
          cond: (s) => spotted(s),
          effects: { comfort: -12, momentum: -6 },
          setVars: { done_rooftop: true },
          goto: 'roofBad',
        },
        {
          text: 'Head up with the crowd.',
          cond: (s) => !spotted(s),
          check: {
            stat: 'intelligence',
            label: 'Hold your own with the roof philosopher',
            dc: 12,
            onWin: 'roofWin',
            onLose: 'roofMeh',
            winEffects: { mood: 6, momentum: 4 },
            winFlags: ['smart'],
            loseEffects: { mood: 2 },
          },
          setVars: { done_rooftop: true },
        },
        {
          text: 'Skip the ladder. Gravity’s undefeated.',
          setVars: { done_rooftop: true },
          goto: 'hub',
        },
      ],
    },
    roofSave: {
      id: 'roofSave',
      text: CALLBACK_LINES.heights +
        ' You commandeer the little balcony instead — two chairs, one string of lights, the city doing its glitter thing at a survivable altitude. She settles in beside you with an exhale you weren’t supposed to notice.',
      kLine: '“For the record, I would’ve gone up there. For the other record: thank you.”',
      mood: 'warm',
      choices: [
        {
          text: 'Stay a while — the party can hum without you two.',
          effects: { comfort: 10, interest: 6, momentum: 6 },
          setVars: { done_rooftop: true, done_ktalk: true },
          goto: 'hub',
        },
      ],
    },
    roofBad: {
      id: 'roofBad',
      text: 'She looks at the ladder, then at you, and something goes carefully neutral in her face. “You go! I’ll hold the drinks.” She says it light. She holds the drinks like a job. You climb up not knowing what you just stepped past.',
      next: 'hub',
      nextLabel: 'The view is fine, whatever',
    },
    roofWin: {
      id: 'roofWin',
      text: 'The roof has a self-appointed philosopher narrating the skyline. You match him thought for thought — cities as organisms, light pollution as biography — until he offers you the aux cord as a title of nobility.',
      next: 'hub',
      nextLabel: 'Descend enlightened',
    },
    roofMeh: {
      id: 'roofMeh',
      text: 'The roof philosopher laps you twice and you end up nodding at sentences with no exits. The view, to be fair, is worth it.',
      next: 'hub',
      nextLabel: 'Back down the ladder',
    },

    // ---------------------------------------------------------------- dance
    dance: {
      id: 'dance',
      text: (s) =>
        spotted(s)
          ? 'The living room found its second wind — somebody’s cousin took over the queue and got it *right*. Krystalle’s already at the edge of the floor, moving just enough to make standing still look like a decision.'
          : 'The living room found its second wind. The floor is open, the queue is hot, and the crowd absorbs anyone who commits.',
      choices: [
        {
          text: 'Pull her onto the floor.',
          cond: (s) => spotted(s),
          move: 'lightTouch',
          moveWin: 'danceK',
          moveLose: 'danceKNo',
          setVars: { done_dance: true },
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
        },
      ],
    },
    danceK: {
      id: 'danceK',
      text: 'She takes your hand and the floor makes room the way floors do for people having more fun than everyone else. She’s a shameless, joyful dancer — spins on beat, laughs off beat — and for two songs the party is just scenery.',
      kLine: '“Okay, you can move! This is going in the file. The file is getting thick, superstar.”',
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
          goto: 'hub',
        },
      ],
    },
    danceKNo: {
      id: 'danceKNo',
      text: 'She lifts her cup — internationally recognized dance exemption — and awards your solo effort a judge’s score of seven point five, hand-signaled.',
      kLine: '“Strong start, shaky dismount. The Russian judge is being generous.”',
      next: 'hub',
      nextLabel: 'Take the 7.5',
    },
    danceClose: {
      id: 'danceClose',
      text: 'The song drops to its slow bridge and she comes in close without ceremony — her hand finding your shoulder, the crowd blurring to bokeh. Neither of you talks over it.',
      mood: 'flushed',
      next: 'hub',
      nextLabel: 'Let the song end it',
    },
    danceCloseNo: {
      id: 'danceCloseNo',
      text: 'You reach for the slow-song moment and she spins out of it with a laugh — a move, technically, which is the kindest available no.',
      kLine: '“Bold DJ request. Denied on tempo grounds.”',
      next: 'hub',
      nextLabel: 'Respect the tempo',
    },
    danceWin: {
      id: 'danceWin',
      text: 'You commit and the floor commits back. A stranger high-fives you mid-song for no articulable reason. This is the whole point of parties.',
      next: 'hub',
      nextLabel: 'Ride the high',
    },
    danceMeh: {
      id: 'danceMeh',
      text: 'You dance like a man assembling furniture, but you do it with conviction, and conviction is most of dancing.',
      next: 'hub',
      nextLabel: 'Good enough',
    },

    // ---------------------------------------------------------------- vinyl
    vinyl: {
      id: 'vinyl',
      text: (s) =>
        spotted(s)
          ? 'The back bedroom is a record lounge — lamplight, crates, a turntable with a congregation. Krystalle’s cross-legged on the rug, three albums deep in a crate, and when she pulls one sleeve out she actually gasps.'
          : 'The back bedroom is a record lounge — lamplight, crates, a turntable with a small serious congregation debating what plays next.',
      kLine: (s) => (spotted(s) ? '“No WAY. Dex has VST & Company?? Dex doesn’t deserve this.”' : ''),
      choices: [
        {
          text: '“Play it. Whatever it is, that reaction means it plays next.”',
          cond: (s) => spotted(s),
          learn: 'opm',
          effects: { interest: 7, comfort: 8, momentum: 6 },
          flags: ['nice'],
          setVars: { done_vinyl: true, done_ktalk: true },
          goto: 'vinylK',
        },
        {
          text: 'Talk records with the congregation — hold your own.',
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
        },
      ],
    },
    vinylK: {
      id: 'vinylK',
      text: MEMORY_FACTS.opm.shareLine +
        ' The record crackles on and she narrates the whole first side — her dad’s kitchen, the Sunday cleaning playlist, why the bassline matters. The congregation defers. This is her room now, and you got a front-row seat by asking one right question.',
      mood: 'warm',
      next: 'hub',
      nextLabel: 'Side A ends too soon',
    },
    vinylWin: {
      id: 'vinylWin',
      text: 'You drop one genuinely obscure reference and the congregation parts like you flashed credentials. The next twenty minutes are the good kind of nerd communion.',
      next: 'hub',
      nextLabel: 'Blessed by the aux priests',
    },
    vinylLose: {
      id: 'vinylLose',
      text: 'You confuse two bands that the congregation considers opposites. The silence is brief but liturgical.',
      next: 'hub',
      nextLabel: 'Excommunicated, mildly',
    },

    // ------------------------------------------------------ Krystalle arc
    kCorner: {
      id: 'kCorner',
      text: (s) =>
        !s.k.met
          ? 'You angle through the crowd toward the window. Up close: dark hair, freckles, a laugh that keeps pulling the half-circle in tighter. She’s landing the ending of a story about a scooter with a name. A stranger. The most interesting one at the party by a margin.'
          : !dating(s)
            ? 'You cross the room and her story stops mid-gesture when she clocks you. Recognition, then a slow, delighted squint.'
            : 'You cross the room and she breaks off her own story when she sees you — grabs your wrist and pulls you into the half-circle like reclaiming luggage.',
      kLine: (s) =>
        !s.k.met
          ? '“—and THAT’S why Biscuit and I no longer trust hills. Hi. You’ve been hovering. Hover officially, at least.”'
          : !dating(s)
            ? '“No way. Café guy. The universe has a group chat and it’s clearly gossiping about me.”'
            : '“THERE you are. This is the guy,” she announces to the half-circle, which is a sentence you’ll be replaying later.',
      choices: [
        {
          text: 'Join the story mid-flight — riff on the ending like you were there.',
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
          setVars: { done_ktalk: true },
        },
        {
          text: 'Peel her gently out of the half-circle — “borrowing the storyteller.”',
          move: 'lightTouch',
          moveWin: 'kAside',
          moveLose: 'kAsideNo',
          setVars: { done_ktalk: true },
        },
        {
          text: 'Stand at the edge and just listen like everyone else.',
          effects: { comfort: 5, momentum: -3 },
          setVars: { done_ktalk: true },
          goto: 'kListen',
        },
      ],
    },
    kRiffWin: {
      id: 'kRiffWin',
      text: 'You tag onto the scooter story with a fabricated eyewitness account so committed that the half-circle takes your side of it. She gawps at the audacity, then yes-ands you without missing a beat. The two of you finish the story as co-authors to applause.',
      kLine: '“He wasn’t even THERE,” she tells the room, glowing. “That’s the worst part. That’s the best part.”',
      mood: 'laughing',
      next: 'kWindow',
      nextLabel: 'The half-circle disperses',
    },
    kRiffLose: {
      id: 'kRiffLose',
      text: 'You jump in a beat early and step on her punchline. The half-circle laughs anyway, but she has to rebuild the landing, and you can tell it landed better in rehearsal.',
      kLine: '“Co-authors get vetted, walk-on,” she says — light, but the copyright office is watching you now.',
      next: 'kWindow',
      nextLabel: 'Note taken',
    },
    kAside: {
      id: 'kAside',
      text: 'She lets herself be borrowed — hands the story off to a lieutenant mid-sentence and follows you to the quieter end of the window, close enough that the party drops to backing track.',
      kLine: '“Okay, thief. You have my attention. It’s a limited engagement, use it well.”',
      next: 'kWindow',
      nextLabel: 'Use it well',
    },
    kAsideNo: {
      id: 'kAsideNo',
      text: 'You reach to steer her out of the group a beat too proprietarily, and she converts your hand into a co-gesturer for her story instead — you are now a prop, and the half-circle loves it.',
      kLine: '“—he does THIS, look—” she says, puppeting your arm. Fine. This is fine.',
      next: 'kWindow',
      nextLabel: 'Serve as prop',
    },
    kListen: {
      id: 'kListen',
      text: 'You take a spot at the edge and give the story the audience it deserves. When it lands, she finds your face in the laugh — checking, maybe, whether you’re the kind who needs to be the show or can enjoy one.',
      next: 'kWindow',
      nextLabel: 'The circle loosens',
    },
    kWindow: {
      id: 'kWindow',
      text: (s) =>
        dating(s)
          ? 'The window corner goes semi-private — the party politely stops existing. She leans against the sill, cup abandoned somewhere, all her attention pointed at you like a warm interrogation lamp.'
          : 'The window corner goes semi-private. She leans against the sill, appraising you over the rim of her cup with the unhurried air of a bouncer who likes you so far.',
      choices: [
        {
          text: '“Trade you: one true story, no polish, for one of yours.”',
          check: {
            stat: 'charm',
            label: 'The trade',
            dc: 12,
            onWin: 'kTradeWin',
            onLose: 'kTradeLose',
            winEffects: { interest: 8, comfort: 8, momentum: 6 },
            loseEffects: { momentum: -4 },
          },
        },
        {
          text: 'Compliment her — the way she runs a room without owning it.',
          move: 'compliment',
          moveWin: 'kCompWin',
          moveLose: 'kCompLose',
        },
        {
          text: 'Steal her away to the balcony for air.',
          cond: (s) => dating(s),
          move: 'leanClose',
          moveWin: 'kBalcony',
          moveLose: 'kBalconyNo',
        },
        {
          text: '“Before this party swallows us — can I get your number?”',
          cond: (s) => !dating(s),
          judge: { pass: NUMBER_JUDGE, onPass: 'kNumberYes', onFail: 'kNumberNo' },
        },
        {
          text: 'Rejoin the party together — no agenda.',
          effects: { comfort: 5, momentum: 3 },
          goto: 'hub',
        },
      ],
    },
    kTradeWin: {
      id: 'kTradeWin',
      text: 'You go first, which is the whole trick — something true and unflattering, told straight. She listens with her head tipped. Then she pays up: a real one, not a bit, the kind of story with a hospital in it. The window corner gets ten degrees warmer.',
      kLine: '“You went first. People never go first.” She files something away. “Okay, window guy. Okay.”',
      mood: 'warm',
      next: 'kWindow',
      nextLabel: 'The corner holds',
    },
    kTradeLose: {
      id: 'kTradeLose',
      text: 'Your “true story, no polish” turns out to have suspicious amounts of polish, and she calls the workshop immediately.',
      kLine: '“That had a THREE-ACT STRUCTURE. Trade voided. Counsel is sanctioned.”',
      next: 'kWindow',
      nextLabel: 'Sanctioned',
    },
    kCompWin: {
      id: 'kCompWin',
      text: 'You tell her she runs a room like she’s dealing everyone in instead of holding court. She goes quiet a beat too long, then covers it with a sip that hides nothing.',
      kLine: '“…That’s the nicest accurate thing anyone’s said to me at one of these. Accurate is the hard part.”',
      mood: 'warm',
      next: 'kWindow',
      nextLabel: 'Let it land',
    },
    kCompLose: {
      id: 'kCompLose',
      text: 'The compliment comes out at party volume right as the song dies, and four strangers receive it too. She toasts you on their behalf.',
      kLine: '“He means all of us,” she tells them solemnly.',
      next: 'kWindow',
      nextLabel: 'You meant her',
    },
    kBalcony: {
      id: 'kBalcony',
      text: 'The balcony is two chairs and one string of lights and the entire rest of the city minding its business. She steals your jacket by prior right and settles against the rail beside you, shoulder to shoulder, the bass reduced to a heartbeat through the wall.',
      kLine: '“Good extraction. Ten out of ten. The party was getting between us and the—” she gestures at the skyline, the night, possibly you, “—this.”',
      mood: 'flushed',
      choices: [
        {
          text: 'Kiss her, with the city as witness.',
          move: 'kiss',
          moveWin: 'kKiss',
          moveLose: 'kKissNo',
        },
        {
          text: 'Shoulder to shoulder, say nothing, let the night do it.',
          effects: { comfort: 8, interest: 5, momentum: 4 },
          goto: 'kWindow',
        },
      ],
    },
    kBalconyNo: {
      id: 'kBalconyNo',
      text: 'She glances at the balcony door, then at the party she’s half-hosting by force of personality, and shakes her head — a rain check, visibly stamped.',
      kLine: '“Can’t abandon the people, superstar. I’m load-bearing tonight. Later — hold that thought exactly where it is.”',
      next: 'kWindow',
      nextLabel: 'Hold the thought',
    },
    kKiss: {
      id: 'kKiss',
      text: 'She meets you halfway like it was scheduled. The bass thumps through the wall, somebody inside butchers a chorus, and none of it gets in. When you separate she keeps a fistful of your jacket for one extra second, as punctuation.',
      kLine: '“Parties,” she says, to the skyline, approvingly.',
      mood: 'flushed',
      next: 'kWindow',
      nextLabel: 'Rejoin the world eventually',
    },
    kKissNo: {
      id: 'kKissNo',
      text: 'She catches your intent at the top of the lean and redirects it into a forehead-to-temple bump — affectionate, unmistakably a “not here.”',
      kLine: '“Half of Dex’s guest list can see this balcony, superstar. I don’t do season finales with an audience.”',
      next: 'kWindow',
      nextLabel: 'Fair terms',
    },
    kNumberYes: {
      id: 'kNumberYes',
      text: 'She looks at you for a long moment — party lights doing a slow carousel across her face — then holds out her palm for your phone like a toll collector.',
      kLine: '“Krystalle. Two L’s, don’t abbreviate it. You get one opening text and I grade harshly at parties. The bar is HIGH tonight.”',
      mood: 'warm',
      event: 'gotNumber',
      choices: [
        { text: 'Pocket the phone like it’s made of glass.', goto: 'hub' },
      ],
    },
    kNumberNo: {
      id: 'kNumberNo',
      text: 'She winds her cup between her hands, friendly and final for tonight.',
      kLine: '“Mm — not yet. Parties inflate everybody’s numbers. Impress me somewhere with worse lighting and better odds.”',
      next: 'hub',
      nextLabel: 'Worse lighting. Noted.',
    },
    kAgain: {
      id: 'kAgain',
      text: 'You drift back to her orbit and she makes room without comment — the sign language of an evening going well.',
      next: 'kWindow',
      nextLabel: 'Pick up the thread',
    },

    // --------------------------------------------------------------- leave
    leaveSeen: {
      id: 'leaveSeen',
      text: 'You make the rounds — Dex demands a formal handshake — and she walks you as far as the stoop, arms crossed against the night air, in no hurry to end the sentence.',
      kLine: (s) =>
        dating(s)
          ? '“Text me when you’re home. Yes, still nosy. It’s a whole condition. Goodnight, superstar.”'
          : '“Go, before Dex adopts you. Tonight was a good chapter, window guy.”',
      mood: 'warm',
      endScene: true,
    },
    leaveSolo: {
      id: 'leaveSolo',
      text: (s) =>
        kHere(s) && !spotted(s) && s.k.met
          ? 'You slip out into the cool air, ears ringing pleasantly. Halfway down the block your phone buzzes — Sam: “u were at dex’s?? krystalle was there lol. u2 keep missing each other.” You stare at the message for a while.'
          : 'You slip out into the cool air, ears ringing pleasantly, the party’s glow shrinking behind you window by window.',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'The corner empties around you the way water finds a drain. She’s already across the room, laughing with someone else at something that isn’t you, and the party closes over the space where your evening was.',
      kLine: '“Enjoy the party,” she said, on her way past. Just that.',
      mood: 'annoyed',
      endScene: true,
    },
  },
};
