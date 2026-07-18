// Date 2+: dinner at Salt & Ember. Cloth napkins, real stakes. The ceiling is
// higher — hands, closeness, a real kiss, and if the whole night is played
// right, an invitation home. Push any of it early and the night folds.

import type { GameState, Scene } from '../../engine/types';
import { CALLBACK_LINES, MEMORY_FACTS } from '../krystalle';
import { HOME_TIERS } from '../lifeContent';

const m = (s: GameState) => s.scene!.date!.meters;

export const DATE_DINNER: Scene = {
  id: 'date-dinner',
  title: 'Dinner at Salt & Ember',
  art: 'dinner',
  isDate: true,
  venueId: 'dinner',
  start: 'arrive',
  nodes: {
    arrive: {
      id: 'arrive',
      text: (s) =>
        s.carTier >= 2
          ? 'You pull up as she’s arriving — she clocks the car with theatrical slow-nod approval. The good jacket was not an empty threat: dark red, gold hoops, hair pinned with what is almost certainly a different pen.'
          : 'She’s waiting under the awning in the good jacket — dark red, gold hoops, hair pinned with what is almost certainly a different pen. She watches you arrive with an amused tilt of the head.',
      kLine: '“Look at us. Out here looking like a rumor. Come on, I already scoped the menu — I have opinions and they’re load-bearing.”',
      choices: [
        {
          text: 'Offer your arm walking in.',
          move: 'lightTouch',
          moveWin: 'armWin',
          moveLose: 'armLose',
        },
        {
          text: '“The jacket wins. I concede immediately.”',
          effects: { interest: 6, momentum: 8 },
          flags: ['nice'],
          goto: 'table',
        },
        {
          text: 'Hold the door and let the moment carry itself.',
          effects: { comfort: 5, momentum: 3 },
          flags: ['gentleman'],
          goto: 'table',
        },
      ],
    },
    armWin: {
      id: 'armWin',
      text: 'She takes it without missing a step, like you’ve done this a hundred times. Her hand settles into the crook of your elbow, light and certain.',
      kLine: '“Very old-Hollywood. I approve. If there are paparazzi, my good side is the left.”',
      next: 'table',
      nextLabel: 'Inside',
    },
    armLose: {
      id: 'armLose',
      text: 'The arm hangs in the air a half-second too long before she pats it like a railing and walks in ahead of you.',
      kLine: '“C’mon, gallant. Table’s waiting.”',
      next: 'table',
      nextLabel: 'Follow her in',
    },
    table: {
      id: 'table',
      text: 'The hostess offers two options: a cozy corner booth, or the "best table in the house" — a dramatic high-top on the mezzanine rail, overlooking the whole floor. Krystalle’s eyes flick to the mezzanine for exactly one loaded second.',
      choices: [
        {
          text: 'Callback: “Corner booth. No railings — I remember the rooftop story.”',
          callback: 'heights',
          goto: 'cbHeights',
        },
        {
          text: 'Take the mezzanine — it’s the best table in the house.',
          effects: { comfort: -12, interest: -3, momentum: -5 },
          goto: 'mezz',
        },
        {
          text: 'Ask her. “Lady’s choice.”',
          effects: { comfort: 6 },
          flags: ['gentleman'],
          goto: 'ladyChoice',
        },
      ],
    },
    cbHeights: {
      id: 'cbHeights',
      text: CALLBACK_LINES.heights + ' The booth is deep and warm and the candle does most of the lighting.',
      next: 'menu',
      nextLabel: 'Settle in',
    },
    mezz: {
      id: 'mezz',
      text: 'She takes the rail seat because you gestured at it, and spends the first ten minutes with her spine at four percent recline, smiling gamely, gripping her water glass like a service animal.',
      kLine: '“Great view. Loving it. Is the floor supposed to be that far away? Rhetorical. Wine?”',
      next: 'menu',
      nextLabel: 'Order something, fast',
    },
    ladyChoice: {
      id: 'ladyChoice',
      text: 'She picks the booth so fast the hostess laughs. Sliding in, she exhales about two percent more than the situation explains — you file that away.',
      kLine: '“Booths are objectively superior. Elevated tables are a psyop.”',
      next: 'menu',
      nextLabel: 'Agree completely',
    },
    menu: {
      id: 'menu',
      text: 'Menus. Candlelight. She reads hers like a legal brief, making small sounds of approval and betrayal.',
      kLine: '“Okay, thoughts: the short rib is allegedly life-changing, the scallops are a trap, and if you order a salad as your whole dinner I will simply leave.”',
      choices: [
        {
          text: '“Short rib, two, and whatever wine you point at.” Decisive, easy.',
          effects: { money: -78, interest: 6, momentum: 8 },
          flags: ['confident'],
          goto: 'wine',
        },
        {
          text: 'Order for both of you without asking what she wants.',
          effects: { money: -78, comfort: -14, interest: -5 },
          flags: ['tryhard'],
          goto: 'orderedForHer',
        },
        {
          text: 'Interrogate the waiter about every dish for five minutes.',
          effects: { money: -78, momentum: -10 },
          flags: ['boring'],
          goto: 'menuStall',
        },
      ],
    },
    orderedForHer: {
      id: 'orderedForHer',
      text: 'The waiter looks at her. She looks at you. A small ice age occurs between the bread plates.',
      kLine: '“He’s kidding. I’ll have the short rib, medium, and the autonomy I came in with. Thanks, Marcus.”',
      next: 'wine',
      nextLabel: 'Climb out of the crater',
    },
    menuStall: {
      id: 'menuStall',
      text: 'By question six about the reduction, her chin is in her palm and she’s begun folding her napkin into what is either a swan or a distress signal.',
      next: 'wine',
      nextLabel: 'Order, finally',
    },
    wine: {
      id: 'wine',
      text: 'The wine arrives. She takes one sip of hers and makes it last — then catches you noticing the glass she’s nursing.',
      kLine: '“Early shift tomorrow. One glass, hard limit — the tiny patients can smell weakness AND hangovers.”',
      choices: [
        {
          text: '“One’s the right number anyway. More of you to remember the night with.”',
          effects: { comfort: 8, interest: 5 },
          flags: ['nice'],
          goto: 'dinnerTalk',
        },
        {
          text: '“C’mon, one more won’t hurt. Live a little.”',
          effects: { comfort: -15, interest: -6 },
          flags: ['creep'],
          goto: 'pushDrink',
        },
        {
          text: 'Match her — set your own glass aside at one.',
          effects: { comfort: 10, interest: 4 },
          flags: ['gentleman'],
          goto: 'dinnerTalk',
        },
      ],
    },
    pushDrink: {
      id: 'pushDrink',
      text: 'The temperature drops so fast the candle should flicker. She sets her glass down with a click that ends the sentence for her.',
      kLine: '“I said my number. People who re-ask it are running a test I always pass.”',
      next: 'dinnerTalk',
      nextLabel: 'Retreat carefully',
    },
    dinnerTalk: {
      id: 'dinnerTalk',
      text: 'Food lands, spectacular. Talk loosens. She tells you about her lola’s adobo — the fireproof box, the refused petitions — as somewhere outside, a low roll of thunder crosses the city.',
      learn: 'adobo',
      kLine: MEMORY_FACTS.adobo.shareLine,
      choices: [
        {
          text: '“I’m not asking for the recipe. I’m asking to be present, someday, while you cook it.”',
          check: {
            stat: 'charm',
            label: 'Thread the needle',
            dc: 13,
            onWin: 'adoboWin',
            onLose: 'adoboMid',
            winEffects: { interest: 10, comfort: 8, momentum: 10 },
            winFlags: ['smart'],
            loseEffects: { momentum: -4 },
          },
        },
        {
          text: 'Callback: “Hear that? Thunder. Your favorite ambience, right?”',
          callback: 'thunder',
          goto: 'cbThunder',
        },
        {
          text: 'Callback: ask about the sisters’ Sunday call — did the disapproved boyfriend survive the week?',
          callback: 'sisters',
          goto: 'cbSisters',
        },
        {
          text: '“You’d probably give ME the recipe though.” Wink.',
          effects: { interest: -5, momentum: -6 },
          flags: ['tryhard'],
          goto: 'adoboFlop',
        },
      ],
    },
    adoboWin: {
      id: 'adoboWin',
      text: 'She goes quiet in the good way, fork paused mid-air, studying you like you did something you don’t know the value of.',
      kLine: '“…That was the correct answer. There was a correct answer and you found it. Nobody finds it.”',
      next: 'anxiousBeat',
      nextLabel: 'The night deepens',
    },
    adoboMid: {
      id: 'adoboMid',
      text: 'Close — but you say “someday” with a little too much real estate in it, and she laughs the moment somewhere safer.',
      kLine: '“Smooth-adjacent. The scholarship committee will be in touch.”',
      next: 'anxiousBeat',
      nextLabel: 'Keep going',
    },
    adoboFlop: {
      id: 'adoboFlop',
      text: 'The wink arrives like a cold appetizer nobody ordered.',
      kLine: '“The recipe has survived four typhoons and my mother’s divorce. It will survive you, winky.”',
      next: 'anxiousBeat',
      nextLabel: 'Deserved',
    },
    cbThunder: {
      id: 'cbThunder',
      text: CALLBACK_LINES.thunder + ' She glances at the rain-streaked window and, without narrating it, moves an inch closer along the booth.',
      next: 'anxiousBeat',
      nextLabel: 'Notice, say nothing',
    },
    cbSisters: {
      id: 'cbSisters',
      text: CALLBACK_LINES.sisters + ' You get the full update: the boyfriend survived, barely, pending review.',
      next: 'anxiousBeat',
      nextLabel: 'Pending review',
    },
    anxiousBeat: {
      id: 'anxiousBeat',
      text: 'Then: a table of eight in full birthday-mode gets seated directly behind you, loud as weather. A man in a paper crown keeps bumping the booth. Mid-sentence, you watch her volume die — she’s still smiling, but she’s gone somewhere managing something, her thumb running the seam of her napkin.',
      choices: [
        {
          text: 'Catch the waiter’s eye and quietly ask if the far booth is free — handle it without a production.',
          check: {
            stat: 'charm',
            label: 'The quiet save',
            dc: 12,
            onWin: 'saveWin',
            onLose: 'saveMid',
            winEffects: { comfort: 14, interest: 8 },
            winFlags: ['gentleman', 'nice'],
            loseEffects: { comfort: 2 },
          },
        },
        {
          text: '“You okay? You seem off all of a sudden.” Say it across the table.',
          effects: { comfort: -8, momentum: -5 },
          goto: 'calledOut',
        },
        {
          text: 'Power through — funnier, louder, competing with the birthday.',
          effects: { comfort: -5, momentum: -3 },
          flags: ['tryhard'],
          goto: 'louder',
        },
      ],
    },
    saveWin: {
      id: 'saveWin',
      text: 'Two minutes later you’re in the quiet corner booth and you never made it a thing — just “better light over here.” She slides in, exhales, and looks at you for a long moment over the candle.',
      kLine: '“You did that without doing it out loud.” A beat. “Most people need the credit. Noted, second draft. Heavily noted.”',
      next: 'closeTalk',
      nextLabel: 'Wave it off',
    },
    saveMid: {
      id: 'saveMid',
      text: 'The far booth is taken, but the attempt itself lands — she watches the whole quiet negotiation and something in her shoulders comes down anyway.',
      kLine: '“Valiant effort. Paper-crown guy wins this round. He wins most rounds, look at him.”',
      next: 'closeTalk',
      nextLabel: 'Toast paper-crown guy',
    },
    calledOut: {
      id: 'calledOut',
      text: 'Naming it across a table is the one move that makes it worse. She waves a hand, overcorrects into brightness, and takes a while coming back.',
      kLine: '“Fine! Great. Loud in here, huh. Anyway—”',
      next: 'closeTalk',
      nextLabel: 'Let her land it',
    },
    louder: {
      id: 'louder',
      text: 'You go bigger. The birthday table goes bigger back. It becomes an arms race that nobody wins and one person in this booth quietly loses.',
      next: 'closeTalk',
      nextLabel: 'Stand down',
    },
    closeTalk: {
      id: 'closeTalk',
      text: 'Plates cleared, one shared dessert with two spoons that started as a joke and stopped being one. The rain outside has settled into a steady, silver static. Her knee has been against yours for a while now — established territory, unremarked.',
      choices: [
        {
          text: 'Take her hand on the table, thumb over her knuckles.',
          move: 'holdHands',
          moveWin: 'handsWin',
          moveLose: 'handsLose',
        },
        {
          text: '“Tell me something you’ve never said on a date.” Go deeper.',
          judge: {
            pass: (s) => m(s).comfort >= 55,
            onPass: 'deepWin',
            onFail: 'deepGuard',
          },
        },
        {
          text: 'Keep it light — the dessert is doing fine work.',
          effects: { momentum: 4, comfort: 4 },
          goto: 'checkArrives',
        },
      ],
    },
    handsWin: {
      id: 'handsWin',
      text: 'Her hand turns over to meet yours halfway. She keeps talking like nothing happened, but she’s drawing slow circles on the back of your hand with her thumb, possibly without knowing it. Possibly knowing it exactly.',
      next: 'checkArrives',
      nextLabel: 'The check can wait',
    },
    handsLose: {
      id: 'handsLose',
      text: 'She gives your hand a squeeze and repurposes hers for the dessert spoon — diplomacy via crème brûlée.',
      kLine: '“Focus. This dessert deserves both our attention.”',
      next: 'checkArrives',
      nextLabel: 'Fair priorities',
    },
    deepWin: {
      id: 'deepWin',
      text: 'She considers it — actually considers it, spoon set down — and tells you about her first year on the ward. The kid she still thinks about. Why she started the karaoke thing, really. It’s quiet and unperformed and she watches your face the whole time to see what you do with it.',
      kLine: '“…I don’t know why I told you that. Yes I do. You’re annoyingly easy to talk to. It’s a problem. Keep it up.”',
      mood: 'warm',
      next: 'checkArrives',
      nextLabel: 'Hold it carefully',
    },
    deepGuard: {
      id: 'deepGuard',
      text: 'The question is right; the moment isn’t there yet. She deflects with a bit about a patient who bit her — funny, polished, previously deployed.',
      kLine: '“Deep cuts are a premium feature, second draft. Keep subscribing.”',
      next: 'checkArrives',
      nextLabel: 'Respect the paywall',
    },
    checkArrives: {
      id: 'checkArrives',
      text: 'The check lands in its little leather coffin. Outside the rain has gone soft. The night is officially negotiable.',
      choices: [
        {
          text: 'Slide into her side of the booth for the last of the wine — closer.',
          move: 'leanClose',
          moveWin: 'leanWin',
          moveLose: 'leanLose',
        },
        {
          text: 'Settle up smoothly and walk her out under your jacket.',
          effects: { comfort: 6 },
          flags: ['gentleman'],
          goto: 'awning',
        },
      ],
    },
    leanWin: {
      id: 'leanWin',
      text: 'She makes room like she was leaving it for you. Shoulder to shoulder now, her perfume over the candle smoke, her voice dropping to booth-volume — a channel with an audience of one.',
      kLine: '“Hi.” She says it like you just arrived. In a way, you did.',
      mood: 'flushed',
      next: 'awning',
      nextLabel: 'Eventually — the rain',
    },
    leanLose: {
      id: 'leanLose',
      text: 'You commit to the slide as she’s reaching for her jacket, and the geometry becomes a negotiation with an armrest.',
      kLine: '“Bold transit choice. I was just getting up — walk me out?”',
      next: 'awning',
      nextLabel: 'Recover on the move',
    },
    awning: {
      id: 'awning',
      text: 'Under the awning, rain silvering past the streetlight. Her jacket’s over her shoulders — or yours is, and she’s decided it looks better on her, which is correct. She turns to face you, close, unhurried. The night has arrived at its question.',
      choices: [
        {
          text: 'Kiss her — slow, sure, in the rain-light.',
          move: 'kiss',
          moveWin: 'kissWin',
          moveLose: 'kissLose',
        },
        {
          text: '“Come back to mine for a nightcap. I make one excellent drink and I’d like a witness.”',
          move: 'inviteHome',
          moveWin: 'inviteWin',
          moveLose: 'inviteLose',
        },
        {
          text: 'Tuck a rain-damp strand of hair behind her ear.',
          move: 'leanClose',
          moveWin: 'strandWin',
          moveLose: 'strandLose',
        },
        {
          text: 'End the night here, on the high note, with plans implied.',
          goto: 'goodnight',
        },
      ],
    },
    strandWin: {
      id: 'strandWin',
      text: 'She goes still under your hand — the good still. The rain keeps doing its thing. Her eyes come up to yours and stay.',
      kLine: '“…You’re doing a move. I’m aware it’s a move. It’s working, which is annoying.”',
      mood: 'flushed',
      next: 'awning2',
      nextLabel: 'Stay in it',
    },
    strandLose: {
      id: 'strandLose',
      text: 'She converts your incoming hand into a low-five with the reflexes of a triage professional.',
      kLine: '“Hair stays where it is. It’s doing structural work, like the pen.”',
      next: 'awning2',
      nextLabel: 'Regroup',
    },
    awning2: {
      id: 'awning2',
      text: 'The valet stand’s abandoned. The street hisses. She’s still here, and staying is its own sentence.',
      choices: [
        {
          text: 'Kiss her.',
          move: 'kiss',
          moveWin: 'kissWin',
          moveLose: 'kissLose',
        },
        {
          text: '“Nightcap at mine. One drink, no agenda — well, one small agenda: more of this.”',
          move: 'inviteHome',
          moveWin: 'inviteWin',
          moveLose: 'inviteLose',
        },
        {
          text: 'Call it a perfect night and get her a ride home.',
          goto: 'goodnight',
        },
      ],
    },
    kissWin: {
      id: 'kissWin',
      text: 'She kisses you back like she’s been waiting for you to catch up — one hand curling into your jacket, the rain forgotten, the city on mute. When you finally break apart she stays close, forehead almost touching yours.',
      kLine: '“Okay,” she says, mostly to herself. “Okay.”',
      mood: 'flushed',
      choices: [
        {
          text: '“Come home with me. Nightcap. I’d like the night to keep going.”',
          move: 'inviteHome',
          moveWin: 'inviteWin',
          moveLose: 'inviteLose',
        },
        {
          text: 'Leave it here — a perfect ending is a strategy too.',
          goto: 'goodnightKissed',
        },
      ],
    },
    kissLose: {
      id: 'kissLose',
      text: 'She reads the lean and meets it with two fingers gently on your chest — a stop sign with good manners.',
      kLine: '“Not out of the question. Out of sequence. There’s a difference and it matters.”',
      next: 'goodnight',
      nextLabel: 'Respect the sequence',
    },
    inviteWin: {
      id: 'inviteWin',
      text: (s) => {
        const home = HOME_TIERS[s.homeTier];
        return s.homeTier >= 2
          ? 'She says yes with her eyebrows before her mouth catches up. The loft does its thing when the door opens — brick, glass, the city glittering wet below — and she walks a slow circle with her hands in her jacket pockets, whistling low.'
          : s.homeTier === 1
            ? 'She says yes — “ONE drink, and I’m judging your bookshelf” — and your apartment holds its own: lamplight, the couch that isn’t from a curb, the rain on the window doing free ambience.'
            : 'She says yes — and then the studio door opens on the radiator, the wall-view window, the whole seventy square feet of it. She takes it in. “Cozy,” she decides, choosing generosity, though a little air goes out of the evening.' +
              '';
      },
      kLine: (s) =>
        s.homeTier >= 2
          ? '“Okay, the view does half your talking for you. What’s the excellent drink? This better not be a seltzer situation.”'
          : s.homeTier === 1
            ? '“Bookshelf’s… acceptable. Two paperbacks are upside down and I WILL be fixing that. Drink me, barkeep.”'
            : '“So this is where the second drafts happen.” She perches on the one chair. “Drink me, barkeep. We’ll pretend there’s a view.”',
      next: 'nightcap',
      nextLabel: 'Make the drink',
    },
    inviteLose: {
      id: 'inviteLose',
      text: 'The ask hangs in the rain-light a moment too long. She smiles — kindly, which is the worst available kindness.',
      kLine: '“Tonight ends at the awning, champ. That’s not a no forever. It’s a no tonight, and I like that you can hear the difference.”',
      next: 'goodnight',
      nextLabel: 'Hear the difference',
    },
    nightcap: {
      id: 'nightcap',
      text: (s) =>
        (HOME_TIERS[s.homeTier].dateModifier >= 0
          ? 'You make the drink — the one good one — and she narrates your technique like a golf commentator. You end up on the couch, her legs tucked up, the rain running the window. The conversation goes low and easy, trading smaller and truer things.'
          : 'You make the drink in the world’s smallest kitchen while she commentates from the chair like it’s championship golf. Somehow the smallness helps — there’s nowhere to perform. Just the rain, the radiator’s opinions, and the two of you trading smaller and truer things.'),
      kLine: '“This is the part of the night where I usually invent a reason to leave.” She swirls the glass, watching you over it. “I’m not inventing one. For the record.”',
      choices: [
        {
          text: 'Pull her in — kiss her like the awning was a rehearsal.',
          move: 'makeOut',
          moveWin: 'couchWin',
          moveLose: 'couchLose',
        },
        {
          text: 'Match her honesty — tell her something true and unpolished.',
          effects: { comfort: 10, interest: 6, momentum: 6 },
          flags: ['nice'],
          goto: 'trueThing',
        },
      ],
    },
    trueThing: {
      id: 'trueThing',
      text: 'You say the true thing. It isn’t smooth, which is exactly why it works. She sets her glass down and looks at you with the pen-through-hair engineering of her whole attention.',
      kLine: '“There he is,” she says quietly. “Hi.”',
      mood: 'warm',
      choices: [
        {
          text: 'Kiss her.',
          move: 'makeOut',
          moveWin: 'couchWin',
          moveLose: 'couchLose',
        },
        {
          text: 'Let the night land here — walk her down when she’s ready.',
          goto: 'nightEnds',
        },
      ],
    },
    couchWin: {
      id: 'couchWin',
      text: 'The glass finds the table blind. She moves into you and time does the thing where it stops filing reports — the rain, the low lamp, her laugh going quiet against your mouth. It’s a long, warm while before anything else exists.',
      mood: 'flushed',
      choices: [
        {
          text: '“Stay.”',
          move: 'bedroom',
          moveWin: 'stayWin',
          moveLose: 'stayLose',
        },
        {
          text: 'Walk her down yourself, unhurried, when the night winds down.',
          goto: 'nightEnds',
        },
      ],
    },
    couchLose: {
      id: 'couchLose',
      text: 'You reach for her as she’s mid-sentence, and she puts a palm flat on your chest — friendly, immovable, final for tonight.',
      kLine: '“Easy. I said I wasn’t leaving. I didn’t say fast-forward.”',
      next: 'nightEnds',
      nextLabel: 'Slow back down',
    },
    stayWin: {
      id: 'stayWin',
      text: 'She looks at you for a long, unhurried moment — then reaches over and turns off the lamp herself.',
      kLine: '“Okay, second draft.” Her voice is soft in the dark. “Final edit.”',
      mood: 'flushed',
      next: 'morning',
      nextLabel: '⸺',
    },
    stayLose: {
      id: 'stayLose',
      text: 'She smiles into the last of her drink and shakes her head slowly — no drama in it, just a decision she’d already made.',
      kLine: '“Not tonight. And because you asked right, there’ll be other nights. See how that works?”',
      next: 'nightEnds',
      nextLabel: 'See how that works',
    },
    morning: {
      id: 'morning',
      text: 'Morning arrives gray-gold through the window. Her side of the bed is warm but empty — kitchen sounds, and the smell of coffee made by someone who has opinions about it. She’s wearing your shirt and reading the back of your cereal box like a menu.',
      kLine: '“Morning, second draft. Your coffee situation is a crime scene but I made it work. I have a shift at seven, so — bye kiss, and text me something good by noon.”',
      mood: 'warm',
      endScene: true,
    },
    nightEnds: {
      id: 'nightEnds',
      text: 'The night lands where good nights land — at the door, unhurried, her jacket back on and the rain gone quiet. She kisses you once, brief and deliberate, like a signature.',
      kLine: '“That was a really good night. I’m saying it on the record. Don’t make me regret the record.”',
      mood: 'warm',
      endScene: true,
    },
    goodnightKissed: {
      id: 'goodnightKissed',
      text: 'You put her in a ride home with the kiss still humming in the air between you. She rolls the window down as it pulls away.',
      kLine: '“Text me when you’re home! Nosy AND worried! Both at once!”',
      mood: 'flushed',
      endScene: true,
    },
    goodnight: {
      id: 'goodnight',
      text: (s) =>
        m(s).interest >= 60
          ? 'You get her a ride and she takes her time getting in it — the universal sign of a night that didn’t want to end. She looks back through the window until the car turns.'
          : 'You get her a ride. She thanks you for dinner — warmly enough, with the receipts still being tallied somewhere behind her eyes.',
      kLine: (s) =>
        m(s).interest >= 60
          ? '“Okay, cloth-napkin guy. This one goes in the highlight reel. Goodnight.”'
          : '“Thanks for dinner. Get home safe, yeah?”',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'She signals for the check with the calm of a woman who has ended better nights than this. The rain outside applauds quietly.',
      kLine: '“I’ve got an early shift. Some free advice, from a professional triage nurse? Learn to read vitals.”',
      mood: 'annoyed',
      endScene: true,
    },
  },
};
