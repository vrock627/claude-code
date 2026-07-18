// Krystalle — the test build's one datable character.
// 27, Filipina, 5'4", dark hair, freckles. Fun, spontaneous, confident,
// anxious, witty, hot, caring. Pediatric nurse, karaoke addict, rides a
// mint-green scooter, two younger sisters back in Cebu.

import type { Mood } from '../engine/types';

export const KRYSTALLE = {
  name: 'Krystalle',
  age: 27,
  blurb:
    'Dark hair, freckles, five-four of trouble. Laughs with her whole body, watches the exits anyway.',
};

// ---------------------------------------------------------------------------
// Memory facts. She shares these in conversation (choice.learn); calling one
// back later (choice.callback) is worth a lot — she notices who listens.
// ---------------------------------------------------------------------------

export interface MemoryFact {
  id: string;
  label: string; // shown in the player's "things you know" list
  shareLine: string; // how she tells you
}

export const MEMORY_FACTS: Record<string, MemoryFact> = {
  nursing: {
    id: 'nursing',
    label: 'She’s a pediatric nurse at St. Aug’s',
    shareLine:
      '“Peds ward at St. Aug’s. Twelve-hour shifts of tiny humans yelling at me. I love it, which probably says something clinical about me.”',
  },
  sisters: {
    id: 'sisters',
    label: 'Two younger sisters back in Cebu',
    shareLine:
      '“Two little sisters back in Cebu. Well — twenty-two and nineteen, so not little. They still call me every Sunday to argue about nothing.”',
  },
  karaoke: {
    id: 'karaoke',
    label: 'Karaoke is sacred to her',
    shareLine:
      '“Okay, confession. I own a personal microphone. For karaoke. It has rhinestones. I will not be taking judgment at this time.”',
  },
  heights: {
    id: 'heights',
    label: 'She’s scared of heights',
    shareLine:
      '“I look brave, but put me on a fourth-floor balcony and I turn into a very quiet, very religious person.”',
  },
  adobo: {
    id: 'adobo',
    label: 'Guards her grandma’s adobo recipe',
    shareLine:
      '“My lola’s adobo recipe is written on an index card in a fireproof box. I’m serious. People have asked. People have been refused.”',
  },
  thunder: {
    id: 'thunder',
    label: 'Loves thunderstorms',
    shareLine:
      '“Best sleep of my life is during a thunderstorm. Everyone else is scared and I’m like — finally, ambience.”',
  },
  scooter: {
    id: 'scooter',
    label: 'Rides a mint-green scooter named Biscuit',
    shareLine:
      '“I ride a scooter. Mint green. Her name is Biscuit and yes, she has a name, she’s family.”',
  },
  marathon: {
    id: 'marathon',
    label: 'Training for a half-marathon',
    shareLine:
      '“I’m training for a half-marathon in the spring. Slowly. The app keeps sending me encouraging notifications like it can sense my regret.”',
  },
};

export const CALLBACK_LINES: Record<string, string> = {
  nursing:
    'She stops mid-sip. “You remembered the ward. Most people remember ‘nurse’ and start telling me about their knee.”',
  sisters:
    '“You remembered my sisters’ Sunday calls?” Something in her shoulders comes down an inch. “Okay. Points.”',
  karaoke:
    '“You remembered the rhinestone mic.” She narrows her eyes, delighted. “That was privileged information.”',
  heights:
    'She laughs, surprised. “You remembered. Fine — no rooftop bars. See, this is called listening, people should try it.”',
  adobo:
    '“You remembered the fireproof box.” She points at you. “You’re still not getting the recipe. But I’m flattered you tried.”',
  thunder:
    '“You checked the forecast for thunderstorms? That’s the weirdest sweetest thing anyone’s done this month.”',
  scooter:
    '“How is Biscuit?” she repeats, hand on chest. “She’s thriving, thank you for asking. Nobody asks.”',
  marathon:
    '“You remembered the half-marathon. I’ve run twice since I told you that, but the sentiment lands.”',
};

// ---------------------------------------------------------------------------
// Body-language cues. The date engine buckets her hidden meters and picks a
// line — this is all the player gets. Read her or lose her.
// ---------------------------------------------------------------------------

export const CUES = {
  comfortLow: [
    'She’s angled slightly away from you, purse strap wound once around her fist.',
    'Her answers have gotten shorter. She keeps finding things to do with her hands.',
    'She checks the room in a slow scan — not bored. Mapping exits.',
    'Her smile is still there, but it’s the polite one. The one for strangers.',
  ],
  comfortMid: [
    'She’s settled into her seat a little more, shoulders loosening by degrees.',
    'She holds eye contact a beat longer than she needs to before looking away.',
    'She’s stopped fidgeting with her rings.',
  ],
  comfortHigh: [
    'She’s turned fully toward you now, knees pointed your way, the room forgotten.',
    'She leans in when you talk, like the two of you are in on something.',
    'At some point she stole a sip of your drink without asking. A good sign, probably.',
  ],
  interestLow: [
    'Her eyes drift over your shoulder mid-sentence — she catches herself, comes back late.',
    'She gives your last line the laugh it deserved, which wasn’t much.',
    '“Mm,” she says, in the way people say it when they’ve stopped listening.',
  ],
  interestHigh: [
    'She’s watching your mouth when you talk. She catches herself doing it.',
    'She asks a follow-up question — she wants the longer version.',
    'She repeats a word you used, like she’s saving it for later.',
  ],
  momentumLow: [
    'A silence lands wrong and sits there. She reaches for her drink to fill it.',
    'The rhythm’s off. You keep starting sentences at the same time and both stopping.',
  ],
  momentumHigh: [
    'The conversation’s got that clean back-and-forth now, no seams in it.',
    'She’s riffing with you, topping your lines. You could say anything right now.',
  ],
  afterStrike: [
    'Something shutters behind her eyes. She straightens her glass, her napkin, the space between you.',
    'She goes very still for half a second — you watch her decide to let it go. This time.',
    '“Okay,” she says lightly, to no one, and puts an inch of air between you.',
  ],
} satisfies Record<string, string[]>;

// Portrait mood → short stage direction under the portrait.
export const MOOD_CAPTIONS: Record<Mood, string> = {
  neutral: 'unreadable, a little amused',
  warm: 'soft-eyed, tucked-in smile',
  laughing: 'head back, actually laughing',
  uneasy: 'smile held carefully in place',
  annoyed: 'one eyebrow. Just the one.',
  flushed: 'color high, eyes bright',
};

// Rebuff lines when a move fails softly (no strike — she deflects with wit).
export const SOFT_REBUFFS = [
  '“Easy, tiger.” She says it with a laugh, but she means it.',
  'She catches your hand mid-air and squeezes it once — a kind no. “Not yet. Keep talking.”',
  '“You’re fast.” She sips her drink. “I’m not judging. I’m just narrating.”',
];

// Strike lines — you pushed past the line and she felt it.
export const STRIKE_LINES = [
  'She leans back, and the warmth drops out of the air like a window opened. “Okay — let’s slow way down.”',
  '“Wow.” One syllable, doing a lot of work. She reaches for her phone, doesn’t check it, puts it down. A tally mark you can feel.',
  'Her jaw tightens. “I was having a really good time about nine seconds ago.”',
];

// Date-crash exit lines.
export const CRASH_LINES = [
  'She stands, unhurried, and gathers her jacket. “I’m gonna go. Some advice? The girl decides the pace. Every time.”',
  '“I think we’re done.” She leaves cash on the table — for her half, exactly — and doesn’t look back.',
];
