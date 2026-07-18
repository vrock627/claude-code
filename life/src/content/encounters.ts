// First-encounter scenes. These run as dateNumber 0 sessions: only the bottom
// of the escalation ladder is realistically open, and the prize is her number
// — which she only gives up if the meters earned it.

import type { GameState, Scene } from '../engine/types';
import { MEMORY_FACTS } from './krystalle';

const m = (s: GameState) => s.scene!.date!.meters;

const NUMBER_JUDGE = (s: GameState) =>
  m(s).interest >= 52 && m(s).comfort >= 48 && m(s).momentum >= 30;

// ---------------------------------------------------------------------------
// Driftwood Café — morning/afternoon
// ---------------------------------------------------------------------------

export const ENC_CAFE: Scene = {
  id: 'enc-cafe',
  title: 'Driftwood Café',
  art: 'cafe',
  isDate: true,
  venueId: 'cafe',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      text: 'The espresso machine screams. Ahead of you in line, a woman in scrubs the color of sea glass is having a standoff with the barista — dark hair twisted up with a pen through it, freckles, maybe five-four of visible determination.',
      kLine:
        '“I ordered it iced. This is the third time this week. I’m not mad, Devon, I’m building a case.”',
      next: 'open2',
      nextLabel: 'Keep listening',
    },
    open2: {
      id: 'open2',
      text: 'Devon retreats to remake the drink. She exhales, turns halfway, and catches you watching. One eyebrow goes up. This can go a lot of ways.',
      choices: [
        {
          text: '“For what it’s worth, I’d testify. I saw everything.”',
          check: {
            stat: 'charm',
            label: 'Witty opener',
            dc: 11,
            onWin: 'openWin',
            onLose: 'openLose',
            winEffects: { interest: 8, momentum: 12 },
            winFlags: ['funny'],
            loseEffects: { momentum: -6 },
          },
        },
        {
          text: 'Just nod sympathetically. Not your circus.',
          effects: { comfort: 4, momentum: -4 },
          goto: 'slowOpen',
        },
        {
          text: '“You always this feisty before noon?”',
          effects: { interest: -4, comfort: -8, momentum: -4 },
          flags: ['tryhard'],
          goto: 'negOpen',
        },
      ],
    },
    openWin: {
      id: 'openWin',
      text: 'She laughs — a real one, quick and bright, whole-body.',
      kLine:
        '“Finally, a witness. Everyone else in this line is a coward.” She looks at you a half-second longer than she needs to. “I’m Krystalle.”',
      next: 'counter',
      nextLabel: 'Introduce yourself',
    },
    openLose: {
      id: 'openLose',
      text: 'The line lands a beat too late — she’s already turned back to the counter. She gives you the courtesy smile. Ouch.',
      kLine: '“Ha. Yeah.”',
      next: 'counter2',
      nextLabel: 'Recover',
    },
    slowOpen: {
      id: 'slowOpen',
      text: 'You nod. She nods. It’s not nothing — she clocks that you didn’t make her drink drama about you. Her order arrives, remade. She hesitates near the pickup counter instead of leaving.',
      kLine: '“You look like you’re deciding whether to order the thing you actually want.”',
      next: 'counter',
      nextLabel: 'She’s talking to you',
    },
    negOpen: {
      id: 'negOpen',
      text: 'It comes out car-salesman. Her face does a polite thing that isn’t a smile, and she angles a shoulder away.',
      kLine: '“Only when strangers keep score.”',
      next: 'counter2',
      nextLabel: 'Try to recover',
    },
    counter: {
      id: 'counter',
      text: 'You end up at the pickup counter together. Up close: freckles across her nose like someone flicked a paintbrush, and a lanyard that says ST. AUGUSTINE PEDIATRICS.',
      choices: [
        {
          text: '“Peds ward? That’s the hard one.”',
          learn: 'nursing',
          effects: { interest: 5, comfort: 6, momentum: 4 },
          goto: 'nursingTalk',
        },
        {
          text: 'Compliment her — something specific, not sleazy.',
          move: 'compliment',
          moveWin: 'compWin',
          moveLose: 'compLose',
        },
        {
          text: '“So do you fight all baristas, or just Devon?”',
          effects: { momentum: 6, interest: 3 },
          goto: 'banter1',
        },
      ],
    },
    counter2: {
      id: 'counter2',
      text: 'Her drink arrives. She’s a step from the door. Whatever you say next either exists or doesn’t.',
      choices: [
        {
          text: '“That was a terrible line. I’m usually better in second drafts.”',
          check: {
            stat: 'charm',
            label: 'Own the miss',
            dc: 13,
            onWin: 'recoverWin',
            onLose: 'recoverLose',
            winEffects: { interest: 7, comfort: 8, momentum: 10 },
            winFlags: ['confident'],
            loseEffects: { interest: -3 },
          },
        },
        {
          text: 'Let her go. Not today.',
          goto: 'letGo',
        },
      ],
    },
    recoverWin: {
      id: 'recoverWin',
      text: 'She stops, one hand on the door, and turns back around. The eyebrow again — but amused this time.',
      kLine: '“Self-awareness. In the wild. Okay, second draft, you get one more scene. I’m Krystalle.”',
      next: 'counter',
      nextLabel: 'Take the scene',
    },
    recoverLose: {
      id: 'recoverLose',
      text: 'She smiles the way people smile at street canvassers.',
      kLine: '“Have a good one.” And the door chimes behind her.',
      next: 'exitFumble',
      nextLabel: '…',
    },
    letGo: {
      id: 'letGo',
      text: 'You watch her helmet of dark hair cross the window and disappear. The espresso machine screams again. Some other day, maybe.',
      endScene: true,
    },
    nursingTalk: {
      id: 'nursingTalk',
      text: MEMORY_FACTS.nursing.shareLine + ' She stirs her ice with the straw, studying you.',
      kLine: '“Most people hear ‘nurse’ and immediately show me a mole. You get points for restraint.”',
      choices: [
        {
          text: '“The night shifts must wreck you. How do you switch off?”',
          effects: { comfort: 8, interest: 4, momentum: 4 },
          flags: ['nice'],
          goto: 'banter1',
        },
        {
          text: '“I have this thing on my elbow, actually—”',
          effects: { momentum: 8, interest: 4 },
          check: {
            stat: 'charm',
            label: 'Commit to the bit',
            dc: 12,
            onWin: 'moleWin',
            onLose: 'moleLose',
            winEffects: { interest: 6, momentum: 8 },
            winFlags: ['funny'],
            loseEffects: { comfort: -5, momentum: -6 },
            loseFlags: ['tryhard'],
          },
        },
      ],
    },
    moleWin: {
      id: 'moleWin',
      text: 'You present the world’s most boring elbow with the gravity of a season finale. She loses it, nearly fumbles her drink.',
      kLine: '“Get out. Get out of this café.” She is not asking you to get out of the café.',
      next: 'banter1',
      nextLabel: 'Keep going',
    },
    moleLose: {
      id: 'moleLose',
      text: 'The bit needed more commitment or less elbow. She does a supportive wince.',
      kLine: '“I’ve seen worse. That’s the whole review.”',
      next: 'banter1',
      nextLabel: 'Move on',
    },
    compWin: {
      id: 'compWin',
      text: 'You keep it specific — the pen holding up her hair like an engineering solution. She touches it, caught off guard, pleased.',
      kLine: '“It’s load-bearing. Nobody ever notices the pen.”',
      next: 'banter1',
      nextLabel: 'Keep the thread',
    },
    compLose: {
      id: 'compLose',
      text: 'It lands somewhere between line and lunge. She receives it the way you receive a flyer.',
      kLine: '“Thanks.” A period, not a comma.',
      next: 'banter1',
      nextLabel: 'Change lanes',
    },
    banter1: {
      id: 'banter1',
      text: 'Her phone buzzes; she silences it without looking — you have the floor. Outside, someone tries to parallel park a truck into a space built for a bicycle. You both watch through the glass.',
      kLine: '“Ten bucks says he gives up and hazards it.”',
      choices: [
        {
          text: '“He’s got the hazards on already. That’s a man who came pre-surrendered.”',
          check: {
            stat: 'charm',
            label: 'Riff with her',
            dc: 12,
            onWin: 'riffWin',
            onLose: 'riffLose',
            winEffects: { interest: 7, momentum: 12 },
            winFlags: ['funny'],
            loseEffects: { momentum: -6 },
          },
        },
        {
          text: 'Take the bet. Ten bucks, shake on it.',
          move: 'lightTouch',
          moveWin: 'betWin',
          moveLose: 'betLose',
        },
        {
          text: '“Anyway. Enough about him. What’s your deal?”',
          effects: { comfort: -6, momentum: -6 },
          goto: 'interview',
        },
      ],
    },
    riffWin: {
      id: 'riffWin',
      text: 'The truck gives up and hazards it, on cue, like you paid him. Krystalle points at the window, vindicated, laughing.',
      kLine: '“Called it! We called it. That was teamwork.”',
      next: 'ask',
      nextLabel: 'This is the window',
    },
    riffLose: {
      id: 'riffLose',
      text: 'The riff clunks. The trucker parks it fine, betraying you both.',
      kLine: '“Huh. Good for him, honestly.”',
      next: 'ask',
      nextLabel: 'Press on',
    },
    betWin: {
      id: 'betWin',
      text: 'She shakes on it — small warm hand, one firm pump, and she doesn’t rush to let go. The trucker flees the scene. She holds out her palm; you pay the ten.',
      kLine: '“Doing business with you is a pleasure. I’m keeping this forever.”',
      next: 'ask',
      nextLabel: 'Worth every dollar',
    },
    betLose: {
      id: 'betLose',
      text: 'You offer the handshake a beat too eagerly and she converts it into a finger-gun instead, smooth as a toll booth.',
      kLine: '“I don’t gamble with strange men before noon. House rule.”',
      next: 'ask',
      nextLabel: 'Fair',
    },
    interview: {
      id: 'interview',
      text: '“What’s your deal” hangs there like a job interview question. She recites her name, rank, and beverage order with thin politeness. You can feel the air conditioning.',
      next: 'ask',
      nextLabel: 'Salvage what’s left',
    },
    ask: {
      id: 'ask',
      text: 'Her drink is down to ice. She checks the time — not performatively, she actually has somewhere to be. Now or never.',
      choices: [
        {
          text: '“I want to hear how the Devon case ends. Can I get your number?”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: '“Come on — let me take you to dinner tonight. Right now, say yes.”',
          effects: { comfort: -12, interest: -5, momentum: -8 },
          flags: ['tryhard'],
          goto: 'tooMuch',
        },
        {
          text: 'Wish her a good shift and leave it to fate.',
          goto: 'fate',
        },
      ],
    },
    tooMuch: {
      id: 'tooMuch',
      text: 'Too much throttle. She does a small step back, smile staying on like a seatbelt.',
      kLine: '“That’s a lot of plan for someone whose name I’ve known for ten minutes.”',
      next: 'ask2',
      nextLabel: 'Dial it back',
    },
    ask2: {
      id: 'ask2',
      text: 'One more chance to land this like a person.',
      choices: [
        {
          text: '“You’re right. Lower stakes: the number, and I promise to text like a gentleman.”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: 'Double down. “I just know what I want.”',
          effects: { comfort: -15, interest: -8 },
          flags: ['creep'],
          goto: 'no',
        },
      ],
    },
    fate: {
      id: 'fate',
      text: 'She pauses at the door and looks back once — you’ll never know what that look would’ve said yes to.',
      kLine: '“Good luck with your order. Devon breaks everyone eventually.”',
      endScene: true,
    },
    yes: {
      id: 'yes',
      text: 'She looks at you for a long moment — the assessment is not subtle, and you appear to pass. She holds out her hand for your phone and types fast.',
      kLine:
        '“Krystalle. Two L’s, don’t abbreviate it. Text me something better than ‘hey.’ I grade on a curve but I do grade.”',
      mood: 'warm',
      event: 'gotNumber',
      endScene: true,
    },
    no: {
      id: 'no',
      text: 'She winds her purse strap once around her fist, friendly and final.',
      kLine: '“I’m gonna say no for now. But you made the line interesting, and that’s rare.”',
      mood: 'neutral',
      endScene: true,
    },
    exitFumble: {
      id: 'exitFumble',
      text: 'Gone. The barista gives you a look of professional sympathy and slides your cup over. It’s the wrong order.',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'The temperature drops for real this time. She collects her drink and her dignity and grants you neither.',
      kLine: '“Enjoy your coffee.”',
      mood: 'annoyed',
      endScene: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Riverside park — morning
// ---------------------------------------------------------------------------

export const ENC_PARK: Scene = {
  id: 'enc-park',
  title: 'Riverside Park',
  art: 'park',
  isDate: true,
  venueId: 'park',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      text: 'Mile two. Near the boathouse, a mint-green scooter is dying loudly, and the woman crouched beside it — dark ponytail, freckles, sea-glass windbreaker — is negotiating with it like it owes her money.',
      kLine: '“Biscuit. We talked about this. You start, and I don’t sell you for parts.”',
      choices: [
        {
          text: '“Is Biscuit taking hostages, or can anyone join the negotiation?”',
          check: {
            stat: 'charm',
            label: 'Open with the bit',
            dc: 11,
            onWin: 'openWin',
            onLose: 'openLose',
            winEffects: { interest: 8, momentum: 12 },
            winFlags: ['funny'],
            loseEffects: { momentum: -5 },
          },
        },
        {
          text: '“Want a hand? Sometimes it’s just a flooded carb.”',
          effects: { comfort: 8, interest: 4 },
          goto: 'helpful',
        },
        {
          text: 'Jog past, then circle back like you didn’t plan it.',
          effects: { comfort: -5, momentum: -5 },
          goto: 'circle',
        },
      ],
    },
    openWin: {
      id: 'openWin',
      text: 'She looks up, wipes a strand of hair off her face with the back of her wrist, and grins.',
      kLine: '“Depends. Are you pro-scooter or one of those car people? This is a values screening.”',
      next: 'values',
      nextLabel: 'Answer carefully',
    },
    openLose: {
      id: 'openLose',
      text: 'She glances up mid-crouch, unimpressed, and returns to the engine.',
      kLine: '“Everyone’s a comedian. Nobody has a screwdriver.”',
      next: 'helpful',
      nextLabel: 'Actually help',
    },
    circle: {
      id: 'circle',
      text: 'Your callback lap is less subtle than it felt at speed. She watches the entire orbit with her arms crossed.',
      kLine: '“That was a full lap. I have witnesses. The geese saw everything.”',
      next: 'values',
      nextLabel: 'Own it',
    },
    values: {
      id: 'values',
      text: 'The scooter ticks as it cools. Biscuit, apparently. There’s a name sticker under the mirror.',
      choices: [
        {
          text: '“Anyone who names their scooter is right about everything. I’m pro-Biscuit.”',
          learn: 'scooter',
          effects: { interest: 7, comfort: 6, momentum: 8 },
          flags: ['nice'],
          goto: 'fix',
        },
        {
          text: '“I’m a car person, but I can be bribed across the aisle.”',
          check: {
            stat: 'charm',
            label: 'Cross-aisle charm',
            dc: 12,
            onWin: 'aisleWin',
            onLose: 'aisleLose',
            winEffects: { interest: 6, momentum: 8 },
            winFlags: ['funny'],
            loseEffects: { interest: -4, momentum: -5 },
          },
        },
      ],
    },
    aisleWin: {
      id: 'aisleWin',
      text: 'She stands, dusts her knees, and sizes you up like a customs officer with a sense of humor.',
      kLine: '“Bold, admitting that to a scooter loyalist. I respect a man who declares his crimes.”',
      next: 'fix',
      nextLabel: 'To the patient',
    },
    aisleLose: {
      id: 'aisleLose',
      text: 'Wrong crowd for car talk. She pats Biscuit protectively.',
      kLine: '“Don’t listen to him, baby.”',
      next: 'fix',
      nextLabel: 'Make amends',
    },
    helpful: {
      id: 'helpful',
      text: 'You crouch by the engine. You know approximately three scooter facts, but you deploy them with calm hands.',
      next: 'fix',
      nextLabel: 'Try the fix',
    },
    fix: {
      id: 'fix',
      text: 'Choke half-open, gentle throttle, one committed kick. It’s that or witchcraft.',
      choices: [
        {
          text: 'Steady hands, easy confidence. Kick it over.',
          check: {
            stat: 'fitness',
            label: 'The kickstart',
            dc: 12,
            onWin: 'fixWin',
            onLose: 'fixLose',
            winEffects: { interest: 10, comfort: 8, momentum: 10 },
            winFlags: ['confident'],
            loseEffects: { momentum: -4 },
          },
        },
        {
          text: 'Narrate your incompetence honestly while trying anyway.',
          check: {
            stat: 'charm',
            label: 'Charming incompetence',
            dc: 11,
            onWin: 'narrateWin',
            onLose: 'fixLose',
            winEffects: { interest: 7, comfort: 8, momentum: 8 },
            winFlags: ['funny', 'nice'],
          },
        },
      ],
    },
    fixWin: {
      id: 'fixWin',
      text: 'Biscuit coughs, catches, and settles into a smug little idle. Krystalle’s mouth falls open, delighted.',
      kLine: '“Shut UP. She never starts for strangers. She likes you. Biscuit is a very good judge of character.”',
      next: 'walk',
      nextLabel: 'Bask briefly',
    },
    narrateWin: {
      id: 'narrateWin',
      text: '“And here we see a man who watched one video about carburetors,” you narrate, kicking. Biscuit starts — pure luck — and you both decide to credit the narration.',
      kLine: '“Documentary voice fixed my scooter. Science can’t explain it.”',
      next: 'walk',
      nextLabel: 'Roll with it',
    },
    fixLose: {
      id: 'fixLose',
      text: 'Biscuit remains a sculpture. Krystalle sighs and texts someone — a coworker with a truck, apparently.',
      kLine: '“It’s fine. Biscuit does this. She’s dramatic. We’re a lot alike.”',
      next: 'walk',
      nextLabel: 'Keep her company',
    },
    walk: {
      id: 'walk',
      text: 'Either way, she’s in no hurry now. You walk the scooter toward the gate together, gravel crunching, the river doing its thing. She tells you she’s a nurse when you ask about the sea-glass scrubs peeking from her bag.',
      learn: 'nursing',
      kLine: MEMORY_FACTS.nursing.shareLine,
      choices: [
        {
          text: '“Twelve-hour shifts and marathon training the rumor says? When do you sleep?”',
          effects: { interest: 5, comfort: 6, momentum: 5 },
          goto: 'marathonTalk',
        },
        {
          text: 'Compliment her — she runs a chaotic life gracefully.',
          move: 'compliment',
          moveWin: 'compWin',
          moveLose: 'compLose',
        },
        {
          text: '“You know what’d fix Biscuit? A real bike. I could show you sometime.”',
          effects: { interest: -4, comfort: -8 },
          flags: ['tryhard'],
          goto: 'negBike',
        },
      ],
    },
    marathonTalk: {
      id: 'marathonTalk',
      text: 'She groans and tells you about the half-marathon, the app, the regret.',
      learn: 'marathon',
      kLine: MEMORY_FACTS.marathon.shareLine,
      next: 'gate',
      nextLabel: 'Walk on',
    },
    compWin: {
      id: 'compWin',
      text: 'You say she handles chaos like it’s choreography. She goes quiet for two steps — the good quiet.',
      kLine: '“That’s… okay, that was smooth. I’m upgrading you from ‘stranger’ to ‘park acquaintance.’ Huge honor.”',
      next: 'gate',
      nextLabel: 'Accept the honor',
    },
    compLose: {
      id: 'compLose',
      text: 'The compliment comes out shaped like a fortune cookie. She thanks you the way you thank a toaster.',
      next: 'gate',
      nextLabel: 'Walk on',
    },
    negBike: {
      id: 'negBike',
      text: 'Insulting Biscuit AND pitching a hangout in one move. Her pace quickens a half-step.',
      kLine: '“Wow. Biscuit can hear you, you know.”',
      next: 'gate',
      nextLabel: 'Repair mode',
    },
    gate: {
      id: 'gate',
      text: 'The park gate. Her coworker’s truck idles across the street, and her ride is here whether the conversation is done or not.',
      choices: [
        {
          text: '“I need updates on Biscuit’s recovery. Number?”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: 'Go for the hug goodbye.',
          move: 'lightTouch',
          moveWin: 'hugWin',
          moveLose: 'hugLose',
        },
        {
          text: '“See you around the park, maybe.”',
          goto: 'fate',
        },
      ],
    },
    hugWin: {
      id: 'hugWin',
      text: 'A quick, easy hug — she initiates the back-pat, you match her rhythm, nobody makes it weird. Off the hug she’s smiling.',
      kLine: '“Okay, you pass hugs. That’s harder than it sounds.”',
      next: 'gate2',
      nextLabel: 'Now ask',
    },
    hugLose: {
      id: 'hugLose',
      text: 'You open the arms; she converts it to a high-five with the reflexes of a woman who’s done this before.',
      kLine: '“Up top. Yep. There it is.”',
      next: 'gate2',
      nextLabel: 'Regroup',
    },
    gate2: {
      id: 'gate2',
      text: 'The truck honks once, friendly. Last window.',
      choices: [
        {
          text: '“Number? For Biscuit-related emergencies only, obviously.”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: 'Let the moment close.',
          goto: 'fate',
        },
      ],
    },
    fate: {
      id: 'fate',
      text: 'She wheels Biscuit into the truck bed with her coworker, waves once from the window without checking if you’re watching. You were.',
      endScene: true,
    },
    yes: {
      id: 'yes',
      text: 'She holds out her palm for your phone, types with her thumbs like it’s a speedrun.',
      kLine:
        '“Krystalle, two L’s. I’m sending Biscuit updates whether you meant it or not. There will be photos.”',
      mood: 'warm',
      event: 'gotNumber',
      endScene: true,
    },
    no: {
      id: 'no',
      text: 'She smiles, small and honest, and shakes her head.',
      kLine: '“Not today. But you were nice about Biscuit, and I remember that stuff.”',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'She swings a leg over the dead scooter and pointedly puts in both earbuds — the international sign for done.',
      mood: 'annoyed',
      endScene: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Neon Palms — evening/late night, karaoke night
// ---------------------------------------------------------------------------

export const ENC_BAR: Scene = {
  id: 'enc-bar',
  title: 'Neon Palms',
  art: 'bar',
  isDate: true,
  venueId: 'bar',
  start: 'open',
  nodes: {
    open: {
      id: 'open',
      text: 'Karaoke night at the Neon Palms. A woman in a leather jacket just absolutely dismantled a 70s disco number — rhinestone microphone, her own, apparently — and now she’s at the bar two stools down, flushed with applause, ordering water like a professional.',
      kLine: '“Water, tons of ice. The voice is an instrument, Sam. So is the ego.”',
      choices: [
        {
          text: '“You brought your own mic. That’s the most confident thing I’ve ever seen.”',
          learn: 'karaoke',
          check: {
            stat: 'charm',
            label: 'Open on the mic',
            dc: 12,
            onWin: 'openWin',
            onLose: 'openLose',
            winEffects: { interest: 8, momentum: 12 },
            winFlags: ['funny'],
            loseEffects: { momentum: -5 },
          },
        },
        {
          text: 'Send her a drink down the bar.',
          effects: { money: -12, comfort: -6, interest: 3 },
          goto: 'sentDrink',
        },
        {
          text: 'Applaud, then mind your business till she clocks you.',
          effects: { comfort: 6, momentum: -3 },
          goto: 'patience',
        },
      ],
    },
    openWin: {
      id: 'openWin',
      text: 'She spins the stool a quarter-turn toward you and holds up the rhinestone mic like evidence.',
      kLine:
        '“Her name is Reyna and she has never missed. You sing? Or are you one of those ‘I only do group numbers’ cowards?”',
      next: 'singQ',
      nextLabel: 'Answer the question',
    },
    openLose: {
      id: 'openLose',
      text: 'Your delivery gets swallowed by the next singer’s opening chords. She catches maybe half of it and awards you a polite glass-raise.',
      next: 'patience',
      nextLabel: 'Wait for a real window',
    },
    sentDrink: {
      id: 'sentDrink',
      text: 'The bartender delivers it with your general direction attached. She looks at the drink, then at you, doing math she’s clearly done before.',
      kLine: '“Thanks. I don’t drink on performance nights — but bold of you to invest without a prospectus.”',
      next: 'singQ',
      nextLabel: 'Recover with words',
    },
    patience: {
      id: 'patience',
      text: 'Two singers later, she slides one stool closer to escape a man explaining cryptocurrency to no one. She nods at you like you’re her alibi.',
      kLine: '“You’re quiet. Suspicious. Everyone in this bar wants something from that stage.”',
      next: 'singQ',
      nextLabel: 'She’s in',
    },
    singQ: {
      id: 'singQ',
      text: 'The KJ calls for the next name. She raises an eyebrow at you: well?',
      choices: [
        {
          text: 'Put your name in. Commit to a crowd-pleaser, badly if necessary.',
          check: {
            stat: 'charm',
            label: 'The performance',
            dc: 13,
            onWin: 'singWin',
            onLose: 'singMid',
            winEffects: { interest: 12, momentum: 14, comfort: 6 },
            winFlags: ['confident', 'funny'],
            loseEffects: { momentum: 2 },
          },
        },
        {
          text: '“I’m a supportive-audience specialist. Front row. Loudest hands.”',
          effects: { comfort: 8, interest: 4, momentum: 4 },
          flags: ['nice'],
          goto: 'audience',
        },
        {
          text: '“Only if you duet with me. C’mon, you and Reyna owe the people.”',
          move: 'lightTouch',
          moveWin: 'duet',
          moveLose: 'duetNo',
        },
      ],
    },
    singWin: {
      id: 'singWin',
      text: 'You’re not good, exactly, but you’re fearless, and the room decides fearless counts. You land the big note by aiming near it. She’s on her feet, cackling, hands cupped around her mouth.',
      kLine: '“ENCORE. Okay, no, not encore — but respect. Sit down, superstar, water’s on me.”',
      next: 'afterSong',
      nextLabel: 'Take the stool next to her',
    },
    singMid: {
      id: 'singMid',
      text: 'You survive the song the way people survive turbulence. Scattered charitable applause. She grades on effort, mostly.',
      kLine: '“The chorus fought back. You showed up though. That’s eighty percent of karaoke.”',
      next: 'afterSong',
      nextLabel: 'Rejoin her',
    },
    audience: {
      id: 'audience',
      text: 'You cheer for a nervous birthday girl doing a ballad and mean it. Krystalle watches you do that, and something in her posture opens a few degrees.',
      kLine: '“Okay, you’re not a stage vampire. Good. Those are the worst kind.”',
      next: 'afterSong',
      nextLabel: 'Talk between songs',
    },
    duet: {
      id: 'duet',
      text: 'She grabs your sleeve, drags you up, and splits verses like a general assigning troops. You hold your own on backup. The room eats it up. Off stage, high on applause, she forgets to let go of your sleeve for a second.',
      kLine: '“We MADE that. Reyna barely carried us. Barely.”',
      next: 'afterSong',
      nextLabel: 'Catch your breath',
    },
    duetNo: {
      id: 'duetNo',
      text: 'Reaching for her sleeve to tow her stage-ward was a notch too familiar. She reclaims her arm smoothly.',
      kLine: '“Reyna duets with proven talent only. Auditions are Thursdays.”',
      next: 'afterSong',
      nextLabel: 'Regroup at the bar',
    },
    afterSong: {
      id: 'afterSong',
      text: 'The bar settles between singers. Ice melts. She tells you about the ward when you ask what she does when she’s not winning karaoke — sea-glass scrubs, tiny loud patients.',
      learn: 'nursing',
      kLine: MEMORY_FACTS.nursing.shareLine,
      choices: [
        {
          text: '“So karaoke is the pressure valve. That’s why it’s sacred.”',
          effects: { interest: 7, comfort: 8, momentum: 6 },
          flags: ['smart'],
          goto: 'valve',
        },
        {
          text: 'Compliment the performance — specifically, not generically.',
          move: 'compliment',
          moveWin: 'compWin',
          moveLose: 'compLose',
        },
        {
          text: 'Lean in close. It’s loud in here anyway.',
          move: 'leanClose',
          moveWin: 'leanWin',
          moveLose: 'leanLose',
        },
      ],
    },
    valve: {
      id: 'valve',
      text: 'She points her straw at you like you’ve said something in court.',
      kLine:
        '“Exactly. EXACTLY. Twelve hours of holding it together, three minutes of disco where nothing can touch me. Cheaper than therapy. Louder, too.”',
      next: 'closeWindow',
      nextLabel: 'The night’s winding down',
    },
    compWin: {
      id: 'compWin',
      text: 'You mention the key change — how she leaned into it instead of flinching. Her eyes go wide.',
      kLine: '“You CAUGHT that? Nobody catches the key change. Okay. You’re real.”',
      next: 'closeWindow',
      nextLabel: 'Last call approaches',
    },
    compLose: {
      id: 'compLose',
      text: '“You were great up there” — true, but it’s the same thing four strangers already said. She thanks you at stranger volume.',
      next: 'closeWindow',
      nextLabel: 'Last call approaches',
    },
    leanWin: {
      id: 'leanWin',
      text: 'You lean in to be heard and she meets you halfway, her shoulder settling an inch from yours, perfume and bar smoke.',
      kLine: '“Better. The acoustics in this corner are terrible and I refuse to yell on my night off.”',
      next: 'closeWindow',
      nextLabel: 'Hold the moment',
    },
    leanLose: {
      id: 'leanLose',
      text: 'You lean in; she compensates by finding something fascinating in her water. The geometry says everything.',
      next: 'closeWindow',
      nextLabel: 'Give it space',
    },
    closeWindow: {
      id: 'closeWindow',
      text: 'The KJ announces last songs. She checks her phone — early shift tomorrow, you’d bet. Reyna goes back in the padded case like a ceremony.',
      choices: [
        {
          text: '“I need to know Reyna’s full origin story. Over coffee. Number?”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: '“Come on, the night’s young — stay for one more set with me.”',
          effects: { comfort: -8, interest: -3 },
          goto: 'pushy',
        },
        {
          text: 'Tip an imaginary hat. Some nights are complete as-is.',
          goto: 'fate',
        },
      ],
    },
    pushy: {
      id: 'pushy',
      text: 'She has scrubs to iron and tiny humans at seven a.m., and you just asked her to burn sleep for your plotline.',
      kLine: '“The night is young. I am tired. Those are different problems.”',
      next: 'closeWindow2',
      nextLabel: 'Read the room',
    },
    closeWindow2: {
      id: 'closeWindow2',
      text: 'Jacket on, case zipped. Final window, and it’s closing at the speed of a woman with an early shift.',
      choices: [
        {
          text: '“Fair. Rain check via text? I’ll earn it.”',
          judge: { pass: NUMBER_JUDGE, onPass: 'yes', onFail: 'no' },
        },
        {
          text: 'Let her go with a wave.',
          goto: 'fate',
        },
      ],
    },
    fate: {
      id: 'fate',
      text: 'She’s out the door into the neon, mic case swinging. The next singer butchers a power ballad in her honor, unknowingly.',
      endScene: true,
    },
    yes: {
      id: 'yes',
      text: 'She narrows her eyes, weighing something, then flips your phone out of your hand before you offer it.',
      kLine:
        '“Krystalle. Two L’s. If you text ‘hey’ with no follow-up I will simply never respond, and Reyna will forget you.”',
      mood: 'warm',
      event: 'gotNumber',
      endScene: true,
    },
    no: {
      id: 'no',
      text: 'She shoulders the mic case and gives you a genuine, disqualifying smile.',
      kLine: '“Not tonight. Keep practicing that chorus though. Seriously. For everyone’s sake.”',
      endScene: true,
    },
    crash: {
      id: 'crash',
      text: 'She flags Sam for the tab, mouths something to the bouncer, and relocates to the far end of the bar with the finality of a season cancellation.',
      mood: 'annoyed',
      endScene: true,
    },
  },
};
