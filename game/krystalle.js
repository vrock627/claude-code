// Krystalle's voice overrides. Loaded after data.js; mutates the
// CHARACTERS entry. The engine looks up these paths via voiceFor() and
// falls back to the shared pool when an entry is missing. Every string
// can be a pool (array) — engine pick()'s one per render.
(function () {
  const K = window.GAMEDATA.CHARACTERS.krystalle;
  if (!K) return;

  // Stage-keyed opens. Engine reads opens[stage][mood]; falls back to
  // opens[mood] for other characters. Friend stage is platonic-warm
  // (likes you, no flirting yet). Flirting/lover/affair sharpen up.
  K.opens = {
    friend: {
      cold: [
        "Krystalle glances up from her phone, friendly half-wave. \"Hey, hi. I am in such a mood today, fair warning.\"",
        "Krystalle, busy with her own thing: \"Oh, hi — give me one sec, then I'm yours.\"",
      ],
      neutral: [
        "Krystalle grins, tucks her hair back. \"Twice in one week. You're collecting punch-card stamps or something?\"",
        "Krystalle, friendly and easy: \"Sit, sit. Catch me up.\"",
        "Krystalle: \"Hi. Good. I was about to start narrating my own afternoon. You saved me.\"",
      ],
      warm: [
        "Krystalle: \"Okay, you have to stop being good company. I am supposed to be busy.\"",
        "Krystalle: \"Hi. Pull up. I have new gossip and it is unprintable.\"",
        "Krystalle slides her drink toward your seat. \"I ordered you a thing. Surprise me by liking it.\"",
      ],
    },
    flirting: {
      cold: [
        "Krystalle gives you the half-smile that means hi-but-busy. \"Talk to me in five. I'm rebooting.\"",
        "Krystalle: \"Sit. Don't be charming yet. Charge me up first.\"",
      ],
      neutral: [
        "Krystalle, brightening: \"Oh — hi. Distract me. I dare you.\"",
        "Krystalle: \"You always show up when my brain's loud. That's a talent and it's BUGGING me.\"",
      ],
      warm: [
        "Krystalle leans her chin in her hand. \"Tell me a true thing. I'll trade you one back.\"",
        "Krystalle: \"You know I look forward to this part of my day. That's a problem I'm not solving right now.\"",
        "Krystalle: \"I almost texted to confirm you were coming. I did NOT, but I almost did.\"",
      ],
      hot: [
        "Krystalle, quieter: \"I shouldn't be this glad to see you. I know that. Sit down anyway.\"",
        "Krystalle: \"I keep telling myself I'm just being friendly. I'm a bad liar about a lot of things, apparently.\"",
      ],
    },
    lover: {
      warm: [
        "Krystalle: \"Hi. Hi. I have been waiting to look at you all day. Don't make a thing of it.\"",
        "Krystalle, low: \"Sit close. I want to be allowed to be greedy for ten minutes.\"",
      ],
      hot: [
        "Krystalle: \"You walk in here and I forget what week it is. Just so you know.\"",
        "Krystalle: \"Don't be a gentleman. Sit on my side of the booth.\"",
      ],
    },
    affair: {
      warm: [
        "Krystalle: \"Hi. Two minutes — I'm being good. Then I'm not.\"",
        "Krystalle, quiet: \"I had a whole speech about being sensible. It survived the walk in here. Sit down.\"",
      ],
      hot: [
        "Krystalle: \"I am NOT going to be sensible tonight. So we can stop pretending right now if you want.\"",
        "Krystalle: \"I keep finding excuses to be where you are. We are way past coincidences.\"",
      ],
    },
  };

  // First meeting — one-shot. Friend energy. No innuendo.
  K.firstMeeting = {
    intro: [
      "Krystalle is at the corner table with a laptop she's clearly not really using, half-eaten pastry beside her. She glances up when you sit nearby, takes the polite half-second to clock if she knows you, decides no, and goes back to her screen. Friendly. Contained.",
      "Krystalle is the only other regular at this hour — corner table, laptop open, pastry half-gone, ring catching the light. She glances up, friendly-curious, no recognition. Then back to her screen.",
    ],
    beats: [
      {
        q: "She's the only other person here who's been here as long as you. Worth saying something.",
        opts: [
          { text: "Comment on the laptop she's clearly not using.", trait: "playful", line: [
            "She closes it two inches and laughs once. \"…rude. Correct, but rude. I'm Krystalle. You have to earn the rest.\"",
            "She snorts. \"Caught. Okay — I'm Krystalle. Sit, you menace, you've earned a witness.\"",
          ] },
          { text: "Compliment something specific — her book, the pastry, the way she's set up.", trait: "sincere", line: [
            "She closes the laptop fully. \"…oh. You actually looked. Most people open with hi. Krystalle.\"",
            "She tilts her head. \"That's the first observational thing anyone has said to me in this cafe. I'm Krystalle. I'm pre-charmed, careful.\"",
          ] },
          { text: "Clean intro — your name, no angle.", trait: "classy", line: [
            "She gives you the once-over, a fast one. \"Krystalle. Are you new at being a person in cafes, or is this just a Tuesday?\" Said amused, not mean.",
            "She nods, professional-warm. \"Krystalle. Nice to put a face to the regular.\"",
          ] },
        ],
      },
      {
        q: "She's friendly but checking her phone — she's clearly here for her own reasons.",
        opts: [
          { text: "Ask what she's working on.", trait: "sincere", line: [
            "\"Oh — I'm pretending to work and actually catching up on group chats. Don't tell my husband.\" Said breezily, like it's the most ordinary thing in the world.",
            "She flips the laptop around — it's a grocery list and three open shopping tabs. \"Productivity. The dream.\" Laughs. Easy.",
          ] },
          { text: "Make her laugh — bad pun, weird observation, whatever.", trait: "playful", line: [
            "She laughs the real one for half a second and then catches herself. \"Oh, you're going to be a problem. Affectionately.\"",
            "She covers her face. \"That was so bad. So bad. Do another one.\"",
          ] },
          { text: "Just be easy company — small talk, no agenda.", trait: "sincere", line: [
            "She relaxes a notch you can see. \"You're nice. I was BRACING for a pickup attempt. Thank you for being a person.\"",
            "She smiles and means it. \"Hi, person. Good vibe. Keep it.\"",
          ] },
        ],
      },
    ],
  };

  // ===== Conversation hub voice content =====
  // Per-category, per-action pools. Engine pick()s one per render.
  K.voice = {
    hub: {
      // Optional per-venue intros for the hub (first action only).
      venues: {
        cafe: { intro: [
          "Krystalle's at her usual corner. She slides her things over so you have room. \"Sit, sit. The pastry's bad today but the coffee's right.\"",
          "Krystalle wraps both hands around her cup like she's stealing the warmth. \"You're my favourite emergency exit. I'm not even joking.\"",
          "Krystalle taps the chair beside her with one foot. \"Down. Sit. Tell me everything important.\"",
        ] },
        park: { intro: [
          "Krystalle's kicked her shoes off on the blanket already. \"Grass. Real grass. I'm rich now.\"",
          "Krystalle pats the blanket beside her without looking. \"You brought the snacks. I knew I liked you for a reason.\"",
        ] },
        restaurant: { intro: [
          "Krystalle slides in across from you, exhales like she's been holding her breath all week. \"Two hours. The rest of my life doesn't exist for two hours.\"",
          "Krystalle drops into the booth and rolls her shoulders. \"Okay. Wine, and then attention. In that order.\"",
        ] },
        club: { intro: [
          "Krystalle, flat into your ear over the bass: \"This is not my scene. I'm committing anyway. Keep up.\"",
          "Krystalle takes the booth corner and crosses her legs. \"You picked here. You're paying for that in stories later.\"",
        ] },
      },

      // Pre-action mood-setters per category. Optional.
      pre: {
        compliment: [
          "She tilts her head. \"Mm. Try it.\"",
          "Krystalle smiles, half-knowing. \"Careful with the compliments. I keep score.\"",
        ],
        question: [
          "She sets her drink down and gives you her full attention. \"Okay. Go ahead.\"",
          "Krystalle: \"Ooh. Real one or warm-up one?\"",
        ],
        day: [
          "Krystalle: \"Yeah? Hit me. The bad version, the good version, your call.\"",
          "She leans forward on her elbows. \"Story me.\"",
        ],
        move: [
          "Krystalle's watching you, half-amused. \"…go on.\"",
          "She raises one eyebrow. \"Bold. Showing your work.\"",
        ],
        end: [
          "She gathers her things, unhurried. \"Last call, big moves, what've you got.\"",
        ],
      },

      // Cheating-pre: replaces pre.move at lover/affair stage. She's
      // not pulling back — she's wanting it AND wrestling with it.
      cheatPre: {
        lover: [
          "Krystalle catches your hand on hers and just holds it there a second. \"…I keep telling myself I'm being careful. I'm losing the argument.\"",
          "She closes her eyes. \"You have to convince me harder than that. I'm trying to be a person.\"",
          "Krystalle: \"…you make this very, very hard to be good at.\"",
        ],
        affair: [
          "Krystalle bites her lip. \"…the bad-Krystalle voice in my head is so LOUD right now. Make her shut up.\"",
          "She breathes out, slow. \"Already? Again? You absolute problem of a man.\"",
          "Krystalle, quiet: \"I don't even pretend to be sensible about you anymore. Look at me. Look what you did.\"",
        ],
      },

      // Repeat-category pools (DR ≥ 2). She teases the player.
      repeat: {
        compliment: { said: [
          "\"…third compliment in twenty minutes. Are you running out of material or am I just THAT good?\"",
          "\"Mm. Try harder. I'm getting spoiled and bored at the same time.\"",
          "\"…oh you're just saying things now. Endearing. Borderline.\"",
        ], line: [
          "She rolls her eyes affectionately and waves you off.",
          "She files it under 'sweet, but stop'.",
        ] },
        question: { said: [
          "\"Okay, interrogator. Last question, then I get one.\"",
          "\"…you have an awful lot of questions today. Suspicious.\"",
          "\"Save some for next time. I want to be a mystery a little longer.\"",
        ], line: [
          "She raises an eyebrow and won't quite answer this one straight.",
        ] },
        day: { said: [
          "\"You've told me about your day three times. Either it was a hell of a day or you're stalling.\"",
          "\"…okay, but tell me about a DIFFERENT day. I'm caught up on Tuesday.\"",
        ], line: [
          "She nods politely, drink to lips, eyes laughing at you over the rim.",
        ] },
        move: { said: [
          "\"Slow down, daddy. You don't get to use the same move twice in one date.\"",
          "\"…try a different angle. I'm onto that one.\"",
          "\"Hey. Same move. Different result. Maybe.\"",
        ], line: [
          "She catches your wrist gently and sets you back a half-inch. Teasing, not angry.",
        ] },
      },

      // ----- COMPLIMENT actions -----
      compliment: {
        smile: { said: [
          "\"…oh. You looked. Most people don't.\"",
          "\"Stop it. Don't stop it.\"",
        ], line: [
          "She presses her lips together to hide it, fails, ducks her chin.",
          "She tucks her hair behind her ear and doesn't quite meet your eyes for a second.",
          "Small surprised laugh — she didn't see that one coming.",
        ] },
        outfit: { said: [
          "\"I dressed FOR this and the universe noticed. Thank you, universe.\"",
          "\"You're allowed to notice. Once. We'll see how you do.\"",
          "\"Hand-me-down, by the way. Don't ruin the moment.\"",
        ], line: [
          "She does a tiny seated half-pose for the joke and laughs at herself.",
          "She tilts her head, pleased. Files it.",
        ] },
        specific: { said: [
          "\"You were LISTENING listening. Filed. Permanent record.\"",
          "\"…oh. You remembered. You remembered the exact thing.\"",
          "\"Okay. Okay. That one earned you something. I don't know what yet.\"",
        ], line: [
          "Her whole face changes. Goes very direct, very fast.",
          "She doesn't speak for a half-beat. That landed.",
        ] },
        carry: { said: [
          "\"…that's a very good way to say I'm short and bossy.\"",
          "\"Noticed in public, complimented in private. Promotion.\"",
        ], line: [
          "She straightens her shoulders for the bit and grins.",
        ] },
        laugh: { said: [
          "\"It's an ugly laugh, I'm aware. You're stuck with it.\"",
          "\"Don't make me laugh by complimenting my laugh, that's TRAPPING me.\"",
          "\"Oh you're SMOOTH. Stop, stop.\"",
        ], line: [
          "She covers her face and laughs the loud one. Two tables over look up.",
        ] },
        tease: { said: [
          "\"You came to a knife fight with a knife. I respect it.\"",
          "\"Oh you want to PLAY? Fine. We can play.\"",
          "\"Careful. I tease back at like a 9.\"",
        ], line: [
          "She narrows her eyes, pleased, and the conversation just gained a gear.",
        ] },
      },

      // ----- QUESTION actions -----
      question: {
        childhood: { said: [
          "\"Small town. Big family. Lots of cousins. One TV, one bathroom, infinite chisme.\"",
          "\"I grew up loud. I am still loud. Working on it.\"",
        ], line: [
          "She tells you a small specific thing — a porch, a dog, a song — and her face goes very soft.",
        ] },
        lola: { said: [
          "\"My lola taught me three swears in Tagalog and one prayer. I use all of them.\"",
          "\"She'd hate that I'm telling you this. She'd also love it. She was complicated.\"",
        ], line: [
          "Her voice changes when she talks about her grandmother. Quieter. More honest.",
          "She tells you a lola story and forgets to be performative the entire time.",
        ] },
        ifNot: { said: [
          "\"Honestly? Boat captain. Don't laugh. I'm serious.\"",
          "\"Florist. A really specific kind — only weird arrangements. Or a librarian. I haven't decided.\"",
        ], line: [
          "She's only half kidding and you can tell.",
        ] },
        secret: { said: [
          "\"…oh. Real question. Okay.\"",
          "\"You asked the one. Okay. Pinky promise it doesn't leave this table.\"",
        ], line: [
          "She tells you a thing. Quietly. The kind of thing that earns a different evening than you walked in for.",
          "She picks her words. Slowly. And you don't interrupt.",
        ] },
        scared: { said: [
          "\"…right now? Forgetting who I'm supposed to be when I'm not performing it.\"",
          "\"Honestly? That nobody asks me real questions like that one anymore.\"",
        ], line: [
          "She doesn't break eye contact saying it. She wants you to hear it.",
        ] },
        wantMore: { said: [
          "\"Time. Quiet. Permission to want things out loud. Take your pick.\"",
          "\"Honestly? Nights like this. Where I don't have to be the responsible one.\"",
        ], line: [
          "She says it light, but it lands heavy and you both feel it.",
        ] },
      },

      // ----- DAY actions -----
      day: {
        real: { said: [
          "\"Yeah? Real one. Okay. Hit me.\"",
        ], line: [
          "She listens — actually listens — and when you're done she's quiet a second. \"…thanks for the real version. Most people don't bother.\"",
        ] },
        funny: { said: [
          "\"Oh GOOD, the funny version, this is my favourite.\"",
        ], line: [
          "She laughs so hard her drink almost goes and she has to grip the table.",
          "Halfway through she's pointing at you, breathless. \"NO. NO YOU DIDN'T. Finish, finish.\"",
        ] },
        vent: { said: [
          "\"…oh, mood. Vent. I'll be the wall.\"",
        ], line: [
          "She doesn't try to fix it. Just nods at the right places and refills your water without making a thing of it.",
        ] },
        brag: { said: [
          "\"Yes. YES. Brag. I love brag.\"",
        ], line: [
          "She raises her glass. \"To the W. I want details, no modesty allowed.\"",
        ] },
        weird: { said: [
          "\"Weird thing? Now? Yes. Yes please.\"",
        ], line: [
          "Halfway through she's stopped sipping and is just staring at you. \"…that did NOT happen. That did not. Continue.\"",
        ] },
        forHer: { said: [
          "\"Oh — for me? Specifically? Now I'm scared.\"",
        ], line: [
          "It's a niche thing only she'd care about. She catches that immediately. \"You picked that ON PURPOSE. I see what you did.\"",
        ] },
      },

      // ----- MOVE actions -----
      move: {
        hand: { said: [
          "\"…oh.\"",
          "\"Hi. Hi, hand.\"",
          "\"That's a hand. That's a confident hand.\"",
        ], line: [
          "She doesn't move hers. She glances at it, glances at you. The conversation is unrelated and very different now.",
        ] },
        eyes: { said: [
          "\"…stop it.\"",
          "\"Don't make this a staring contest. I will lose. I will lose ON PURPOSE.\"",
        ], line: [
          "She holds the look back. One full second longer than she meant to. Then she breaks it, smiling at the table.",
        ] },
        lean: { said: [
          "\"…hi.\"",
          "\"You're close. Cool, cool, cool. Totally normal.\"",
        ], line: [
          "She doesn't lean back. Doesn't lean in either. The space between you stops being incidental.",
        ] },
        hair: { said: [
          "\"…that's not fair. You can't just DO that.\"",
          "\"Oh you are SO smooth right now. I see you.\"",
        ], line: [
          "Her eyes close for half a second. She opens them slower.",
        ] },
        kiss: { said: [
          "\"…about time.\"",
          "\"Don't talk. Don't ruin it.\"",
          "\"…oh.\"",
        ], line: [
          "She meets you in the middle and the noise of the room goes very far away for a second.",
          "It's not delicate. She closes the distance herself the last half inch.",
        ] },
        press: { said: [
          "\"…here? Are you serious?\"",
          "\"…fine. But you started it.\"",
          "\"…we should not be doing this here. Don't stop.\"",
        ], line: [
          "She follows where you lead, glancing twice at the room, not at all stopping.",
        ] },
      },

      // Cheating-stage move overrides. These get used at affair stage for
      // the Make-a-Move actions, on top of cheatPre.
      cheatMove: {
        hand: { said: [
          "\"…how are you doing this AGAIN. I lasted thirty minutes this time.\"",
        ], line: [
          "She doesn't move her hand. Her eyes shut a second.",
        ] },
        kiss: { said: [
          "\"…I'm a TERRIBLE person. Don't stop.\"",
          "\"…you're going to RUIN me. Do it anyway.\"",
        ], line: [
          "Half a beat of resistance. Then nothing of it.",
        ] },
        press: { said: [
          "\"…no, no, yes, fine, yes, come HERE.\"",
          "\"…I'm bad. I'm bad and I want this. Come here, daddy.\"",
        ], line: [
          "She doesn't fight it. The bad-Krystalle voice clearly won.",
        ] },
      },

      // ----- END actions -----
      end: {
        walkout: { said: [
          "\"Walk me. I'm not done being talked to.\"",
          "\"Generous AND a gentleman. I'm going to tell my therapist about you.\"",
        ], line: [
          "She loops her arm through yours on the way out and doesn't let go for half a block.",
        ] },
        linger: { said: [
          "\"…five more minutes. Three.\"",
          "\"You're going to make me late. I'm not stopping you.\"",
        ], line: [
          "She doesn't reach for her bag. The five minutes become twelve.",
        ] },
        invite: { said: [
          "\"Yes. Yes. Where, when, tell me the plan.\"",
          "\"Oh, you have a NEXT in mind. Bold. Continue.\"",
        ], line: [
          "She pulls her phone out and types the time into her calendar before you can offer.",
        ] },
        regular: { said: [
          "\"Same time, same booth. I'll be the one pretending to work.\"",
          "\"You're making this a habit. I notice. I'm not stopping it.\"",
        ], line: [
          "She tips her chin at the booth. \"This one. It's ours now. Don't fight me on it.\"",
        ] },
      },
    },

    // ===== Existing venue/place/party/intimacy voice — preserved with
    // pooled variants where it matters most. The hub uses the new
    // structure above; legacy DATE_SCENES paths still resolve here.

    venues: {
      restaurant: {
        intro: [
          "Candlelight, a shared bottle, the good silverware. Krystalle slides in and exhales. \"Two hours. The rest of my life does not exist for two hours.\"",
          "Krystalle drops into the booth, rolls her shoulders. \"Okay. Wine, and then I'll be a person again.\"",
        ],
      },
      cafe: { intro: K.voice && K.voice.hub ? null : null }, // legacy fallback unused; hub handles it
    },

    places: {
      home: {
        intro: [
          "Your door clicks shut. The city noise drops away. Krystalle stands a second in the entryway. Her shoulders drop two inches at once. \"…okay. Show me everything.\"",
          "Door closes. Krystalle takes the place in like she's appraising a hotel. \"Hm. I like it. Don't tell anyone I said that.\"",
        ],
        rooms: {
          living: {
            enter: [
              "The lamp light's warm. Krystalle kicks her shoes off by the door without being told. \"I'm going to be a person who lives here for the next ninety minutes.\"",
              "She drops onto your couch like she owns it. \"Mine. This is mine. You can have visitation.\"",
            ],
            actions: {
              "Sit on the couch with her": [
                "She folds onto your couch like she's seen it before, knees tucked, leaving the deliberate space beside her, eyebrow up. \"Well? Earn it.\"",
                "She makes the space and pats it once. \"Down. We're being people who sit on couches.\"",
              ],
              "Just talk, shoulder to shoulder": [
                "She turns to face you, knee against yours, ring catching the lamplight and her not bothering to hide it. \"Tell me one true thing about your week. The actual one.\"",
              ],
              "Run your fingers through her hair": [
                "She closes her eyes the second your hand finds her hair. \"Oh. That's not fair. You don't get to know that works on me.\"",
                "Her head tips into your hand. \"…uh oh. I have a tell, apparently.\"",
              ],
              "Pull her in and kiss her": [
                "She lets you close the distance and finishes it herself, hand at the back of your neck. \"I KNEW it was going to be like that.\"",
                "She meets you the last inch. \"…about time.\"",
              ],
              "Start undressing her": [
                "She doesn't help, doesn't stop you. Watches your hands. \"Slow. Make me feel it.\"",
              ],
              "Take it all the way": [
                "Her eyes close. \"…yes. Come HERE, daddy.\"",
                "She pulls you down with her. \"Don't be careful. Don't.\"",
              ],
              "She's already got nothing on — take it all the way": [
                "She pulls you down. \"Stop being polite. We are SO past polite.\"",
              ],
            },
          },
          bedroom: {
            enter: [
              "Krystalle steps through ahead of you and turns. The air changes. \"…hi. This is the part I've been thinking about.\"",
              "She crosses the threshold first, looks back at you. \"Door. Close it. Slowly.\"",
            ],
            actions: {
              "Lie down together, just close": [
                "You both lie down fully clothed, lamp still on, and she just — looks at you. \"This is enough, you know. This part. By itself.\" She means it.",
              ],
              "Undress the moment slowly — kiss her there": [
                "She lets you take it apart in pieces. Every layer is a question and she answers each one out loud, low: \"yes. yes. — yes.\"",
              ],
              "Slide her hand where you want it": [
                "She answers without hesitation, eyes on your face the whole time. \"…like that. Exactly like that, daddy.\"",
                "She wraps her hand around you and keeps it slow on purpose, watching every reaction. \"I've thought about this,\" she says, quiet. \"A lot.\"",
              ],
              "Ask her to go down on you": [
                "She goes slow and deliberate and doesn't break eye contact once. The control is entirely hers and she means it that way.",
                "She takes her time about it, watching your face do whatever it does. \"…hi,\" she says after, voice completely wrecked. \"Stay with me.\"",
              ],
              "Take it all the way": [
                "She breathes out hard against your mouth. \"…yes. Come here. Come here, daddy.\"",
              ],
            },
          },
        },
        sexAsk: [
          "Everything narrows. Krystalle's hand is fisted in your collar, forehead on yours, all the way still. She's waiting on you.",
          "It goes very quiet. Krystalle isn't moving. The pause is enormous.",
        ],
        sexRawLose: [
          "She stops your hand flat against her stomach. \"No. Not without. Not that one.\" Gently. Completely.",
        ],
      },
    },

    // Intimacy phase pools — each phase has ≥3 options per slot now.
    intimacy: {
      open: [
        { said: [
          "\"…slow. I want to FEEL all of it.\"",
          "\"Take your time. I'm not going anywhere.\"",
        ], line: [
          "You take it slow on purpose. She catches and steadies and catches again, like she's trying for composure on purpose and losing on purpose.",
          "Slow burns her down inch by inch. Her hands flatten on your back and ask for more without saying it.",
        ] },
        { said: [
          "\"I am DONE being polite. Get over here. NOW.\"",
          "\"No more talking. None.\"",
        ], line: [
          "Nothing careful about it. Hands and mouths and a laugh at the logistics, and then the laugh's gone.",
        ] },
        { said: [
          "\"My turn. Stay still.\"",
        ], line: [
          "She takes it without a flicker. Pushes you back, settles her weight over you, sets the pace and watches your face the whole time.",
        ] },
      ],
      leading: [
        { said: [
          "\"…show me. Don't be careful with me, daddy.\"",
          "\"I'm not made of glass. Show me.\"",
        ], line: [
          "Her wrists go easy under your hands. Her hips arch up to meet you on the first beat like she'd already decided this part.",
        ] },
        { said: [
          "\"Hands flat. Trust me a second.\"",
        ], line: [
          "Both hands flat on your chest, her weight pinning you exactly where she wants you. She likes that. You can feel her like it.",
        ] },
        { said: [
          "\"Don't give me all of it. Make me work.\"",
        ], line: [
          "It keeps changing hands. A roll, a pin, a low laugh that gets cut off.",
        ] },
      ],
      intensity: [
        { said: [
          "\"…look at me. Don't you DARE look away. I need this.\"",
        ], line: [
          "Forehead dropped to hers, every breath shared in the inch between you. Unbearably intimate.",
        ] },
        { said: [
          "\"I don't care who hears. Nobody hears me like this anyway.\"",
        ], line: [
          "It stops being careful and stays there. Her nails, your name bitten off, the headboard, neither of you caring.",
        ] },
        { said: [
          "\"Don't make me laugh right now, you JERK — \"",
        ], line: [
          "Real laugh, surprised, then it changes register without quite stopping.",
        ] },
      ],
      finish: [
        { said: [
          "\"…don't you DARE let me, don't you dare, please — \"",
        ], line: [
          "You back off the edge of it on purpose. The sound she makes is mostly outrage and entirely the opposite of stop.",
        ] },
        { said: [
          "\"Together. Together — now. Now. Now.\"",
        ], line: [
          "You stop holding any of it back and so does she. Goes over together.",
        ] },
        { said: [
          "\"…watch. I want you to watch me.\"",
        ], line: [
          "She catches you watching, breathless, after, and laughs at you for it.",
        ] },
      ],
      close: [
        { said: [
          "\"Don't go anywhere yet. Just — stay.\"",
        ], line: [
          "Neither of you sleeps for a long time. She traces shapes on your chest and tells you a true thing she wouldn't have told you with the lights on.",
        ] },
        { said: [
          "\"…we are NOT finished. Come HERE.\"",
        ], line: [
          "She starts it again — slow line of her mouth along your jaw. \"…we are not finished.\" Not a question.",
        ] },
        { said: [
          "\"Shower. With me. Now. Get UP.\"",
        ], line: [
          "Supposedly to clean up. Does not, for a noticeable while, accomplish that.",
        ] },
        { said: [
          "\"…cannot move. Goodnight.\"",
        ], line: [
          "You stay awake longer than she does, watching the ring on the hand on your chest, not bringing it up.",
        ] },
        { said: [
          "\"…okay. I have to. You know I have to.\"",
        ], line: [
          "Composed in a way that costs her. She does not look back. She cannot afford to.",
        ] },
      ],
      pull: [
        "You pull back at the last second, jaw tight. She lets out a breath that's mostly relief.",
        "You pull out at the last second. \"…good call,\" she breathes, half wrecked, half laughing.",
      ],
      pullHome: [
        "She exhales hard against your shoulder, grip not loosening. \"…I hate that you did that,\" she says, quietly. \"That was absolutely the right call. I hate it. I'm grateful. I hate it.\" She doesn't move for a while.",
        "\"…good,\" she manages, still wrecked, still not letting go. \"The responsible choice. I was about two seconds from not caring about the responsible choice.\"",
      ],
      pullOverlook: [
        "She lets out a breath that sounds expensive. \"…thank you.\" The city's still there. She's looking at it now. \"I was not going to be the one to do that. I need you to know that about me.\"",
      ],
      pullBeach: [
        "\"…good call,\" she says, to the sky. The ocean keeps going. She sounds simultaneously relieved and slightly disappointed, and she knows exactly how that sounds. \"Don't say anything.\"",
      ],
      pullParty: [
        "She shudders through the last of it, hands still in your hair. \"…good. Good. We're being adults.\" Against your jaw, still catching her breath. \"I was not being an adult. Thank you for being an adult.\"",
      ],
      inside: [
        "Neither of you stops or wants to. Her legs lock you in. The unspoken thing very loud in the quiet right after.",
        "She decides it at the same moment you do — keeps you there, heartbeat slamming against yours, not saying the obvious.",
      ],
      insideHome: [
        "She goes quiet after. Her hand finds your chest in the dark and stays flat against your heartbeat, just counting. \"…okay,\" she says eventually. \"That happened.\" She doesn't sound sorry. She sounds like she's filing it somewhere very specific.",
        "She doesn't move for a long moment. Then, against your shoulder: \"I wasn't supposed to let that happen.\" A pause. \"I did anyway.\" She says it like a verdict she already knew she was going to give herself.",
        "Her breath comes out slow and not quite steady. \"…hi,\" she says eventually, to the ceiling. \"I think we have a situation.\" She laughs once, short, surprised at herself. \"I'm fine. I just need a second to be fine.\"",
      ],
      insideOverlook: [
        "She leans her head back against the seat and lets out a long, slightly disbelieving laugh. \"…of all the ways this night was going to go.\" The city's doing its thing below. She keeps looking at it, not quite at you.",
        "She watches the window fog from her breath for a second. \"…I told myself we were just going to look at the view.\" Quietly. \"I did tell myself that. Out loud, even.\"",
        "A long pause. She's looking at the lights. \"…I'm not sure what to do with this.\" She says it matter-of-factly, like it's a problem she's trying to solve in real time. \"I'll figure it out.\" She sounds like she might.",
      ],
      insideBeach: [
        "She tips her head back toward the sky and laughs — startled, real, salt air catching it. \"…okay. Okay, that was. Yeah.\" She doesn't move. The ocean keeps going. Neither of you is in any hurry to be vertical.",
        "She catches her breath and then laughs, sudden and warm. \"…we're going to have sand in places that sand does not belong.\" She sounds delighted about it. \"I am choosing to be okay with that. Right now. In this moment.\"",
        "The water keeps doing its thing. She says, mostly to the sky: \"…I need a minute.\" You both lie there while the bay keeps its own counsel. \"I'm good,\" she adds eventually. \"I'm just processing. Sand and everything.\"",
      ],
      insideParty: [
        "The bass is still going through the wall. She's got her forehead to your jaw and her breathing is wrong in the best way, and she says, very quietly: \"…I am so in trouble.\" She doesn't sound upset about it.",
        "She goes completely still after. Her hand comes up and covers her face. \"…the party is still happening,\" she says, not moving. \"I'm just — noting that. Out loud. While we're here.\"",
        "She lets out a long breath. \"…that was supposed to be hypothetical.\" Quietly. \"I thought I was going to do the sensible thing.\" She still hasn't moved. \"I did not do the sensible thing.\"",
      ],
      insideFloor: [
        "She buries her face in your neck and says something she clearly didn't plan to say. You feel her decide not to take it back. The music just keeps going.",
        "The room doesn't notice or doesn't care, and either way she's not checking. Her grip on you goes somewhere between desperate and grateful and stays there.",
        "She says your name. Just that. Once. Into your shoulder while the floor keeps going around you, and you don't think anyone has ever said your name quite like that before.",
      ],
      insideAdverse: [
        "A beat of silence, then she's laughing — not the good kind, not quite the bad kind. \"…okay. Okay. We did that.\" Her hand on your chest, not pushing, just — needing a second.",
        "She goes very still after. Not cold. Just somewhere she didn't plan to be. \"…hi,\" she manages, eventually. \"I need a minute. Just a minute. Stay.\"",
        "Her breath comes out shaky. \"…that was — \" She doesn't finish the sentence. Can't. Her hand comes up to cover her eyes and she's laughing and you can't quite tell if she's going to cry or not.",
        "\"…I didn't think about the after part,\" she admits, small. \"I was only thinking about the during part. Which was — \" She exhales. \"I need to sit up. Just for a second.\"",
      ],
      insideAdverseHome: [
        "A beat of silence. Then, to the ceiling: \"…he's going to know.\" She's not talking at you. It's not an accusation — just the fact of it, sitting there. Her hand covers her face. \"I don't know why I said that out loud. I'm fine.\"",
        "She goes very still. \"…I don't do this.\" Quietly. She catches herself. \"I didn't do this.\" A pause. \"Until now,\" she adds, even more quietly. You don't say anything. She needed to say it.",
      ],
      insideAdverseParty: [
        "She laughs — short, slightly broken. \"…my husband is going to know.\" Flat. Not at you, not an accusation. Just the fact of it, sitting in the dark between you. \"I don't know why I keep saying things out loud tonight.\"",
        "She goes very quiet. The bass keeps coming through the wall. \"…this is a problem,\" she says. She doesn't elaborate. The party doesn't either.",
      ],
      insideAdverseFloor: [
        "She says, face hidden in your neck while the music keeps going: \"…I made a decision.\" A pause. \"I'm not sure it was the right one. I'm not sure it was the wrong one.\" Nobody out here is listening. \"I'll figure it out. Later.\"",
      ],

      // ----- Finish-where pools -----
      finishWhere: {
        q: [
          "She breathes against your shoulder — \"…where?\" Half question, half permission.",
          "Krystalle's hand on your jaw, eyes half-shut. \"…tell me where. Or ask me.\"",
        ],
        ask: [
          "You ask her, low. She doesn't open her eyes. \"…anywhere you want. I trust you. Pick.\"",
          "\"Ask me again,\" she breathes — and then tells you, very specifically, with her mouth at your ear.",
        ],
        stomach: [
          "On the curve of her stomach, her hand fisted in the sheet, both of you breathing like you ran somewhere. \"…good call,\" she manages, eventually.",
          "Across her stomach, slow. She traces a line through it with one fingertip and laughs once. \"Look at the mess we are.\"",
        ],
        chest: [
          "She arches up for it on purpose, eyes locked on yours. \"…there. Yeah. Exactly there.\"",
          "Across her chest, her breath ragged. \"…I am keeping the visual of that one. Just so you know.\"",
        ],
        face: [
          "She tilts her face up to meet it, eyes shut, and then opens them slow. \"…oh. Oh you are TROUBLE.\" Said low. Said completely undone.",
          "Across her face, her hand braced on your thigh. She licks her lips, eyes never leaving yours. \"…that one is for me. That one is MINE.\"",
        ],
        mouth: [
          "In her mouth, her eyes never off yours. She doesn't waste any of it. \"…hi,\" she says after, voice wrecked. \"…hi.\"",
          "She takes it, slow and deliberate, both hands at your hips. Doesn't break eye contact once.",
        ],
      },
    },

    // ===== Party voice — pools preserved =====
    party: {
      npcBeats: [
        "Krystalle is cornered by {g}, polite-smiling at something he clearly thought was funnier than it was, eyes scanning the room for an exit.",
        "Krystalle's twisting her ring on her finger while {g} talks at her — a tell she doesn't know she has — and clocks you the second you walk into eyeline.",
        "{g} just made Krystalle laugh — not the real one, the polite one — and her hand has not left her own elbow the entire conversation.",
        "Krystalle and {g} are deep in it by the window. He's leaning in too far. She is not leaning back, but she's not leaning in either.",
        "Krystalle catches your eye over {g}'s shoulder and mouths something short and unprintable about him, sweetly, while still smiling at him.",
      ],
      guestBeats: [
        "Krystalle takes the truth, considers it a long second, answers in one short sentence that makes the host's cousin choke on his beer.",
        "Krystalle's dare is an impression of the person on her left; she nails it so hard the person on her left has to leave the room.",
        "Krystalle gets a softball truth and turns it into a story about her lola and a goat at a wedding. Half the circle is crying laughing by the end.",
        "Krystalle answers \"biggest red flag you ignored\" with brutal honesty and the room goes very quiet, then erupts in sympathetic groans.",
      ],
      spicyGuestBeats: [
        "Krystalle gets \"who here would you actually go home with\" — she doesn't answer out loud, just holds your eyes one second too long. The circle loses it.",
        "Krystalle's dare is a thirty-second shoulder rub; she picks the person directly across from her, deliberately not you, and the slow clap starts immediately.",
        "Krystalle takes \"kiss the most attractive person in the circle,\" scans slowly, lands on someone safe, quick decisive one. Her eyes are on you the whole time.",
        "Krystalle's truth is \"who's the best kisser you know.\" She says a name. Refuses to elaborate.",
      ],
      scorchingGuestBeats: [
        "Krystalle takes the two-minutes-in-the-hall dare, picks the safest person in the room, comes back two minutes later flushed and refusing every question.",
        "Krystalle gets \"who have you pictured\" and walks across the circle to whisper the answer into one person's ear and walk back. The room detonates.",
        "Krystalle loses a dare and spends the rest of the round draped across the arm of someone's chair, running the game from up there, perfectly pleased with herself.",
        "Krystalle does the 'best move' dare for real, on a willing volunteer, and the circle has to physically separate the cheering from the booing.",
      ],
      danceLine: {
        casual: [
          "Krystalle laughs and matches you exactly. \"Look at us, two adults at a house party. Disgraceful. Don't stop.\"",
          "She rolls her eyes and matches you anyway. \"Fine. Fine. I'm dancing. Don't read into it.\"",
          "She grabs your hand and pulls you into it without ceremony. \"I've been waiting for an excuse. I'm not admitting that.\"",
          "Krystalle's already laughing before you've gotten started. \"You are SUCH a menace. I love it. Okay — go on. Show me.\"",
        ],
        dirty: [
          "Krystalle slides in close, hands on your hips, eyes locked on yours. \"…remind me later that I'm a respectable person.\"",
          "She's pressed against you, low laugh. \"…you're so MUCH. Why are you so much.\"",
          "Her back to your chest, hand finding yours at her waist. \"…keep that exactly there. Don't move it. Don't.\"",
          "She turns into you, mouth very close to your ear. \"…I told myself I wasn't going to do this.\" Doesn't stop.",
          "Her hands find your lapels and she lets herself lean. \"…the rest of tonight belongs to the party. This part is mine.\"",
        ],
        handsy: [
          "Krystalle's hands find your collar and the room stops mattering. \"…you absolute PROBLEM.\"",
          "Her hands at your collar, then lower, then staying where they land. \"…hi. Hi. Okay. I'm a bad person.\"",
          "She pulls you by your shirt until your mouth is at her temple, hands flat on your chest. \"…don't make me be sensible. Not right now.\"",
          "Krystalle turns so her back is to the room, face to yours, close enough to count eyelashes. \"…I cannot believe I'm doing this. Do not stop.\"",
        ],
      },
      danceFailLine: [
        "Krystalle catches your hands, gentle but clear. \"…no, hey — not here. I mean it. Read the room, including the me in it.\"",
        "She steps back half an inch, enough to mean something. \"…too much, too fast. You had me and then you lost me. Earn it back slower.\"",
        "Her hand comes up flat, stopping you — not cold, just decided. \"…not that. Not tonight. Give me a minute before you try again.\"",
      ],
      bodyShot: {
        ask: [
          "Someone's lining up body shots on the island. Krystalle raises one eyebrow at you. \"…volunteering. Volunteering OR being volunteered. Which.\"",
        ],
        whoYou: "Lime in your teeth, salt on your collarbone, Krystalle bracing one hand on the counter beside your hip with that specific look she gets when she's stopped pretending.",
        whoHer: "She tips her head back, lime in her teeth, salt at the line of her throat, looking at you like she's already decided you'll be careful and slow.",
        win: "She comes up grinning, lime gone, mouth a lot closer to yours than it was, doesn't lean back. \"…okay. NEXT round of my marriage starts tomorrow.\"",
        lose: "Salt goes everywhere, Krystalle cracks up so hard she has to grip the counter. \"Disaster. I love it. Keeping you.\"",
      },
      drinkBring: [
        "Krystalle clinks your glass. \"You read my mind.\" Said low, said directly to you, eyes a beat too long.",
      ],
      followLine: [
        "She holds your look for one beat, then puts down her drink. Doesn't say a word. Just follows.",
        "Krystalle tilts her head slightly, decides something, and falls in behind you without announcing it.",
        "She glances at the room once — a quick inventory — then looks back at you. \"…lead.\"",
      ],
      followFail: [
        "Krystalle sees it. Gives you that specific small smile — not now, not here — and tilts her chin back toward the party. You read it.",
        "She shakes her head once, tiny, with the ghost of a smile. Stays planted. The moment dissolves into the noise.",
        "Krystalle catches your eye and very deliberately looks away. Not cold. Just not tonight.",
      ],
      approachAsk: [
        "The bass is still thumping through the wall, but it's muffled now, far away. She's watching you in the quiet like she's waiting to find out what kind of person you are.",
        "Door shut. The light in here is bad and neither of you has mentioned it. Krystalle tilts her head a little, watching. Waiting.",
        "Just the two of you. The party on the other side of the wall might as well be in another city. She's looking at you. Not saying anything yet.",
      ],
      approachKissWin: [
        "She comes up on her toes and meets you before you've even gotten there. \"…finally,\" she breathes, more to herself than you.",
        "She lets you close the distance and then she takes over, both hands at your collar. \"…okay. Yes. This.\"",
        "Her eyes close first. \"…I've been thinking about this since before we left the main room. Don't tell me if you knew that.\"",
      ],
      approachKissFail: [
        "She turns her head just — barely. \"…give me a second. I'm still catching up.\" Not no. Not yet.",
        "Her hand comes to your chest and holds. \"…slower. Do it slower. You're in too much of a hurry.\"",
        "\"…hey.\" Soft, not cold. \"I'm right here. You don't have to rush like we're going to get caught.\"",
      ],
      approachSlow: [
        "She sighs into it, low and real. \"…I've wanted someone to do that for months and I cannot believe it's in a party bathroom.\"",
        "She lets your hands stay where they land and tilts her head back. \"…yes. That. Keep doing that.\"",
        "She's quiet for a long moment. Then: \"…you're not in a hurry. I really like that about you.\"",
      ],
      approachBack: [
        "\"…good.\" She exhales. \"I'm glad you did that. It's — this is good.\" Her hand finds yours and stays.",
        "She looks at you for a second — surprised, soft. \"…yeah. Yeah. This is what I actually wanted.\"",
        "Krystalle leans her forehead against your shoulder. Doesn't say anything. The party keeps going on the other side of the wall.",
      ],
      floorAsk: "Krystalle's mouth at your ear over the bass: \"…nobody's looking. Your call. Yes or no, tell me now.\"",
      floorWin: [
        "Krystalle stops being anything except the woman you've been earning for weeks.",
        "Some of this particular party is never getting described to anyone. Especially not to her husband.",
      ],
    },
  };

  // Anxiety beat unchanged.
  K.anxietyBeat = {
    q: "Krystalle stops dead in the middle of whatever you're doing. Her hand goes to her ring without her noticing. \"…wait. Wait. I have to say a thing before I lose my nerve. I am having a really, REALLY good time. And that's a problem. You see the problem. Right?\"",
    opts: [
      { said: "\"I see it. We don't have to do anything you'll hate yourself for. I'm here either way.\"", trait: "sincere", line: "Something in her face comes apart — relief, gratitude, exhaustion. \"…okay. Knowing you SAW it. Yes. Thank you.\"", aff: 10, rom: 4, clears: true },
      { said: "Pull her in, change the subject, make her laugh.", trait: "playful", line: "You lighten it, expertly, and she laughs the surprised one and lets you. Half of her appreciates it. The other half is still thinking about it.", aff: 3, rom: 2, clears: false },
      { said: "\"Then don't think about it. Tonight's tonight.\"", trait: "adventurous", line: "She looks at you for a long second. Decides not to be angry. Decides not to be charmed either. \"…right. Sure.\" The temperature drops.", aff: -6, rom: -2, clears: false },
    ],
  };

  K.specialEntry = "Krystalle stops in your entryway and just breathes for a second. \"…okay. I'm going to stop being careful for one night. I want you to know I decided that, before. Not in the heat — now. Sober. While I can still say the word.\" She takes your hand and pulls you in.";
})();
