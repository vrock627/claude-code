// Krystalle's voice overrides. Loaded after data.js; mutates the
// CHARACTERS entry. The engine looks up these paths via voiceFor() and
// falls back to the shared pool when an entry is missing.
(function () {
  const K = window.GAMEDATA.CHARACTERS.krystalle;
  if (!K) return;

  // Each venue mirrors DATE_SCENES[venue].beats by index. opts are also
  // by index, so reordering the shared scene without updating this file
  // is caught by _smoke.js (opt-count parity check).
  const venues = {
    restaurant: {
      intro: "Candlelight, a shared bottle, the good silverware. Krystalle slides in across from you and exhales like she's been holding her breath all week. \"Two hours. The rest of my life does not exist for two hours. Tell me you brought your A-game.\"",
      beats: [
        { q: "Krystalle slides the menu toward you. \"Surprise me. Don't make it tofu. I will divorce you on the spot.\"", opts: [
          { said: "\"You've handed your dinner to me. Bold.\"", line: "She watches you order like it's a sport. \"Yeah. THAT. That's the energy I came here for.\"" },
          { said: "\"Tell me what you actually love here. Not the safe one.\"", line: "Slow surprised smile. She tells you the real one and doesn't take her eyes off your face the whole time she says it. You order that." },
          { said: "\"Tasting menu. All of it. Don't fight me.\"", line: "She laughs once, delighted. \"Oh, you ARE trouble. Roll me out of here. I dare you.\"" },
        ] },
        { q: "Krystalle watches you over her glass, ring throwing little light. \"Your turn. Ask me something nobody else asks me.\"", opts: [
          { said: "\"What's the thing you never get to talk about?\"", line: "She goes very still, then tells you. Quietly. The kind of true thing that earns a different evening than you walked in for." },
          { said: "Tell her the most ridiculous story you've got.", line: "She laughs the loud honest one — turns heads at two other tables — and points at you with her fork. \"More. Immediately. More of those.\"" },
          { said: "Let the silence sit, comfortably.", line: "She holds your eyes through a long quiet beat. \"Most people fill that.\" A small, pleased smile. \"You don't. Noted.\"" },
        ] },
      ],
      bill: {
        intro: "The folio lands. $42. Krystalle nudges it sideways toward you with one finger and doesn't pretend not to. \"You said dinner was on you. I'm holding you to your energy.\"",
        lines: {
          tab: "\"Mm. Thank you.\" Said directly. No theatrics. She likes that you didn't perform it.",
          split: "\"Civilised. I like civilised.\" Card down, no fake-arguing. She didn't pretend.",
          cheap: "Her mouth flattens. \"…oh.\" She covers, gracefully. She clocks it. So does the night.",
        },
      },
    },
    cafe: {
      intro: "Corner table, two coffees, the low churn of other people's afternoons. Krystalle wraps both hands around her cup like she's stealing the warmth and grins at you. \"You're my favourite emergency exit. I'm not even joking.\"",
      beats: [
        { q: "Krystalle squints at the chalkboard menu like it personally wronged her. \"Order for me. I trust you. Mostly.\"", opts: [
          { said: "\"One of your usual, from memory.\"", line: "She blinks. \"…you remembered.\" Said like she's mad, isn't. The whole afternoon recalibrates around that." },
          { said: "\"I dare you to order the weirdest thing on there.\"", line: "She points at the weirdest item without looking. \"Done. You're getting half. I am NOT suffering alone.\"" },
          { said: "Get matching ridiculous pastries.", line: "She picks the most absurd-looking thing in the case and makes you pick its twin. Then she takes a photo \"for evidence,\" which she is absolutely sending you later." },
        ] },
        { q: "Krystalle goes quiet. Stirs her coffee twice. \"This week's been a lot. Some of it's me, some of it's home stuff. Sorry. Pretend I didn't bring it.\"", opts: [
          { said: "Listen. Actually listen. Don't fix anything.", line: "You don't say a single thing for almost a full minute and she tells you the whole shape of it. Both hands flat on the table. \"…thank you. Most people try to fix it before I'm done explaining it.\"" },
          { said: "\"Okay — what do we do about it?\"", line: "She lets you have a plan. Half of it's stupid; she takes the other half. \"You're a menace. But yeah — I can do that part.\"" },
          { said: "Make her laugh about it.", line: "One stupid joke and she laughs into both hands, eyes wet. \"You're terrible. Genuinely terrible. Thank you.\"" },
        ] },
      ],
      bill: {
        intro: "Two coffees and a tip. $14 if you're being generous. Krystalle eyes the receipt, then you, eyebrow up.",
        lines: {
          tab: "\"You didn't have to. — okay. Thank you.\" Direct. She clocks it. She doesn't fight it.",
          split: "\"Mm. Easy. I like easy.\" Card down, no theatre.",
          cheap: "She pays the whole thing without a word, gracefully, and the air in the booth cools by two degrees you can feel.",
        },
      },
    },
    park: {
      intro: "A blanket, cheap snacks, the whole open afternoon. Krystalle kicks her shoes off the second the blanket's down. \"Grass. Real grass. I'm rich now.\"",
      beats: [
        { q: "Krystalle points at a cloud, eyes closed against the sun. \"That one. Tell me what it is. Lie if you have to.\"", opts: [
          { said: "Invent an absurd backstory for it.", line: "You give the cloud a tragic origin and three failed marriages. She laughs so hard she has to roll onto her side. \"…oh no. Oh no, I love it. Continue.\"" },
          { said: "Lie back and just watch with her.", line: "You both go quiet on your backs in the grass and don't say a word for a long minute. Her hand finds yours without looking and stays." },
          { said: "\"Race you to those trees.\"", line: "She's up before you finish the sentence, half-laughing, half-actually-racing, and the rest of the picnic happens out of breath." },
        ] },
        { q: "Golden hour. Krystalle's lit up like a painting and she knows it. \"Say something embarrassing. Something real.\"", opts: [
          { said: "Tell her something true.", line: "You say it quiet and she goes quiet, doesn't take her eyes off you. \"…oh,\" she says, eventually. Soft. \"You don't say things like that lightly. I noticed.\"" },
          { said: "Pull her up to dance with no music.", line: "She lets you. Barefoot in the grass, one hand at the back of your neck. \"This is the corniest thing anyone's ever done to me. Don't you DARE stop.\"" },
          { said: "Keep her guessing.", line: "You smile and don't answer and she pokes your ribs. \"Mean. You're being mean on purpose.\" She's enjoying it. Visibly." },
        ] },
      ],
    },
    club: {
      intro: "Bass through the floor, light cutting the dark. Krystalle takes one look around and says, flat in your ear, \"This is not my scene. So I'm going to commit to it anyway. Keep up.\"",
      beats: [
        { q: "Krystalle's already pulling you toward the floor. \"You brought me here. You finish me.\"", opts: [
          { said: "Go all in, no hesitation.", line: "You match her instantly and she laughs in your ear, surprised. \"Oh — you actually CAN. Okay. Different game now.\"" },
          { said: "Hang back, watch her move.", line: "She catches you watching, holds it one full second longer than she has to, and gives you the small wicked smile she clearly does not hand out a lot." },
          { said: "Make a deliberately goofy bit of it.", line: "She loses it. Full laugh, head back, has to grab your shirt for balance. \"You absolute IDIOT. Don't stop. Don't stop. Don't stop.\"" },
        ] },
        { q: "Some guy tries to cut in, hand on her elbow. Krystalle does not move it.", opts: [
          { said: "Stay cool. Let her handle it.", line: "She handles it in about eight words you don't quite catch, then steps back into you without breaking eye contact with you the whole time. He evaporates. She clearly enjoyed having an audience for it." },
          { said: "Smoothly close the space, hand at the small of her back.", line: "She leans the line of herself into the hand without breaking her sentence; he reads the room and goes. \"…that was hot. Do it again later.\"" },
          { said: "Buy the whole booth a round.", line: "Three drinks land, the booth cheers, the guy joins the cheers, and the moment dies of generosity. She squeezes your hand. \"Slick.\"" },
        ] },
      ],
      bill: {
        intro: "Bottle service plus a round you didn't plan on. About $35 of damage. Krystalle waves the bill at you with the exaggerated shrug of someone who is absolutely not paying for this.",
        lines: {
          tab: "She watches you do it without comment, then leans across and kisses you on the cheek like a stamp. \"Noted. Banked. Continue.\"",
          split: "\"Fair, fair. We split the damage, we share the credit.\" Card down. Easy.",
        },
      },
    },
  };

  // HOME / OVERLOOK / BEACH: per-room enter + per-action voice keyed by
  // the label. Engine prepends `said` and replaces narration with `line`.
  const places = {
    home: {
      intro: "Your door clicks shut behind you both. The city noise drops away. Krystalle stands a second in the entryway, taking the place in, and then her shoulders drop two inches at once. \"…okay. This is nice. Show me everything.\"",
      rooms: {
        living: {
          enter: "The lamp light's warm. Krystalle kicks her shoes off by the door without being told. \"I'm going to be a person who lives here for the next ninety minutes. Fair warning.\"",
          actions: {
            "Sit on the couch with her": "She folds onto your couch like she's seen it before, knees tucked, leaving the deliberate space beside her, eyebrow up. \"Well? Earn it.\"",
            "Just talk, shoulder to shoulder": "She turns to face you, knee against yours, ring catching the lamplight and her not bothering to hide it. \"Tell me one true thing about your week. The actual one.\"",
            "Run your fingers through her hair": "She closes her eyes the second your hand finds her hair. \"Oh. That's not fair. You don't get to know that works on me.\"",
            "Give her a massage": "She turns her back to you and lifts her hair out of the way. \"Don't be impressive. I will fall asleep. Warning you in advance.\"",
            "Her shoulders": "\"…okay. I take it back. BE impressive.\" Half a groan, half a laugh, all the way into the cushion.",
            "Down her back": "She lets out a slow breath that sounds like every meeting from her week leaving her body in a line.",
            "Her thighs": "She doesn't stop you. \"…that is — not my back.\" Said evenly. Said without moving an inch.",
            "Lower, over her hips": "A small, undignified sound out of her, immediately followed by an even smaller laugh against the cushion. \"I have no defense for that noise.\"",
            "Slower — between her legs": "She turns her face into the cushion. \"…okay. We're not pretending it's a massage anymore.\" Said with her eyes on you the whole time.",
            "Pull her in and kiss her": "She lets you close the distance and finishes it herself, hand at the back of your neck. \"I KNEW it was going to be like that. I hate that I knew.\"",
            "Start undressing her": "She doesn't help, doesn't stop you. Just watches your hands and your face. \"Slow. Make me feel every inch of it.\"",
            "Slip her shirt up and off": "She lifts her arms for you. The shirt comes off slow. She watches your face do the thing. \"…yeah. There it is. I KNEW that face existed.\"",
            "Unclasp her bra": "One hand, the clasp, her breath out. She doesn't cover anything. \"…hi.\" Eyes on yours, no hedge in them at all.",
            "Kiss your way down her chest": "Her head goes back. Her hand finds your hair and stays. Your name comes out of her like it surprised her.",
            "Undo her jeans, ease them off": "She lifts her hips for you without being asked. \"…oh, you are DANGEROUS.\"",
            "Slide her underwear off — just that, no further": "She watches you do it, eyes never off yours, and then doesn't reach for anything. \"…hi.\" Said low. Said meaning come HERE.",
            "Take it all the way": "Her eyes close. \"…yes. Come HERE. Come here, daddy.\"",
            "\"…whatever you're comfortable with.\" — let her decide": "She inhales slow, and you watch the calculation happen behind her eyes. Then she decides — one way or the other — without breaking eye contact for a second.",
            "She's already got nothing on — take it all the way": "She pulls you down. \"Stop being polite. We are SO past polite. Don't be a gentleman about this part.\"",
            "Put music on and pull her up to dance": "She rolls her eyes the entire first thirty seconds, then stops, mid-sway, and holds your gaze. \"…you are SO corny. Don't stop.\"",
            "Put something on TV and half-watch it": "She lasts forty seconds before she's sideways against you, narrating it badly on purpose. The TV becomes radio. Neither of you minds.",
          },
        },
        kitchen: {
          enter: "Krystalle hops up onto the counter like she's lived in your kitchen her whole life. \"This is mine now. This is my counter. You can have visitation.\"",
          actions: {
            "Cook something together": "She's a chaos prep cook and she knows it. You bicker about salt. You eat it at the counter standing up at midnight. She declares it the best meal of her year and means it.",
            "Open a bottle and let it breathe": "She watches you pour like it's an art form. \"Mm. Confident pour. That's the move.\" She's already a half-degree warmer.",
            "Stand between her knees and talk close": "She doesn't close her knees and doesn't open them either — leaves them exactly where they are with you between them, and the conversation gets very quiet and very specific about nothing.",
            "Steal a kiss while she's mid-sentence": "She makes an indignant noise into your mouth that lasts about half a second before her hands are in your hair and the sentence is permanently unfinished. \"…unfair,\" she manages, later. \"That was unfair.\"",
          },
        },
        yard: {
          enter: "Out back it's cooler and darker, the sky doing more than the city usually lets it. Krystalle tips her head back at the stars and goes very still. \"…okay. This is where I move in.\"",
          actions: {
            "Lie back and look at the stars": "She lies down right where she stood and pats the grass beside her without looking. \"Down. Sky is happening. You're missing it.\"",
            "Trade the embarrassing true things": "You tell her yours. She's quiet. Then she tells you one that lands so hard you don't speak for a full minute. Then she snorts. \"Okay, your turn, worse one.\"",
            "Invent constellations, badly": "She names four random stars 'the Group Chat.' You counter with 'the Unanswered Email.' It escalates wildly. Neither of you wants it to end.",
            "Actually name them for her (INT)": "You walk her through it low and unshowy and she goes silent in the specific way she gets when something's landing. When you look over she's not looking at the sky.",
            "Pull her over onto your chest": "She comes the rest of the way without being asked twice. Her hand flattens over your heartbeat. \"…that's loud. Why is that loud.\"",
            "Kiss her, upside-down and slow": "The angle is ridiculous. The kiss is not. She forgets which way is up for a second and laughs about it against your mouth.",
            "Just lie there with her, no next move": "You don't do anything. You don't have to. She makes a small, contented sound against your chest. \"I'm staying. I'm just — yeah. Staying.\"",
            "Light a fire and sit close": "She migrates into your side the second the flame catches, allegedly for warmth. She stays there long after the chill stops being an excuse.",
            "Share a blanket and a long story": "One blanket, two people, an unhurried story she keeps almost ending and not. By the end she's narrating with her eyes closed against your shoulder.",
            "Burn something you should let go of (write it, toss it)": "She writes hers fast, like she'd been waiting to. Watches it go. Doesn't say a word for a long minute after, then leans her whole weight into your side. \"…thank you. That was sneaky-good.\"",
            "Pull her into your lap by the fire": "She settles back against your chest, head tucked under your jaw, your arms crossed over her front. \"Don't move. If you move I'll know.\"",
            "Kiss her, firelight and all": "She goes from amused to entirely not amused in about a second. The firelight throws everything orange. Neither of you breathes for a moment.",
            "Take her inside, just like this": "She doesn't say anything. Just stands up holding your hand and lets you lead.",
            "Stay out here, let it simmer": "She stays exactly where she is in your lap. \"I want this part to last as long as we can make it.\" She means it.",
            "Take it further, right here": "She breathes out, slow. \"…here. Yeah. Here.\" Said into your throat. Not asking, not stopping you.",
            "Slow-dance in the dark, no music": "She lets you pull her up. \"You corny, corny man.\" Her arms loop your neck. Both of you barely move. She hums something off-key on purpose.",
            "Get in the hot tub": "She eyes the tub, then you, then the tub. \"…we did not pack for this. Did YOU pack for this?\"",
          },
        },
        bedroom: {
          enter: "Krystalle steps through ahead of you and turns. The air changes. \"…hi. This is the part I've been thinking about. So. Hi.\"",
          actions: {
            "Lie down together, just close": "You both lie down fully clothed, lamp still on, and she just — looks at you. Quiet. Her hand finds yours on the duvet. \"This is enough, you know. This part. By itself.\" She means it.",
            "Undress the moment slowly — kiss her there": "She lets you take it apart in pieces. Every layer is a question and she answers each one out loud, low: \"yes. yes. — yes.\"",
            "Take it all the way": "She breathes out hard against your mouth. \"…yes. Come here. Come here, daddy, come here.\"",
          },
        },
      },
      swim: {
        ask: "Krystalle dips a hand in the tub, hisses at the heat, grins. \"…okay. Logistics, captain. We did not, EITHER of us, pack for this.\"",
        noSuit: {
          "\"We don't have to — let's just sit by it.\"": "Her face softens. \"…thanks. For offering the out. That counts.\"",
          "Trail your feet, talk in the steam": "She leans into your side, feet in the water, the rest of her in the cold air. \"This is the best version of the night. I've decided.\"",
          "Pull her in against your side on the edge": "She folds in immediately, knee against yours, head against your shoulder. \"…okay. Yeah. Cancel the rest of my evening.\"",
          "\"…okay, actually, let's get in.\"": "She caves first. \"Fine. The edge was always a tease.\" She's down to underwear before you've fully agreed.",
          "Stay right here, dry and close": "You don't get in. She tucks herself in against you on the edge, half-laughing about it. \"You're a menace. Staying. Quiet.\"",
          "\"Underwear's basically a swimsuit.\"": "She considers you, the water, you again. \"It is absolutely not. Fine. Turn around for the dress.\" She is, in fact, in before you fully agreed.",
          "\"…or we skip the swimwear entirely.\"": "She holds your eyes a long second. \"…hit the porch light. Now.\" Said quiet. Said sure.",
        },
        hasSuit: "She came prepared, of course she did. \"Swimsuit under the dress. Because I had a FEELING.\" Insufferable about it the whole time she's getting in.",
        inTub: {
          "Float back, heads at the sky, just talk": "She pushes off and floats, eyes on the stars. \"I haven't done this since I was a kid. Water and sky and nobody. Thanks.\"",
          "Pull her across the water into your lap": "She glides over and settles astride your lap, arms looped around your neck. \"…hi.\" Said into your mouth, more or less.",
          "Kiss her, slow, in the steam": "The water does nothing to cool it. Her fingers lock behind your neck. The night goes very small.",
          "Take it all the way, right here in the water": "She slows your hands under the surface, breathing uneven. \"…inside. Bedroom. Come inside with me.\" Not a no — a relocation.",
          "Just hold her there, let it idle": "You don't push. She rests her forehead against yours and stays. \"…this. Keeping this.\"",
          "Just hold her there, no agenda": "She stays in your lap, cheek to your jaw. \"You're so warm. I'm just going to live here briefly.\"",
          "Steal a kiss across the water": "She tips back out of reach laughing — \"work for it!\" — and then meets you when you do.",
          "Pull her in closer, keep going": "She comes the rest of the way without being asked. \"…you have HANDS, my god.\"",
          "Take it all the way, right here": "She breathes against your jaw. \"Bedroom. Now. Come on, come on, come on.\"",
          "Cool off — climb out": "She huffs. \"I was COMFORTABLE,\" — and climbs out anyway, dripping, grinning, completely unbothered.",
          "Climb out — grab towels": "She lets you wrap her up first. \"You did your own one second. I clocked it. I'm cataloging it.\"",
        },
        getOut: {
          "Wrap her in a towel, stay close": "You bundle her up and she steps in close, hair dripping, in absolutely no hurry to find clothes. \"You did your own first. Filed under: pay attention to that one.\"",
          "Take her inside exactly like this": "She doesn't say anything. Just takes your hand and goes, towel slipping off one shoulder and her not fixing it.",
          "Drift over to the fire to dry off": "She migrates to the fire wrapped in just the towel and immediately sits in your lap, dripping. \"You started this. I am a problem you started.\"",
          "Back into the water": "She drops the towel back where it was. \"…yeah. Wasn't done.\"",
          "Don't bother with towels at all": "She holds your eyes. Doesn't reach for a towel. \"…oh. You want me brave. Okay.\" The walk back inside is very slow.",
          "Inside, just like this": "She walks ahead of you with nothing on, looking back once at the doorway. \"Coming?\" Said evenly. Said sure.",
          "Over to the fire": "She makes the walk in nothing but the night air. \"…this is the moment I am most genuinely cold,\" she announces, sitting in your lap by the fire and not getting up.",
          "Actually — back into the water": "She climbs back in laughing. \"Coward. Fine. More water it is.\"",
        },
      },
      sexAsk: "Everything narrows down. Krystalle's hand is fisted in the back of your collar and her forehead's on yours and she's — for once, all the way still. The pause is enormous. She's waiting on you.",
      sexCondom: "You reach for it and the breath leaves her at once — the ease of not having to be the responsible one in the room. \"…thank you. For that. Thank you.\" Said into your throat. None of the rest is careful.",
      sexRawWin: "She holds your eyes through the unasked question and nods, once, small. \"…you. Just you. Decided.\" The decision moves through her whole body and the rest of the night reorganizes around it.",
      sexRawLose: "She stops your hand flat against her stomach. \"No. Not without. Not that one.\" Said gently. Said completely. Married-woman-shaped line, and you hear it.",
      sexBack: "You ease back, forehead to hers. She laughs once, ragged. \"…probably smart. Hate that it's smart.\" She does not move an inch.",
    },
    overlook: {
      intro: "You take the ridge road up. Krystalle is silent the entire way, which from her is loud. You kill the engine at the pull-off and she finally exhales. \"…oh. That's a view. That's — yeah.\"",
      rooms: {
        view: {
          enter: "You both step out into the cold clean air. The city does its circuit-board thing. Krystalle leans both hands on the guardrail and just looks for a long minute. \"…I needed this. I didn't know how much.\"",
          actions: {
            "Stand at the rail and take it in": "She steps in shoulder-to-shoulder with you and stays. \"Don't talk yet. Five more seconds.\"",
            "Point out the places that mean something": "She trades hers back fast — the bakery, the bridge, the corner where she cried in college. The map turns personal in under a minute.",
            "Find her street from up here": "She squints, points confidently, points wrong, gives up. \"Tragic. I live in a city I cannot identify from a height. Tragic.\" Said leaning into your side.",
            "Stop talking, put an arm around her": "She leans the whole line of herself into it without a word, head against your shoulder. \"…yeah. There it is.\"",
            "Turn her in and kiss her, city behind her": "She turns, the city a smear of gold behind her. The kiss is slow. She makes a small sound. The cold stops mattering.",
            "Just hold her there, watch it together": "You don't make a move. She tucks under your arm and you watch the city not move. \"Don't ruin it. Don't ruin it. Don't ruin it.\"",
            "Share the drink you brought": "She gasps, delighted. \"You BROUGHT it. Up here. Are you serious. I'm in love with whoever taught you to plan an evening.\"",
            "Pass it back and forth, no rush": "One cup, two people, the night dropping half a gear looser every pass. She wipes her mouth with the back of her wrist and grins. \"Classy.\"",
            "Make her toast to something real": "She thinks. Long enough you know it's going to be honest. \"…to nights where I get to be more than one thing. Cheers.\" Drink.",
            "Get her warm — pull her into your coat": "She steps inside the coat, back to your chest, both your arms over the rail around her. \"Now I will literally never leave.\"",
            "Kiss the side of her neck, see what she does": "Her breath stops. \"…oh, FINE.\" She turns inside the coat to make it a real one.",
            "Don't move, just keep her warm": "You hold the moment exactly where it is. She lets out a long shaky breath. \"…this counts. This is the whole thing.\"",
            "Take a picture": "She fishes your phone out of your own pocket. \"Document. Document, document, this happened.\"",
            "One nice one — arms around each other": "You take exactly one. Both of you squinting, city blurred to gold behind. Neither of you is showing it to anyone. Both of you are keeping it forever.",
            "Make it a real shoot — you direct": "She steps into the headlight wash and rolls her shoulders out. \"Direct me. Gently. I bruise.\"",
            "\"Make a silly face\"": "She gives you something cross-eyed and feral and perfect. You take nine of them. The bad ones are the best ones.",
            "\"Hands in your hair, eyes closed, just feel it\"": "She does it for real. The frame where she forgets the lens entirely is the one she'll never delete.",
            "\"Whatever you're comfortable with — just move\"": "You quit posing her. She drifts, glances back, checks you're still watching. \"…you're still there.\" Said pleased.",
            "\"Look back over your shoulder\"": "Chin to her shoulder, eyes back down the lens, the half-beat too long that is the photograph. \"I felt that. I felt that one.\"",
            "\"Arch your back, chin down\"": "She finds the line and holds it. \"The cold is NOT why I'm going slow. Just so we're clear.\"",
            "\"Strap off the shoulder — just that\"": "One strap, slow, her eyes on you the whole way down. She doesn't stop. She doesn't look like she's planning to.",
            "\"Hands on the hood, look back at me\"": "She braces on the warm metal, turns just her head, and gives you exactly the look you don't post anywhere. She knows the look. She gave it on purpose.",
            "\"…whatever you're comfortable with — your call.\" (let her decide how far)": "She holds the phone's eye and the calculation runs across her face. Whichever way it goes, she decides for herself — that's the point, and you both know it.",
            "Suggest: lose the jacket": "She gives the first frame as a joke. Drops it off both shoulders on the next, slow, not joking at all. \"Oh, you started something.\"",
            "Suggest: the top, slow": "She crosses her arms, takes the hem, draws it up watching your face the whole way. \"Make it the right kind of weird.\"",
            "Suggest: the bra — only if she wants": "One hand, the clasp, the breath out. She doesn't cover anything. \"…there. THAT'S the face I wanted to see.\"",
            "Suggest: the skirt — turn for me": "She turns, slides, steps out of it watching you over her shoulder. \"You're going to remember this badly for years.\"",
            "Suggest: all of it — last one, just for us": "She holds your eyes, never the lens. Takes the last of it off slow. One photo, never leaving the phone. \"That one is OURS. Say it.\"",
            "\"…okay. Now hand me the camera.\" (she turns it on you)": "She slides the phone out of your fingers, ruinous smile. \"Fair's fair. Your turn. Same rule.\"",
            "Let it all hang out": "She goes very quiet behind the phone, which is her highest review. \"…huh,\" she says, evenly. \"…HUH.\" Several more photos.",
            "\"Now both of us.\" (together, on the record)": "She lets the phone drop to the seat instead, decision made. \"Forget the picture. Forget the picture, forget the picture.\"",
            "Hand it back — let her keep the camera on you both": "She pockets it. \"…greedy.\" And pulls you down anyway, the lens already forgotten.",
            "Phone away — just her now, none of it kept": "She watches you set it screen-down, and the relief moves through her whole body. \"Thank you. Thank you for that.\"",
            "…then take it all the way, no camera": "She steps in close, breath against your collar. \"Here. Now. Yes.\"",
            "Just her, just this, nothing else": "You don't take it anywhere. She tips her forehead to yours. \"…knowing we COULD have. That's its own thing. Keep that one too.\"",
            "Cover up — make her work for it": "She gets competitive immediately. Directs you exactly the way you directed her, merciless, until she lands the frame she wanted. \"Scoreboard. Even.\"",
            "Refuse — it's a one-way camera": "She mock-gasps. \"Hypocrite. HYPOCRITE.\" Lobs your jacket at your head. Keeps the photos she already has, very smug.",
            "Take it all the way now — forget the phone": "She abandons the shoot mid-frame, no warning. \"Phone down. Down, down, down.\"",
            "Stop the shoot — just kiss her, no camera": "You set the phone face-first and close the gap. She makes a small approving sound. \"Correct read. Correct read of the room.\"",
            "Get in the car": "She climbs into the passenger seat already smiling. \"…it's warmer in here. And quieter.\"",
          },
        },
        car: {
          enter: "You both pile back into the car, out of the wind. Heater ticking, windows starting to fog. Krystalle pulls her knees up onto the seat and turns sideways toward you. \"…stupid cosy in here. I'm not leaving.\"",
          actions: {
            "Talk low with the heater running": "She rests her cheek on the headrest and just talks. Quiet. Honest. The kind of conversation you don't get in daylight.",
            "Put music on, recline the seats back": "Seats back. Her finding your hand across the console without looking. She hums along off-key on purpose. \"I could fall asleep here. Don't let me.\"",
            "Make out in the car": "She leans across and meets you mid-gap. The geometry stops mattering in about three seconds. \"…stupid car. Stupid hand brake.\"",
            "Pull her over the console into your lap": "She climbs the console without being asked twice. \"This car was NOT built for this.\" She is, however, already in your lap.",
            "Climb into the back, all the way": "She breathes out hard. \"…yeah. Back. Come back here with me.\" Said into your mouth. Not stopping you.",
            "Stay up front, just this, windows fogged": "You stay tangled in the front seat. The fog closes the city out. \"This is enough. This is — yeah. This.\"",
            "Keep it to just this, fog the windows": "Neither of you reaches for more. The windows go opaque and the city disappears.",
            "Take it all the way — climb in back": "She holds your eyes a long second, all the calculation visible. Then: \"yeah. Come back here, daddy.\" Quiet. Sure.",
            "Back to the view": "She huffs as she opens the door. \"Cruel. The view's not even moving. I am leaving CONTENT.\"",
          },
        },
      },
      sexAsk: "It narrows to the fogged-in dark of the car and the sound of both of you breathing. Krystalle's hand is fisted in your collar, and not letting go. The pause is enormous and you both know what's in it.",
      sexCondom: "You reach for it and she watches you have it, and her shoulders drop, the held breath leaving her at once. \"You — okay. Come HERE.\" The back seat is not built for any of this. Neither of you notices.",
      sexRawWin: "She holds your eyes for the unasked question and answers it by pulling you the rest of the way down with her. \"You. Just you. Decided.\"",
      sexRawLose: "She stops your hand. \"Not without. I can't do that one. Not me.\" Quiet. Final. The fog on the glass goes from intimate to just cold.",
      sexBack: "You ease back to forehead-on-forehead in too-small a space. She laughs once, wrecked. \"…probably smart. Smartest thing all night. Hate it.\"",
    },
    beach: {
      intro: "Salt wind, the slap of halyards on masts, the sand warm under the going-down sun. Krystalle is barefoot inside ninety seconds. \"You took me to the ocean. You absolute SOFTIE. I love that you took me to the ocean.\"",
      rooms: {
        shore: {
          enter: "Just the two of you and a mile of emptying beach. Krystalle picks up a shell, examines it, decides it's ugly, keeps it anyway, hands it to you to hold. \"You're shell-keeper. Promotion.\"",
          actions: {
            "Walk the waterline, no particular plan": "She loops her arm through yours and just walks. \"Don't talk for a minute. I'm doing a thing.\" The thing is being calm. You can feel it work.",
            "Drop down on the blanket, watch the sun go": "She folds down beside you and tucks herself under your arm. \"This is the part of life I keep forgetting exists. Thanks for remembering it for me.\"",
            "Just sit in it, shoulder to shoulder": "She leans her head on your shoulder somewhere around the pink and doesn't move when the sky changes. \"…I love how nobody narrates a good one. We just sit in it.\"",
            "Pull her into your lap, face the water": "She settles back against your chest, your arms crossed over her front. \"…this is the version of married I wish I had,\" she says, quiet enough you almost don't catch it.",
            "Kiss her, salt and all": "You turn her chin and she's already most of the way there. The kiss goes slow with the whole dark beach to itself. \"…that one. I'm KEEPING that one.\"",
            "Stay exactly here, no next move": "You don't do anything about it. You keep her there against you in the dark with the tide coming up the sand. She lets out a long breath. \"…right. This counts. This counts for a lot.\"",
            "Get in the water with her": "She's in before you finish the sentence, shrieking at the cold, dragging you after her by the wrist. Surfaces gasping. \"FREEZING. WORTH IT. Don't let go of me, don't let go of me — \"",
            "Rent a boat for a couple of hours": "She's already at the dock. \"YES. We are doing that. I get to drive, also, just so you know going in.\"",
          },
        },
        boat: {
          enter: "A small open boat is suddenly yours. Krystalle takes the wheel without asking, points it at the breakwater gap, and opens the throttle until the beach is a line of lights behind you. \"…OH. I am a sea captain now. This is who I am.\"",
          actions: {
            "Let her drive, just watch her do it": "She's good at it, or fakes it perfectly. Wind doing whatever to her hair, grinning at the open water like it owes her. You watch her have this and she catches you watching and doesn't tell you to stop.",
            "Cut the motor, drift, share the quiet": "Engine off. The hull knocking on the swell. She gets quieter inside the quiet, in the good way. \"…I haven't been this not-anxious in months.\"",
            "Drop anchor somewhere with nobody around": "She kills the engine in a cove the chart doesn't bother naming. The world contracts to one small boat and a lot of dark water. \"…oh. Dangerous. Are we going to be sensible?\" Said hoping not.",
            "Lie back on the bow, look up": "You both stretch out on the foredeck. Her hand finds yours without looking. \"…you can see the actual sky out here. Don't make me cry on a boat.\"",
            "Roll over and kiss her, boat rocking": "You turn into her on the narrow deck and she meets you all the way. The boat does half the moving. There is nobody for a mile. Neither of you remembers there's a dockhand.",
            "Take her below to the cabin": "She breathes out hard. \"…below. Yes. Get me below.\"",
            "Stay up here, just this, under the sky": "You stay tangled on the deck. \"…stopping here. That's the MOVE.\" Said breathless, said grinning.",
            "Dare her to jump off the side with you": "She goes off the gunwale a half-second before you, yelling. Surfaces laughing and treading close. \"…I have NEVER. Do not tell anyone I did this.\"",
            "Below to the cabin — out of the wind": "She stops at the top of the companionway, hand flat on your chest, considering. Then her face changes. \"…yeah. Come on.\"",
            "Head back to the dock": "She huffs as she turns the boat around. \"He's going to be ANNOYED that we kept it this long. Worth it.\"",
          },
        },
      },
      sexAsk: "It comes down to the slap of water on the hull, the boat rocking you both, Krystalle with a fist in your shirt and no intention of giving the boat back. One honest beat. She's waiting on you, eyes on yours.",
      sexCondom: "You produce it and the last of the held breath goes out of her at once. \"…oh, thank GOD. Come here, come HERE.\" The boat does most of the work. The dockhand will be furious. Worth it.",
      sexRawWin: "She holds your eyes through the unasked question and answers it by pulling you the rest of the way down. \"You. I'm decided.\" The water is loud against the hull. Nobody is anywhere.",
      sexRawLose: "She stops you. \"Not without. Not — not me. I can't.\" Quiet. Real. The water against the hull suddenly very cold.",
      sexBack: "You ease it down to just holding her in the rock of the hull, both of you breathing. \"…probably smart,\" she admits, not letting go.",
    },
  };

  const party = {
    // Pool of NPC-caught lines when Krystalle is the date.
    npcBeats: [
      "Krystalle is cornered by {g}, polite-smiling at something he clearly thought was funnier than it was, eyes scanning the room for an exit.",
      "Krystalle's twisting her ring on her finger while {g} talks at her — a tell she doesn't know she has — and clocks you the second you walk into eyeline.",
      "{g} just made Krystalle laugh — not the real one, the polite one — and her hand has not left her own elbow the entire conversation.",
      "Krystalle and {g} are deep in it by the window. He's leaning in too far. She is not leaning back, but she's not leaning in either.",
      "Krystalle catches your eye over {g}'s shoulder and mouths something short and unprintable about him, sweetly, while still smiling at him.",
    ],
    // Guest narration pools — when Krystalle is in the game circle.
    guestBeats: [
      "Krystalle takes the truth, considers it for a long second, and answers with one short sentence that makes the host's cousin choke on his beer.",
      "Krystalle's dare is to do an impression of the person on her left; she nails it so hard the person on her left has to leave the room.",
      "Krystalle gets a softball truth and somehow turns it into a story about her lola and a goat at a wedding. Half the circle is crying laughing by the end.",
      "Krystalle answers \"biggest red flag you ignored\" with brutal honesty and the room goes very quiet, then erupts in sympathetic groans.",
    ],
    spicyGuestBeats: [
      "Krystalle gets \"who here would you actually go home with\" — she doesn't answer out loud, just holds your eyes for one second too long. The circle catches it. The circle loses it.",
      "Krystalle's dare is to give a thirty-second shoulder rub; she picks the person directly across from her, deliberately not you, and the slow clap starts immediately.",
      "Krystalle takes \"kiss the most attractive person in the circle,\" scans slowly, lands on someone safe, and gives a quick decisive one. Her eyes are on you the whole time.",
      "Krystalle's truth is \"who's the best kisser you know.\" She says a name. Refuses to elaborate. Drinks her drink. Interrogation fails.",
    ],
    scorchingGuestBeats: [
      "Krystalle takes the two-minutes-in-the-hall dare, picks the safest person in the room, comes back exactly two minutes later flushed, re-buttoned, refusing every single question.",
      "Krystalle gets \"who have you pictured\" and walks across the circle to whisper the answer into one person's ear and walk back. The room detonates. The recipient won't look at her for the rest of the round.",
      "Krystalle loses a dare and spends the rest of the round draped across the arm of someone's chair like a verdict, running the game from up there, perfectly pleased with herself.",
      "Krystalle does the 'best move' dare for real, on a willing volunteer, and the circle has to physically separate the cheering from the booing.",
    ],
    // Dance modes — keyed by id from D.PARTY.dance.
    danceLine: {
      casual: "Krystalle laughs and matches you exactly. \"Look at us, two adults at a house party. Disgraceful. Don't stop.\"",
      dirty: "Krystalle slides in close, hands on your hips, eyes locked on yours. \"…remind me later that I'm a respectable person. Right now is not later.\"",
      handsy: "Krystalle's hands find your collar and the room stops mattering. \"…you absolute PROBLEM. You absolute, actual problem.\" Said into your mouth, more or less.",
    },
    danceFailLine: "Krystalle catches your hands and sets them back at her hips. \"Easy. Not like that, not here. Save some.\" She squeezes your fingers before letting go.",
    // Body shot — overrides ask/who/win/lose.
    bodyShot: {
      ask: "Someone's lining up body shots on the island. Krystalle raises one eyebrow at you. \"…volunteering. Volunteering OR being volunteered. Which.\"",
      whoYou: "Lime in your teeth, salt on your collarbone, Krystalle bracing one hand on the counter beside your hip with that specific look she gets when she's stopped pretending. The kitchen is very interested.",
      whoHer: "She tips her head back, lime in her teeth, salt at the line of her throat, and looks at you like she has already decided you'll be careful and slow. The kitchen goes very quiet, then very loud.",
      win: "Neither of you rushes it. The kitchen whoops; you don't hear it. She comes up grinning, lime gone, mouth a lot closer to yours than it was, and doesn't lean back. \"…okay. NEXT round of my marriage starts tomorrow.\"",
      lose: "You fumble the lime, salt goes everywhere, Krystalle cracks up so hard she has to grip the counter. \"Disaster. Disaster man. I love it. Keeping you.\"",
    },
    // Slip-away private esc lines — labels span both PARTY.hookup.esc
    // (door room) and PARTY.privateScene.esc (slip-away hall variant).
    privateEsc: {
      // hookup.esc labels:
      "Slow it down, make it count": "You slow it down on purpose and Krystalle makes a sound against your mouth like that was the only correct read. \"…you. Why are you so MUCH.\"",
      "Don't stop, don't think": "Neither of you slows down for anything. The door, the hallway, the rest of it stops mattering at once. She's got your collar in both hands.",
      "Get the door actually locked first": "You turn the lock first and she laughs into your neck — \"…points for that, points for that\" — and stops being careful about any of it.",
      // privateScene.esc labels:
      "Slow. Against the wall. In no rush at all.": "You take it slow against the wall. Krystalle exhales against your jaw, ring-hand fisted in your shirt. \"…I am going to think about this for a week. So you know.\"",
      "Don't make it anywhere in particular.": "Neither of you makes it more than two steps from where you started. Krystalle laughs against your mouth, breathless, ruinous. \"Decor is a problem for SOBER me.\"",
      "Find somewhere with an actual door that locks.": "You find a door that locks and Krystalle laughs into your neck — \"…competent. So competent. I am INTO it.\" — and stops being careful about any of it.",
    },
    privateWin: [
      "The party keeps going without either of you for a while. Krystalle is not, currently, anyone's wife. She is yours.",
      "Some of tonight is staying in this room, and you both know it, and neither of you is bringing it up.",
    ],
    // Floor sex
    floorAsk: "There is, very literally, nothing left in the way. Krystalle's mouth is at your ear over the bass: \"…nobody's looking. Your call. Yes or no, tell me now.\"",
    floorWin: [
      "The crowd folds back into its own noise. The dark and the bass do the rest. Right here, on the floor, with the party going on stupid and oblivious around you, Krystalle stops being anything except the woman you've been earning for weeks.",
      "Some of this particular party is never getting described to anyone. Especially not to her husband.",
    ],
    // Drink-bring narration override.
    drinkBring: "Krystalle clinks your glass. \"You read my mind.\" Said low, said directly to you over the rim, with her eyes on yours for a beat too long.",
  };

  // Per-INTIMACY-phase overrides. Keyed by phase + opt-index. Engine
  // merges `said` (her line first) with `line` (replaces narration).
  const intimacy = {
    // open (beat 0 in D.INTIMACY.beats)
    open: [
      { said: "\"…slow. I want to FEEL all of it.\"", line: "You take it slow on purpose. Every breath of hers catches and steadies and catches again — like she's trying for composure and losing on purpose. Her hands flatten on your back and press, asking. You don't give it yet. She says your name once, low, like it slipped." },
      { said: "\"I am DONE being polite. Get over here. NOW.\"", line: "There's nothing careful about it. Hands and mouths and the laughable amount of clothing in the way, and one of you laughing breathlessly at the logistics before the laugh becomes something else entirely. She has been waiting all night to stop being polite about this, and she is done waiting." },
      { said: "\"My turn. Stay still.\"", line: "You go still and she takes it without a flicker — pushes you back, settles her weight over you, sets the rhythm slow and certain and her own. She watches your face the whole time, reading every reaction, unhurried, in complete charge and visibly enjoying that you noticed." },
    ],
    // leading (beat 1)
    leading: [
      { said: "\"…show me. Don't be careful with me, daddy. I'm not made of glass.\"", line: "You take over and she lets you, wrists going easy under your hands, hips arching up to meet you on the first beat like she'd already decided how this part went. She keeps her eyes open. She wants to watch you do this. Every sound out of her is involuntary and she gives up trying to hide that." },
      { said: "\"Hands flat. Trust me a second.\"", line: "You give it up to her and she does not hesitate to take it — both hands flat on your chest, her weight pinning you exactly where she wants you, setting a pace that has you saying things you don't fully plan to. She likes that. You can feel her like it." },
      { said: "\"Don't give me all of it. Make me work.\"", line: "It keeps changing hands — you take it, she takes it back, a roll, a pin, a low laugh that gets cut off. Neither of you is actually trying to win the quiet contest of it; you're both just refusing to be the one who's only along for the ride, and the friction of that is most of the point." },
    ],
    // intensity (beat 2)
    intensity: [
      { said: "\"…look at me. Don't you DARE look away. I need this.\"", line: "You slow it right down to almost nothing, forehead dropped to hers, every breath shared in the inch between you. It gets unbearably intimate — eye contact she won't break, your name said like it means something specific, her hand at the side of your face like she needs you not to look away. More sincere than either of you planned and neither of you backs off it." },
      { said: "\"I don't care who hears. Nobody hears me like this anyway.\"", line: "It stops being careful somewhere in the middle and stays there — her nails, your name bitten off against her shoulder, the headboard, neither of you caring. Every performance she walked in wearing is gone completely. By the end there is nothing left of the version of her that has a public face. You are keeping this one." },
      { said: "\"Don't make me laugh right now, you JERK — \"", line: "You say something stupid at exactly the wrong moment and she laughs — a real one, surprised out of her — and swats your shoulder, and then the laugh changes register without quite stopping, becomes something else against your throat. She keeps her face hidden after that, like the laugh embarrassed her less than what replaced it did." },
    ],
    // finish (beat 3)
    finish: [
      { said: "\"…don't you DARE let me, don't you dare — please — \"", line: "You feel her get close and back off the edge of it on purpose, and the sound she makes is mostly outrage and entirely the opposite of stop. You do it again. The third time you get a fist in your hair and a threat half-formed against your mouth, and you finally stop being cruel about it. What happens then is loud and undignified and worth every second." },
      { said: "\"Together. Together — now. Now. Now.\"", line: "You stop holding any of it back and so does she. It goes over together — her grip locking, her face pressed hard into your neck, both of you saying nothing coherent, the whole world narrowed to a handful of seconds neither of you will be describing to anyone, ever, and will both be thinking about for a while." },
      { said: "\"…watch. I want you to watch me.\"", line: "You take your time and make it about her. When it finally takes her you're watching — that's the point, you wanted to see it — the exact moment her composure goes, the arch, the held breath, the way she says your name like an accusation. She catches you watching, breathless, after, and laughs at you for it." },
    ],
    // close (post-finish wrap-up; 5 opts in source order)
    close: [
      { said: "\"Don't go anywhere yet. Just — stay. Stay.\"", line: "Neither of you sleeps for a long time. You stay exactly where you ended up, sweat cooling, her leg hooked over yours, and just talk — quiet, unguarded. She traces shapes on your chest and tells you a true thing she wouldn't have told you with the lights on — something honest about the shape of her life. She doesn't ask you to fix it. She just wanted you to know." },
      { said: "\"…we are not finished. We are NOT finished. Come HERE.\"", line: "She's the one who starts it again — a slow line of her mouth along your jaw and a low \"we are not finished\" that is not a question. You were not going to argue." },
      { said: "\"Shower. With me. Now. Get UP.\"", line: "The shower is supposedly to clean up. The shower does not, for a noticeable while, accomplish that. Eventually it does. You end up clean and worse off than when you started, in the best way, with her wearing your towel back to the bed." },
      { said: "\"…cannot move. Will not move. Goodnight.\"", line: "You get about ninety seconds of intending to debrief before she's gone — face mashed into your shoulder, one hand still flat over your heartbeat like she fell asleep checking it was still doing it. You stay awake longer than she does, watching the ring on the hand on your chest, not bringing it up." },
      { said: "\"…okay. Right. I have to. You know I have to.\"", line: "She finds her clothes unhurried, steals your water glass, kisses you once at the door like a full stop, and is gone — composed in a way that costs her, you can tell. Leaving you the specific problem of how good composed looks on her. She does not look back. She cannot afford to." },
    ],
    // condom path (single block, no opts) — overrides intro lines
    condom: "You reach for it and the breath leaves her at once — the ease of not having to be the responsible one in the room. \"…thank you. For that. Thank you.\" Said into your throat. After that there is nothing careful left.",
    // raw win line
    rawWin: "She holds your eyes through the unasked question and nods, once, small. \"…you. Just you. I trust you.\" The decision moves through her entire body. You don't make her regret it.",
    // raw lose line — used for any-place raw failure
    rawLose: "She stops your hand flat. \"Not without. Not — I can't do that one. Not me, not now.\" Married-woman-shaped line. You hear it.",
    // finish — pull/inside variants
    pull: "You pull back at the last second, jaw tight. She lets out a breath that's mostly relief. \"…good call.\" Said into your temple, both of you breathing like you ran somewhere.",
    inside: "Neither of you stops or wants to and you feel her decide that at the same moment you do — her legs locking you in, the unspoken thing very loud in the quiet right after. \"…that was on purpose. That was on purpose, and we are going to talk about that, and not yet.\" She does not let go for a long minute.",
  };

  K.voice = { venues, places, party, intimacy };

  // Anxiety beat: a one-time mid-arc prompt. Fires once when composite is
  // ≥ marriage.anxietyAt and a date is mid-flow. Engine reads it.
  K.anxietyBeat = {
    q: "Krystalle stops dead in the middle of whatever you're doing. Her hand goes to her ring without her noticing. \"…wait. Wait. I have to say a thing before I lose my nerve. I am having a really, REALLY good time. And that's a problem. You see the problem. Right?\"",
    opts: [
      { said: "\"I see it. We don't have to do anything you'll hate yourself for. I'm here either way.\"", trait: "sincere", line: "Something in her face comes apart — relief, gratitude, the specific exhaustion of having been the only one carrying the weight of this. \"…okay. Okay. Just — knowing you SAW it. Yes. Thank you.\" Affection lands hard.", aff: 10, rom: 4, clears: true },
      { said: "Pull her in, change the subject, make her laugh.", trait: "playful", line: "You lighten it, expertly, and she laughs the surprised one and lets you. Half of her appreciates it. The other half is still thinking about it.", aff: 3, rom: 2, clears: false },
      { said: "\"Then don't think about it. Tonight's tonight.\"", trait: "adventurous", line: "She looks at you for a long second. Decides not to be angry. Decides not to be charmed either. \"…right. Sure.\" The temperature drops two degrees and stays there.", aff: -6, rom: -2, clears: false },
    ],
  };

  // The earned-moment override: once composite ≥ intimacyComposite gate
  // and anxietyCleared, the engine inserts this line when entering home.
  K.specialEntry = "Krystalle stops in your entryway and just breathes for a second. \"…okay. I'm going to stop being careful for one night. I want you to know I decided that, before. Not in the heat — now. Sober. While I can still say the word.\" She takes your hand and pulls you in.";
})();
