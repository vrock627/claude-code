// Date 3+: karaoke night at Neon Palms. Her turf, highest ceiling, thinnest
// ice. The energy runs hot — which means momentum swings big both ways, and
// the boldest moves in the game are on the table if the whole arc earned them.

import type { GameState, Scene } from '../../engine/types';
import { CALLBACK_LINES } from '../krystalle';
import { HOME_TIERS } from '../lifeContent';

const m = (s: GameState) => s.scene!.date!.meters;

export const DATE_BAR: Scene = {
  id: 'date-bar',
  title: 'Karaoke Night at Neon Palms',
  art: 'bar',
  isDate: true,
  venueId: 'barnight',
  start: 'arrive',
  nodes: {
    arrive: {
      id: 'arrive',
      text: 'The Palms is at full simmer — neon humming, the KJ warming up the list. She’s at the corner booth she apparently owns by treaty: leather jacket, hair loose, Reyna’s case on the table like a briefcase before a heist.',
      kLine: '“You made it to my house. Rules of the house: we sing, we do not apologize for singing, and Sam’s jalapeño poppers are structurally mandatory.”',
      choices: [
        {
          text: 'Slide into the booth beside her — her turf, your move.',
          move: 'lightTouch',
          moveWin: 'slideWin',
          moveLose: 'slideLose',
        },
        {
          text: '“Poppers first. I don’t negotiate with legends on an empty stomach.”',
          effects: { money: -22, momentum: 8, interest: 4 },
          flags: ['funny'],
          goto: 'poppers',
        },
        {
          text: 'Sit across from her and case the songbook like a menu of threats.',
          effects: { comfort: 4, momentum: 4 },
          goto: 'songbook',
        },
      ],
    },
    slideWin: {
      id: 'slideWin',
      text: 'You slide in on her side like it was assigned seating. She scoots exactly one inch — a formality — and drops the songbook between you as shared territory.',
      kLine: '“Presumptuous. Correct, but presumptuous.”',
      next: 'songbook',
      nextLabel: 'Open the songbook',
    },
    slideLose: {
      id: 'slideLose',
      text: 'You commit to her side of the booth as she’s spreading out the songbook, jacket, and popper logistics — there is, physically, no room in her kingdom yet.',
      kLine: '“Whoa, cozy. Sit there first, hotshot. The booth has levels and you’re on the tutorial.”',
      next: 'songbook',
      nextLabel: 'Take the tutorial seat',
    },
    poppers: {
      id: 'poppers',
      text: 'Sam delivers the poppers with the gravity of a sommelier. Krystalle performs the first bite like a critic, eyes closed, hand raised for silence.',
      kLine: '“Perfect. Every time. Sam is the only man who’s never disappointed me. The bar is on the floor and also on fire.”',
      next: 'songbook',
      nextLabel: 'To business',
    },
    songbook: {
      id: 'songbook',
      text: 'The songbook — laminated, sticky, sacred. She flips pages with a game-show flourish and watches what your eyes land on.',
      kLine: '“Choose wisely. Your song says everything. It’s basically a personality scan with a melody.”',
      choices: [
        {
          text: 'Pick the big stupid crowd-pleaser and own every note you miss.',
          check: {
            stat: 'charm',
            label: 'The performance',
            dc: 13,
            onWin: 'songWin',
            onLose: 'songMid',
            winEffects: { interest: 12, momentum: 16, comfort: 6 },
            winFlags: ['confident', 'funny'],
            loseEffects: { momentum: -2 },
          },
        },
        {
          text: 'Challenge her to the duet. Winner takes bragging rights, loser buys poppers for life.',
          judge: {
            pass: (s) => m(s).momentum >= 45,
            onPass: 'duet',
            onFail: 'duetDeclined',
          },
        },
        {
          text: '“I’m more of a producer. I’ll be executive-producing from this booth.”',
          effects: { interest: -6, momentum: -8 },
          flags: ['boring'],
          goto: 'coward',
        },
      ],
    },
    songWin: {
      id: 'songWin',
      text: 'You are not good. You are, however, completely shameless, and the Palms runs on shameless. By the bridge, the bar is singing your backup. You stick the landing on one knee, pointing at Krystalle, who is standing on the booth seat conducting the crowd.',
      kLine: '“THAT’S MY DATE!” she announces to the entire bar, which is now legally binding.',
      next: 'afterSet',
      nextLabel: 'Return to the booth a hero',
    },
    songMid: {
      id: 'songMid',
      text: 'The song wins on points. You lose with dignity, which at the Palms is worth partial applause and one popper of consolation, delivered by Krystalle on a napkin like a medal.',
      kLine: '“For valor.” She pins the napkin to your chest. It does not pin. It’s a napkin.',
      next: 'afterSet',
      nextLabel: 'Wear it anyway',
    },
    duet: {
      id: 'duet',
      text: 'She’s up before you finish the sentence, unclasping Reyna’s case like a weapons check. The duet is a felony of harmony — she carries you through the verses, you surprise her on the chorus, and the last note gets held one beat past sensible while the whole bar loses it. Coming off stage she’s laughing so hard she has to hold your arm.',
      kLine: '“WE ATE THAT. Reyna barely— okay Reyna fully carried the bridge, but WE ate that.”',
      choices: [
        {
          text: 'Keep her hand where it landed — lace fingers on the walk back.',
          move: 'holdHands',
          moveWin: 'handsWin',
          moveLose: 'handsLose',
        },
        {
          text: '“You held that last note just to show off.” Grin.',
          effects: { interest: 6, momentum: 10 },
          flags: ['funny'],
          goto: 'afterSet',
        },
      ],
    },
    duetDeclined: {
      id: 'duetDeclined',
      text: 'She squints, reading the room — the room being you, and the energy not being there yet.',
      kLine: '“Mm, the duet is earned, not scheduled. Warm up the crowd first, rookie.”',
      next: 'songbook2',
      nextLabel: 'Back to the book',
    },
    songbook2: {
      id: 'songbook2',
      text: 'The songbook again. Second chances at the Palms come with interest.',
      choices: [
        {
          text: 'Fine — the big stupid crowd-pleaser, fully committed.',
          check: {
            stat: 'charm',
            label: 'The performance',
            dc: 13,
            onWin: 'songWin',
            onLose: 'songMid',
            winEffects: { interest: 12, momentum: 16, comfort: 6 },
            winFlags: ['confident', 'funny'],
            loseEffects: { momentum: -2 },
          },
        },
        {
          text: 'Order a round instead and cheer the birthday party’s ballad.',
          effects: { money: -18, comfort: 8, interest: 3 },
          flags: ['nice'],
          goto: 'afterSet',
        },
      ],
    },
    coward: {
      id: 'coward',
      text: 'Executive producer. At karaoke night. She hears it, files it, and awards you the look she gives cowards in group numbers.',
      kLine: '“The Palms remembers, you know. The Palms remembers everything.”',
      next: 'afterSet',
      nextLabel: 'The Palms remembers',
    },
    handsWin: {
      id: 'handsWin',
      text: 'She doesn’t reclaim the hand. She adjusts it — lacing fingers properly, like fixing your grip on a tool you were holding wrong — and tows you back to the booth as applause dies down.',
      next: 'afterSet',
      nextLabel: 'Towed, happily',
    },
    handsLose: {
      id: 'handsLose',
      text: 'Coming off the adrenaline she needs both hands to re-case Reyna, and the moment files past before your fingers make their case.',
      kLine: '“Hold that thought. Reyna goes home safe first. Priorities.”',
      next: 'afterSet',
      nextLabel: 'Reyna outranks you',
    },
    afterSet: {
      id: 'afterSet',
      text: 'The bar settles into ballad hour. Booth, low neon, poppers at half strength. Sam swings by with two fresh glasses and a question mark.',
      kLine: '“I’m two in and pacing like an athlete. What’s your play, superstar — keep up appearances or keep your head?”',
      choices: [
        {
          text: 'Nurse one. Stay sharp — the night has plans and you want to be present for them.',
          effects: { money: -9, comfort: 6, interest: 4 },
          flags: ['smart'],
          goto: 'boothTalk',
        },
        {
          text: 'Double fist it — it’s a party, and the party respects commitment.',
          effects: { money: -18, momentum: 6, comfort: -8, interest: -3 },
          goto: 'sloppy',
        },
      ],
    },
    sloppy: {
      id: 'sloppy',
      text: 'Round three arrives with a fourth stowing away. Your volume drifts up. Your jokes gain confidence and lose accuracy. She watches the trend line with a nurse’s eye.',
      kLine: '“Hydrate, champ.” She slides you a water with the tone of a professional intervention. “I like you better in focus.”',
      next: 'boothTalk',
      nextLabel: 'Drink the water',
    },
    boothTalk: {
      id: 'boothTalk',
      text: 'Ballad hour does its thing. She’s turned sideways in the booth, knees up, jacket off her shoulders, closer than the acoustics require. The neon puts a pink stripe across her freckles.',
      choices: [
        {
          text: 'Callback: “How’s the half-marathon app? Still sending passive-aggressive encouragement?”',
          callback: 'marathon',
          goto: 'cbMarathon',
        },
        {
          text: '“Sing me the answer: best night of your life. What did it sound like?”',
          check: {
            stat: 'charm',
            label: 'The good question',
            dc: 13,
            onWin: 'questionWin',
            onLose: 'questionMid',
            winEffects: { interest: 10, comfort: 8, momentum: 8 },
            winFlags: ['smart'],
            loseEffects: { momentum: -3 },
          },
        },
        {
          text: 'Put an arm along the booth behind her.',
          move: 'leanClose',
          moveWin: 'armWin',
          moveLose: 'armLose',
        },
      ],
    },
    cbMarathon: {
      id: 'cbMarathon',
      text: CALLBACK_LINES.marathon + ' She pulls up the app to show you the notification history, narrating each one in its imagined customer-service voice, and somewhere in there her shoulder decides it lives against yours now.',
      next: 'lateSet',
      nextLabel: 'Let the shoulder situation stand',
    },
    questionWin: {
      id: 'questionWin',
      text: 'She actually thinks about it — eyes up, tracing the neon. Then she tells you: her lola’s kitchen, typhoon season, the whole family harmonizing to the radio while the storm did percussion. She hums four bars of it, quiet, just for the booth.',
      kLine: '“I’ve never sung that at karaoke. It doesn’t belong to the Palms. It belongs to the kitchen.” A beat. “And now, I guess, partially to you. Don’t spend it all at once.”',
      mood: 'warm',
      next: 'lateSet',
      nextLabel: 'Keep it safe',
    },
    questionMid: {
      id: 'questionMid',
      text: 'Good question, imperfect moment — the KJ’s mic feedback shreds the atmosphere at the exact wrong beat. She answers the smaller, safer version.',
      kLine: '“Any night with good feedback-free acoustics. Present company under review.”',
      next: 'lateSet',
      nextLabel: 'Blame the KJ',
    },
    armWin: {
      id: 'armWin',
      text: 'The arm lands easy along the booth back, and she settles into the architecture of it a minute later like it had always been load-bearing. Her head tips almost to your shoulder during the ballad’s big finish. Almost.',
      next: 'lateSet',
      nextLabel: 'Steady',
    },
    armLose: {
      id: 'armLose',
      text: 'The arm arrives before the night earned it. She leans forward for a popper at the exact moment — coincidence with excellent timing — and the arm retreats with its dignity partially intact.',
      kLine: '“Booth’s got great lumbar support, right?” she says, merciful.',
      next: 'lateSet',
      nextLabel: 'Great lumbar support',
    },
    lateSet: {
      id: 'lateSet',
      text: 'Late set. The casuals have cleared out; what’s left is the Palms’ inner circle and the good songs. The KJ points at Krystalle — a standing arrangement, clearly. She stands, then holds out a hand to you.',
      kLine: '“Last song. I always close the night. Tonight the night has a plus-one — you coming, or do I close alone?”',
      choices: [
        {
          text: 'Take her hand. Close the night with her.',
          judge: {
            pass: (s) => m(s).momentum >= 40 && m(s).interest >= 45,
            onPass: 'closer',
            onFail: 'closerCarry',
          },
        },
        {
          text: '“Go. This one’s yours — I want to watch you close it.”',
          effects: { comfort: 8, interest: 5 },
          flags: ['nice'],
          goto: 'solo',
        },
      ],
    },
    closer: {
      id: 'closer',
      text: 'The closer is slow — the one slow song the Palms allows per night. Half-sung, half-swayed, her hand in yours on the tiny stage, the inner circle holding up lighters that are all phones. She sings her lines to you, not the room, and doesn’t pretend otherwise.',
      mood: 'flushed',
      next: 'closeOut',
      nextLabel: 'The lights come up',
    },
    closerCarry: {
      id: 'closerCarry',
      text: 'You join her, but the wattage is hers tonight — you hold the mic and mostly hold the fort while she closes the night properly. Off stage she bumps your shoulder, kind about it.',
      kLine: '“You showed up. That’s the whole job description of a plus-one.”',
      next: 'closeOut',
      nextLabel: 'The lights come up',
    },
    solo: {
      id: 'solo',
      text: 'She closes the night the way she must have a hundred times — except twice, mid-chorus, she finds you in the crowd and sings a line straight down the sightline, and the inner circle turns to see who’s getting it.',
      mood: 'warm',
      next: 'closeOut',
      nextLabel: 'Receive it publicly',
    },
    closeOut: {
      id: 'closeOut',
      text: 'Lights up, chairs on tables, Sam counting the drawer. Outside the neon buzzes against a sky finally quiet. She’s got Reyna’s case over her shoulder and no particular hurry in her.',
      choices: [
        {
          text: 'Pull her into the doorway shadow and kiss her properly.',
          move: 'makeOut',
          moveWin: 'doorwayWin',
          moveLose: 'doorwayLose',
        },
        {
          text: '“Come home with me. The night’s not done saying what it’s saying.”',
          move: 'inviteHome',
          moveWin: 'homeWin',
          moveLose: 'homeLose',
        },
        {
          text: 'Walk her to Biscuit like a gentleman of the old code.',
          effects: { comfort: 6 },
          flags: ['gentleman'],
          goto: 'biscuitGoodbye',
        },
      ],
    },
    doorwayWin: {
      id: 'doorwayWin',
      text: 'The mic case hits the ground with a soft thud she doesn’t acknowledge. The doorway shadow does what doorway shadows are for — a long, unhurried while of it, her hands in your jacket, the last neon striping you both pink and blue.',
      kLine: '“Okay,” she murmurs, eventually, against your jaw. “The Palms has NEVER seen me do that. You’re a scandal. I’m implicated.”',
      mood: 'flushed',
      choices: [
        {
          text: '“Come home with me.”',
          move: 'inviteHome',
          moveWin: 'homeWin',
          moveLose: 'homeLose',
        },
        {
          text: 'Let the scandal stand on its own — put her and Biscuit safely homeward.',
          goto: 'biscuitGoodbye',
        },
      ],
    },
    doorwayLose: {
      id: 'doorwayLose',
      text: 'You reach for her hand in the doorway and she spins gracefully out of it — a dance move, technically, which softens the no without changing it.',
      kLine: '“Tempting. And it’s a school night, and Biscuit gets separation anxiety. Rain check, superstar.”',
      next: 'biscuitGoodbye',
      nextLabel: 'Cash the rain check later',
    },
    homeWin: {
      id: 'homeWin',
      text: (s) =>
        s.homeTier >= 2
          ? 'She follows you up, and the loft earns a low whistle — the city spread glittering below, rain-washed and quiet. She sets Reyna’s case down by the window like the mic deserves the view too.'
          : s.homeTier === 1
            ? 'She follows you up. The apartment is warm and lamp-lit and she does an inspection lap, narrating like a home-buying show, approving of exactly enough.'
            : 'She follows you up to the studio, which fits approximately one and a half people, and decides — visibly, generously — that tonight it’s an intimate venue rather than a small one.',
      kLine: (s) =>
        HOME_TIERS[s.homeTier].dateModifier >= 0
          ? '“Nightcap, he says. One drink, he says.” She drops onto the couch and pats the cushion beside her, the neon still faintly in her voice. “Get over here, scandal.”'
          : '“The venue’s cozy and the company’s decent.” She takes the chair, then decides against it and takes the bed’s edge instead, patting the spot beside her. “Get over here, scandal.”',
      next: 'nightcap',
      nextLabel: 'Get over there',
    },
    homeLose: {
      id: 'homeLose',
      text: 'She winds Biscuit’s key lanyard once around her fist, thinking about it for real — you can see the coin flipping — and it lands on the careful side.',
      kLine: '“Not tonight, superstar. Tonight was loud and perfect and I want to keep it exactly like this. Next one’s quieter. Read into that as much as you like.”',
      next: 'biscuitGoodbye',
      nextLabel: 'Read into it considerably',
    },
    nightcap: {
      id: 'nightcap',
      text: 'The adrenaline of the Palms burns down to embers — low light, her laugh gone quiet, the city humming somewhere below the window. She’s close, turned toward you, the night narrowing to a single warm channel.',
      kLine: '“So. The girl decides the pace.” Her eyes hold yours, steady, amused, sure. “The girl is deciding.”',
      choices: [
        {
          text: '“Stay.”',
          move: 'bedroom',
          moveWin: 'stayWin',
          moveLose: 'stayLose',
        },
        {
          text: 'Kiss her and let her set every term after that.',
          move: 'makeOut',
          moveWin: 'slowWin',
          moveLose: 'slowLose',
        },
      ],
    },
    slowWin: {
      id: 'slowWin',
      text: 'You kiss her and hand her the reins with it. She takes them. The rest of the negotiation is conducted without words and entirely in her favor, which was always the winning strategy.',
      kLine: '“Good answer,” she says, somewhere in there. “Best one all night.”',
      mood: 'flushed',
      choices: [
        {
          text: '“Stay.”',
          move: 'bedroom',
          moveWin: 'stayWin',
          moveLose: 'stayLose',
        },
        {
          text: 'Let tonight be exactly this much, and walk her down when she’s ready.',
          goto: 'lateGoodbye',
        },
      ],
    },
    slowLose: {
      id: 'slowLose',
      text: 'A fraction fast off the blocks — she laughs, catches your face in both hands, and holds you at a benevolent arm’s length.',
      kLine: '“Sit. Stay. Good.” She grins. “The girl is still deciding. Patience, scandal.”',
      next: 'lateGoodbye',
      nextLabel: 'Patience',
    },
    stayWin: {
      id: 'stayWin',
      text: 'She answers by standing, taking your hand, and pulling you up after her — unhurried, certain, the neon of the whole night distilled down to the two of you and a door she closes herself.',
      kLine: '“Encore,” she says softly, and the rest belongs to the dark.',
      mood: 'flushed',
      next: 'morning',
      nextLabel: '⸺',
    },
    stayLose: {
      id: 'stayLose',
      text: 'She exhales a long breath through a smile, forehead briefly against yours — the closest no in the history of the word.',
      kLine: '“Ask me that again after a quiet date. The loud ones scramble my instruments and I fly this thing on instruments.”',
      next: 'lateGoodbye',
      nextLabel: 'Log the flight plan',
    },
    morning: {
      id: 'morning',
      text: 'Morning finds the apartment full of unreasonable sunlight and the smell of coffee. She’s cross-legged on the counter in your shirt, Reyna’s case open beside her, polishing the rhinestones with the hem — an intimacy Reyna has never granted anyone, you understand implicitly.',
      kLine: '“Morning, scandal. Two things: your shower pressure is elite and I used all of it. And last night—” she taps the mic case, “—inner circle. Permanently. Don’t make it weird. Okay it’s a little weird. I like it.”',
      mood: 'warm',
      endScene: true,
    },
    lateGoodbye: {
      id: 'lateGoodbye',
      text: 'Eventually the night runs out of excuses. At the door she takes her time with the jacket, the case strap, the not-leaving — then kisses you once more, slow, like punctuation she rewrote three times.',
      kLine: '“Best closing set the Palms has ever seen, and I’ve seen them all. Text me tomorrow. Early. I mean it. Nosy AND invested now.”',
      mood: 'flushed',
      endScene: true,
    },
    biscuitGoodbye: {
      id: 'biscuitGoodbye',
      text: (s) =>
        m(s).interest >= 60
          ? 'At the curb, Biscuit starts on the first kick — even the scooter’s in a good mood. She buckles the helmet, flips the visor up, and looks at you for a second longer than a goodbye needs.'
          : 'At the curb, Biscuit takes three kicks and a threat. She buckles in, waves, and putters off under the dying neon.',
      kLine: (s) =>
        m(s).interest >= 60
          ? '“Tonight goes in the highlight reel. Top three. I don’t rank the other two in front of them. Goodnight, superstar.”'
          : '“Night! Practice that chorus. Sam’s ears are counting on you.”',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'She stands, unhurried, and slots Reyna’s case over her shoulder like armor going back on. Sam is already, telepathically, printing one check instead of two.',
      kLine: '“The Palms remembers, superstar. And so do I. That’s the problem.”',
      mood: 'annoyed',
      endScene: true,
    },
  },
};
