// Date 1: coffee at Driftwood. Low stakes, low ceiling — the win condition is
// her wanting a second date, not fireworks. A kiss here is possible but you
// have to play it nearly perfectly, one rung at a time.

import type { GameState, Scene } from '../../engine/types';
import { CALLBACK_LINES, MEMORY_FACTS } from '../krystalle';

const m = (s: GameState) => s.scene!.date!.meters;

export const DATE_COFFEE: Scene = {
  id: 'date-coffee',
  title: 'Coffee at Driftwood',
  art: 'cafe',
  isDate: true,
  venueId: 'coffee',
  start: 'arrive',
  nodes: {
    arrive: {
      id: 'arrive',
      text: 'She’s already there — corner table, hair down this time, out of the scrubs and into a soft green sweater. Seeing her outside the original context is briefly system-breaking. She spots you and does a little two-finger salute.',
      kLine: '“You came. Devon’s been side-eyeing me for holding a table. We’re both in danger.”',
      choices: [
        {
          text: 'Go in for a quick hello-hug.',
          move: 'lightTouch',
          moveWin: 'hugWin',
          moveLose: 'hugLose',
        },
        {
          text: 'Salute back, sit, open with a Devon joke.',
          effects: { momentum: 8, interest: 4 },
          goto: 'orders',
        },
        {
          text: '“Wow. You look completely different. In a good way. Not that— you looked good before—”',
          effects: { momentum: -8, comfort: -4 },
          goto: 'flustered',
        },
      ],
    },
    hugWin: {
      id: 'hugWin',
      text: 'Quick, easy, one-armed, no lingering — textbook. She smells like vanilla and hospital soap, which shouldn’t work and does.',
      kLine: '“Good hug protocol. You’ve been practicing or you’re a natural, and both are acceptable.”',
      next: 'orders',
      nextLabel: 'Sit down',
    },
    hugLose: {
      id: 'hugLose',
      text: 'She was mid-rise when you leaned, chairs got involved, and the hug became a brief architectural failure.',
      kLine: '“We’ll workshop that. Sit, sit — before Devon writes us up.”',
      next: 'orders',
      nextLabel: 'Sit down',
    },
    flustered: {
      id: 'flustered',
      text: 'She lets you dig for a full three seconds before rescuing you, which is somehow worse and also fair.',
      kLine: '“Take your time. I’ve got all afternoon and you’re doing great.”',
      next: 'orders',
      nextLabel: 'Start over',
    },
    orders: {
      id: 'orders',
      text: (s) =>
        s.money >= 14
          ? 'Devon appears with the energy of a man who remembers everything. She orders her iced drink — “iced, Devon, iced” — and glances at you.'
          : 'Devon appears. She orders her iced drink and glances at you. Your wallet, you suddenly recall, is running on fumes.',
      choices: [
        {
          text: 'Get both. “Her case against you is strong, Devon. I’m buying her silence.”',
          cond: (s) => s.money >= 14,
          effects: { money: -14, comfort: 6, interest: 4 },
          flags: ['gentleman'],
          goto: 'settled',
        },
        {
          text: 'Order yours, split the check like civilized strangers.',
          effects: { money: -7 },
          goto: 'settled',
        },
        {
          text: '“Just water for me.” (You cannot afford this date.)',
          cond: (s) => s.money < 14,
          effects: { comfort: -5, momentum: -5 },
          goto: 'settled',
        },
      ],
    },
    settled: {
      id: 'settled',
      text: 'Drinks land. She wraps both hands around her cup, leans back, and looks at you like the interview portion is beginning — because it is.',
      kLine: '“Okay. Worst date you’ve ever been on. Go. And don’t sanitize it, I’m a professional, I’ve seen wounds.”',
      choices: [
        {
          text: 'Tell the story with full commitment and self-deprecating timing.',
          check: {
            stat: 'charm',
            label: 'The worst-date story',
            dc: 12,
            onWin: 'storyWin',
            onLose: 'storyMid',
            winEffects: { interest: 8, momentum: 12, comfort: 4 },
            winFlags: ['funny'],
            loseEffects: { momentum: -4 },
          },
        },
        {
          text: '“I don’t really have bad dates.” Keep it mysterious.',
          effects: { interest: -5, momentum: -8 },
          flags: ['boring'],
          goto: 'storyDodge',
        },
        {
          text: 'Trash your ex for ten minutes.',
          effects: { interest: -6, comfort: -8, momentum: -5 },
          goto: 'exTrash',
        },
      ],
    },
    storyWin: {
      id: 'storyWin',
      text: 'By the time you get to the part with the parrot, she’s got a hand over her mouth and her shoulders are shaking. She makes you repeat one line twice.',
      kLine: '“No. NO. And you stayed?? You’re a people-pleaser, that’s your whole diagnosis, I’m writing it in the chart.”',
      next: 'herTurn',
      nextLabel: 'Demand hers in return',
    },
    storyMid: {
      id: 'storyMid',
      text: 'The story has good bones but you rush the ending. She smiles into her straw.',
      kLine: '“Solid material, shaky delivery. We’ll call it a table read.”',
      next: 'herTurn',
      nextLabel: 'Ask for hers',
    },
    storyDodge: {
      id: 'storyDodge',
      text: 'The mysterious thing lands like a wet napkin. She waits, realizes that’s the whole answer, and recalibrates something behind her eyes.',
      kLine: '“Riveting. A story for the ages.”',
      next: 'herTurn',
      nextLabel: 'Try her side',
    },
    exTrash: {
      id: 'exTrash',
      text: 'Somewhere around minute three of the ex material, her gaze does a slow drift to the window. You’re losing the room and the room is one person.',
      kLine: '“Mm. She sounds… present, still. In the room with us.”',
      next: 'herTurn',
      nextLabel: 'Change the subject',
    },
    herTurn: {
      id: 'herTurn',
      text: 'Her turn. She tells hers — a rooftop dinner date, which sounds romantic until she gets to the part about the railing, the wind, and her quietly white-knuckling the table the whole night while the guy talked about drone photography.',
      learn: 'heights',
      kLine: MEMORY_FACTS.heights.shareLine,
      choices: [
        {
          text: '“He took a woman to a rooftop and didn’t notice she was terrified? Amateur hour.”',
          effects: { comfort: 8, interest: 5, momentum: 5 },
          flags: ['nice'],
          goto: 'sisters',
        },
        {
          text: '“Heights are just a mindset. I could fix that fear in one afternoon.”',
          effects: { comfort: -10, interest: -4 },
          flags: ['tryhard'],
          goto: 'fixHer',
        },
        {
          text: 'Just file it away and let her land the story her way.',
          effects: { comfort: 5, momentum: 3 },
          goto: 'sisters',
        },
      ],
    },
    fixHer: {
      id: 'fixHer',
      text: 'Her face does a thing you’ll be thinking about at 2 a.m. — the smile stays but everything behind it files out of the building.',
      kLine: '“Cool. Anyway, some fears are load-bearing, but thanks for the pitch.”',
      next: 'sisters',
      nextLabel: 'Move along',
    },
    sisters: {
      id: 'sisters',
      text: 'Her phone lights up — a group chat named with three coconut emojis. She flips it face-down but she’s smiling at it.',
      kLine: MEMORY_FACTS.sisters.shareLine,
      learn: 'sisters',
      choices: [
        {
          text: '“Oldest sibling energy. Explains the barista-justice arc.”',
          check: {
            stat: 'charm',
            label: 'Read her right',
            dc: 12,
            onWin: 'readWin',
            onLose: 'readMid',
            winEffects: { interest: 8, comfort: 6, momentum: 8 },
            winFlags: ['smart'],
            loseEffects: { momentum: -3 },
          },
        },
        {
          text: '“What do they argue with you about?” Actually listen.',
          effects: { comfort: 8, interest: 4 },
          flags: ['nice'],
          goto: 'listen',
        },
        {
          text: 'Callback: ask how Biscuit’s doing after the park incident.',
          callback: 'scooter',
          goto: 'cbScooter',
        },
        {
          text: 'Callback: ask if Reyna the microphone has forgiven the sound guy.',
          callback: 'karaoke',
          goto: 'cbKaraoke',
        },
      ],
    },
    cbScooter: {
      id: 'cbScooter',
      text: CALLBACK_LINES.scooter,
      next: 'gambit',
      nextLabel: 'She shows you three Biscuit photos',
    },
    cbKaraoke: {
      id: 'cbKaraoke',
      text: CALLBACK_LINES.karaoke,
      next: 'gambit',
      nextLabel: 'Reyna is thriving',
    },
    readWin: {
      id: 'readWin',
      text: 'She points at you with the full arm, vindicated and delighted.',
      kLine: '“THANK you. Twenty-two years of de-escalating people and one barista finally radicalized me. You get it.”',
      next: 'gambit',
      nextLabel: 'Ride the wave',
    },
    readMid: {
      id: 'readMid',
      text: 'Close, but you overshot into horoscope territory. She grants partial credit.',
      kLine: '“Half right. I’m the middle-child of responsibilities. It’s complicated and I bill by the hour.”',
      next: 'gambit',
      nextLabel: 'Fair enough',
    },
    listen: {
      id: 'listen',
      text: 'She talks about the Sunday calls — the nineteen-year-old’s dramas, the twenty-two-year-old’s boyfriend she’s legally required to disapprove of. You ask follow-ups. She notices you asking follow-ups.',
      kLine: '“You’re a listener. Huh. I clocked you as a talker. I love being wrong, this is rare, savor it.”',
      next: 'gambit',
      nextLabel: 'Savor it',
    },
    gambit: {
      id: 'gambit',
      text: 'She drains the last of her iced coffee and sets the cup down with intent. The witty-gambit face is on.',
      kLine: '“Pop quiz. Devon brings you the wrong order — do you send it back, or eat the mistake like a coward? Your answer determines everything.”',
      choices: [
        {
          text: 'A principled, absurd, fully-argued position. Commit.',
          check: {
            stat: 'charm',
            label: 'The gambit',
            dc: 13,
            onWin: 'gambitWin',
            onLose: 'gambitMid',
            winEffects: { interest: 9, momentum: 14 },
            winFlags: ['funny'],
            loseEffects: { momentum: -5 },
          },
        },
        {
          text: '“Depends — what would you do?” Volley it back.',
          effects: { comfort: 4, momentum: 4 },
          goto: 'gambitBack',
        },
        {
          text: 'Compliment her instead — the quiz, the sweater, the whole event of her.',
          move: 'compliment',
          moveWin: 'compWin',
          moveLose: 'compMid',
        },
      ],
    },
    gambitWin: {
      id: 'gambitWin',
      text: 'You construct a legal framework for coffee-shop justice with precedents and a closing statement. She’s fully turned toward you now, cup forgotten, arguing the counterpoints for the joy of it.',
      kLine: '“Objection sustained. God, okay. Most people just say ‘haha idk.’ You brought CASE LAW.”',
      next: 'window',
      nextLabel: 'Rest your case',
    },
    gambitMid: {
      id: 'gambitMid',
      text: 'The bit has promise but collapses under cross-examination. She pats the table consolingly.',
      kLine: '“Your honor, the defense is adorable but unprepared.”',
      next: 'window',
      nextLabel: 'Accept the ruling',
    },
    gambitBack: {
      id: 'gambitBack',
      text: 'She was ready for this. She delivers a seven-part answer involving loyalty cards, restorative justice, and Devon’s redemption arc. You mostly get to nod, but it’s a great show.',
      kLine: '“—and THAT’S why the punch card is a social contract. Anyway. I’m fun at parties.”',
      next: 'window',
      nextLabel: '“You are, actually.”',
    },
    compWin: {
      id: 'compWin',
      text: 'You keep it specific — the way she argues like it’s a duet, not a match. She goes still, caught somewhere real.',
      kLine: '“…Okay. That one landed. Noted and filed.” She’s a little pink under the freckles.',
      next: 'window',
      nextLabel: 'Let it breathe',
    },
    compMid: {
      id: 'compMid',
      text: 'Sweet, but it arrives mid-sip and she has to react around an ice cube. Timing is everything and yours was insured against success.',
      kLine: '“Thank you — hold on — okay, thank you. Smooth. Very smooth. The ice cube agrees.”',
      next: 'window',
      nextLabel: 'Move on',
    },
    window: {
      id: 'window',
      text: 'The afternoon is sliding gold across the table. Her knee has ended up an inch from yours under the table — geography that didn’t happen by accident, or did, and either way it’s information.',
      choices: [
        {
          text: 'Suggest walking her out along the river — extend the date.',
          judge: {
            pass: (s) => m(s).interest >= 45 && m(s).comfort >= 40,
            onPass: 'walk',
            onFail: 'walkDeclined',
          },
        },
        {
          text: 'Take her hand across the table.',
          move: 'holdHands',
          moveWin: 'handsWin',
          moveLose: 'handsLose',
        },
        {
          text: 'Wrap it here — leave on a high note.',
          goto: 'wrapEarly',
        },
      ],
    },
    walk: {
      id: 'walk',
      text: 'She’s up before you finish the sentence, looping her bag over her shoulder. Outside, the river path is all long light and joggers. She walks close, matching your pace, bumping your shoulder once on purpose during a joke.',
      kLine: '“I have a rule about extending dates. The rule is: only when I want to.”',
      choices: [
        {
          text: 'Take her hand as you walk.',
          move: 'holdHands',
          moveWin: 'handsWin2',
          moveLose: 'handsLose',
        },
        {
          text: 'Callback: point out a storm cloud — “good sleeping weather tonight, right?”',
          callback: 'thunder',
          goto: 'cbThunder',
        },
        {
          text: 'Keep the conversation rolling, easy and unhurried.',
          effects: { comfort: 6, momentum: 5, interest: 3 },
          goto: 'bench',
        },
      ],
    },
    cbThunder: {
      id: 'cbThunder',
      text: CALLBACK_LINES.thunder,
      next: 'bench',
      nextLabel: 'She walks a little closer',
    },
    walkDeclined: {
      id: 'walkDeclined',
      text: 'She checks the time and does apology-face before you finish asking.',
      kLine: '“I’ve got laundry with a court date and a shift at seven. Next time? If you earn a next time. Jury’s out.”',
      next: 'goodbye',
      nextLabel: 'Walk her to Biscuit anyway',
    },
    handsWin: {
      id: 'handsWin',
      text: 'Her hand is small and warm and she laces fingers immediately, like the decision was already made and you finally caught up to it.',
      kLine: '“Took you long enough. I was about to start charging rent on the armrest.”',
      next: 'bench',
      nextLabel: 'Keep walking',
    },
    handsWin2: {
      id: 'handsWin2',
      text: 'She looks down at your joined hands, then up, and doesn’t say anything — just squeezes once and keeps walking, a little smile aimed at the middle distance.',
      next: 'bench',
      nextLabel: 'Say nothing back',
    },
    handsLose: {
      id: 'handsLose',
      text: 'She gives your hand one friendly squeeze and returns it to you, like a coat-check.',
      kLine: '“Hands are a second-date perk. This is a coffee-tier subscription.”',
      next: 'bench',
      nextLabel: 'Respect the tier system',
    },
    bench: {
      id: 'bench',
      text: 'You end up at the rail overlooking the water. Biscuit is parked at the far gate — the date has a visible endpoint now, idling on its kickstand. She turns to face you, back to the river, appraising.',
      kLine: '“Okay, second draft. Closing arguments. How’d we do?”',
      choices: [
        {
          text: 'Lean in slow — give her every chance to meet you halfway.',
          move: 'kiss',
          moveWin: 'kissWin',
          moveLose: 'kissLose',
        },
        {
          text: '“Best coffee I’ve had since the last time Devon got my order wrong.” Land the callback, keep it light.',
          effects: { interest: 6, momentum: 6, comfort: 4 },
          flags: ['funny'],
          goto: 'goodbye',
        },
        {
          text: '“I’d call it a strong opening argument. I want the full trial.”',
          effects: { interest: 7, comfort: 5 },
          flags: ['confident'],
          goto: 'goodbye',
        },
      ],
    },
    kissWin: {
      id: 'kissWin',
      text: 'She meets you halfway — brief, soft, sure. When she pulls back her eyes stay closed one extra beat, and then she laughs at herself for it.',
      kLine: '“Okay. That was— yeah. Don’t let it go to your head. It’s already gone to your head. I can see it.”',
      mood: 'flushed',
      next: 'goodbyeKissed',
      nextLabel: 'Walk her to Biscuit',
    },
    kissLose: {
      id: 'kissLose',
      text: 'She reads the lean at fifty yards and turns it into a cheek-kiss intercept — deftly, kindly, unmistakably.',
      kLine: '“Cheek. First-date cheek. I don’t make the rules — okay, I exclusively make the rules.”',
      next: 'goodbye',
      nextLabel: 'Take it gracefully',
    },
    wrapEarly: {
      id: 'wrapEarly',
      text: 'You call it before it needs calling — leave them wanting more, allegedly. She seems mildly surprised, possibly recalibrating, possibly relieved. Hard to say. That’s the gamble.',
      next: 'goodbye',
      nextLabel: 'Walk her out',
    },
    goodbyeKissed: {
      id: 'goodbyeKissed',
      text: 'At the scooter she hands you her helmet to hold while she wrangles her hair, which feels ceremonial somehow. She takes it back, then pauses.',
      kLine: '“Text me when you’re home. Not because I worry. Because I’m nosy. Fine — both.”',
      endScene: true,
    },
    goodbye: {
      id: 'goodbye',
      text: (s) =>
        m(s).interest >= 55
          ? 'At Biscuit, she takes her time with the helmet strap — the universal signal of someone not quite done with a conversation. She looks back at you twice pulling out of the lot.'
          : 'At Biscuit, the helmet goes on efficiently. She gives you a wave, friendly and final-ish, and putters into traffic.',
      kLine: (s) =>
        m(s).interest >= 55
          ? '“This was good. I’m saying that out loud so it’s on the record. Bye, second draft.”'
          : '“Thanks for the coffee. Watch out for Devon on the way out.”',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'The date ends the way a glass breaks — one moment, then just cleanup. She gathers her bag with terrible politeness.',
      kLine: '“I’m gonna head out. Some advice, from a professional? The girl sets the pace. Every time.”',
      mood: 'annoyed',
      endScene: true,
    },
  },
};
