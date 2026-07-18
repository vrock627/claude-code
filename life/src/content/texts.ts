// The phone. Texting is free (no time block), but she notices effort, tone,
// and thirst. Enthusiasm set here carries into the next date's opening meters.

import type { GameState, Scene } from '../engine/types';
import { DATE_VENUES } from './lifeContent';

const canPropose = (s: GameState, venueId: string) => {
  const v = DATE_VENUES.find((x) => x.id === venueId)!;
  return (
    s.k.firstTextDone &&
    !s.k.pendingDate &&
    s.k.datesCompleted >= v.minDates &&
    s.money >= v.cost
  );
};

export const TEXT_HUB: Scene = {
  id: 'text-hub',
  title: 'Texts — Krystalle 🩺',
  art: 'phone',
  start: 'hub',
  nodes: {
    hub: {
      id: 'hub',
      text: (s) =>
        s.k.firstTextDone
          ? 'Your thread with Krystalle. Her last message ends in an emoji you’ve chosen not to over-analyze. (You’re over-analyzing it.)'
          : 'A fresh, empty thread. She said to text her something better than “hey.” The cursor blinks like it’s judging you. It is.',
      choices: [
        {
          text: 'Open strong: a callback to how you met, plus an actual question.',
          cond: (s) => !s.k.firstTextDone,
          check: {
            stat: 'charm',
            label: 'The first text',
            dc: 12,
            onWin: 'firstWin',
            onLose: 'firstMid',
            winEffects: { enthusiasm: 2 },
            winFlags: ['funny'],
            loseEffects: { enthusiasm: 1 },
          },
          event: 'firstText',
        },
        {
          text: 'Send: “hey”',
          cond: (s) => !s.k.firstTextDone,
          effects: { enthusiasm: -1 },
          event: 'firstText',
          goto: 'heyText',
        },
        {
          text: 'Daily banter — keep the thread warm.',
          cond: (s) => s.k.firstTextDone && !s.k.textedToday,
          check: {
            stat: 'charm',
            label: 'Banter volley',
            dc: 11,
            onWin: 'banterWin',
            onLose: 'banterMid',
            winEffects: { enthusiasm: 1 },
            loseEffects: {},
          },
          event: 'banterText',
        },
        {
          text: 'Propose coffee at Driftwood tomorrow afternoon.',
          cond: (s) => canPropose(s, 'coffee'),
          goto: 'proposeCoffee',
        },
        {
          text: 'Propose dinner at Salt & Ember tomorrow evening.',
          cond: (s) => canPropose(s, 'dinner'),
          goto: 'proposeDinner',
        },
        {
          text: 'Propose karaoke night at Neon Palms tomorrow.',
          cond: (s) => canPropose(s, 'barnight'),
          goto: 'proposeBar',
        },
        {
          text: 'Put the phone away.',
          endScene: true,
        },
      ],
    },
    firstWin: {
      id: 'firstWin',
      text: 'You draft it twice, delete an emoji, send. Three dots appear almost immediately — then stop — then appear again. She’s doing the same dance you are.',
      kLine:
        '“okay that’s an acceptable opening text. you may proceed. how’s your day, second draft? 😌”',
      next: 'hub',
      nextLabel: 'Back to the thread',
    },
    firstMid: {
      id: 'firstMid',
      text: 'It’s… fine. Serviceable. She replies an hour later, friendly but unbothered.',
      kLine: '“ha, nice. long shift, tiny patients, one (1) bitten finger. not mine.”',
      next: 'hub',
      nextLabel: 'Back to the thread',
    },
    heyText: {
      id: 'heyText',
      text: 'You send “hey”. The read receipt appears. Time passes. Continents drift. Finally:',
      kLine: '“hey.” — and you can hear the period from here.',
      next: 'hub',
      nextLabel: 'Deserved',
    },
    banterWin: {
      id: 'banterWin',
      text: 'You trade escalating hospital/coffee-shop conspiracy theories for twenty minutes. She sends a voice memo that’s just her laughing and then “DELETE that”.',
      kLine: '“you’re dumb 😭 (complimentary)”',
      next: 'hub',
      nextLabel: 'Quit while ahead',
    },
    banterMid: {
      id: 'banterMid',
      text: 'The joke needed one more draft. She hearts the message — the polite mercy-heart.',
      next: 'hub',
      nextLabel: 'Take the L quietly',
    },
    proposeCoffee: {
      id: 'proposeCoffee',
      text: 'You pitch coffee at Driftwood — scene of the crime, or at least a crime-adjacent café.',
      kLine: '“driftwood?? bold choice, Devon might testify against us both. okay. tomorrow afternoon. don’t be late, i have a whole thing about late. 🕐”',
      choices: [
        { text: 'Lock it in.', event: 'schedule:coffee', endScene: true },
        { text: 'Actually — hold off.', goto: 'hub' },
      ],
    },
    proposeDinner: {
      id: 'proposeDinner',
      text: 'You pitch Salt & Ember. A real restaurant. Cloth napkins. Stakes.',
      kLine: '“cloth napkin place?? look at you. okay yes. tomorrow evening. i’m wearing the good jacket, consider yourself warned. 🔥”',
      choices: [
        { text: 'Lock it in.', event: 'schedule:dinner', endScene: true },
        { text: 'Actually — hold off.', goto: 'hub' },
      ],
    },
    proposeBar: {
      id: 'proposeBar',
      text: 'You pitch karaoke night at Neon Palms. Her home turf. Reyna’s house.',
      kLine: '“you want to challenge me AT MY OWN VENUE. the confidence. fine. tomorrow night. bring your best song and a witness for the damage. 🎤”',
      choices: [
        { text: 'Lock it in.', event: 'schedule:barnight', endScene: true },
        { text: 'Actually — hold off.', goto: 'hub' },
      ],
    },
    crash: {
      id: 'crash',
      text: 'The thread sits quiet.',
      endScene: true,
    },
  },
};
