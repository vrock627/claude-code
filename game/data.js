(function () {
  const STATS = ["strength", "style", "intelligence", "charisma"];
  const STAT_LABEL = { strength: "Strength", style: "Style", intelligence: "Intelligence", charisma: "Charisma" };
  const STAT_SHORT = { strength: "STR", style: "STY", intelligence: "INT", charisma: "CHA" };
  const BARS = ["attraction", "affection", "romance", "libido"];
  const BAR_LABEL = { attraction: "Attraction", affection: "Affection", romance: "Romance", libido: "Libido" };
  const BAR_SHORT = { attraction: "ATR", affection: "AFF", romance: "ROM", libido: "LIB" };
  const TRAITS = ["sincere", "playful", "classy", "adventurous", "generous", "independent"];

  const BACKGROUNDS = {
    athlete: { name: "Athlete", emoji: "🏋️", blurb: "Gym rat. Strong, steady, terrible at small talk.", stats: { strength: 8, style: 4, intelligence: 3, charisma: 3 } },
    scholar: { name: "Scholar", emoji: "🎓", blurb: "Reads everything. Sharp mind, soft handshake.", stats: { strength: 3, style: 3, intelligence: 8, charisma: 4 } },
    socialite: { name: "Socialite", emoji: "🥂", blurb: "Knows everyone. Charm first, substance later.", stats: { strength: 2, style: 6, intelligence: 2, charisma: 8 } },
    artist: { name: "Artist", emoji: "🎨", blurb: "All taste and vibes. Style for days.", stats: { strength: 2, style: 8, intelligence: 5, charisma: 3 } },
  };

  // Shared pool of actual lines you can say. style → vibe vs character; probe → can surface a reveal.
  const SAYS = [
    { say: "\"What's something you believe that most people don't?\"", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere", probe: true },
    { say: "\"Skip the elevator pitch — tell me the real story.\"", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere", probe: true },
    { say: "\"What were you like, before all… this?\"", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere", probe: true },
    { say: "\"What actually makes you happy? Not the polite answer.\"", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere", probe: true },
    { say: "\"You're trouble. I can just tell.\"", style: "playful", stat: "charisma", bar: "romance", trait: "playful" },
    { say: "\"Okay — worst date you've ever survived. Go.\"", style: "playful", stat: "charisma", bar: "affection", trait: "playful", probe: true },
    { say: "\"Be less charming for a second, I can't think.\"", style: "playful", stat: "charisma", bar: "romance", trait: "playful" },
    { say: "\"I dare you to say the unfiltered version of that.\"", style: "playful", stat: "charisma", bar: "affection", trait: "playful" },
    { say: "\"I keep finding reasons to come over here.\"", style: "bold", stat: "charisma", bar: "romance", trait: "adventurous" },
    { say: "\"Honest question — is this just me, or…?\"", style: "bold", stat: "charisma", bar: "romance", trait: "adventurous" },
    { say: "\"Come outside with me for a minute.\"", style: "bold", stat: "charisma", bar: "romance", trait: "adventurous" },
    { say: "\"That look really, really works on you.\"", style: "smooth", stat: "style", bar: "attraction", trait: "classy" },
    { say: "\"I like that you don't perform for the room.\"", style: "smooth", stat: "charisma", bar: "affection", trait: "sincere", probe: true },
    { say: "\"Whatever you need tonight — I've got it handled.\"", style: "smooth", stat: "charisma", bar: "affection", trait: "generous" },
    { say: "\"Buckle up, my week was a disaster. The good kind.\"", style: "brash", stat: "strength", bar: "attraction", trait: "adventurous" },
    { say: "\"You're the only interesting thing in this room.\"", style: "smooth", stat: "charisma", bar: "attraction", trait: "classy" },
  ];
  const MOVE = { say: "(You close the space, and let the question answer itself.)", style: "bold", stat: "charisma", bar: "romance" };

  // Her reaction to a beat — shared, brief; personality lives in per-character openers.
  const LINES = {
    cold: { crit: ["Something cuts through. She actually looks at you, recalculating."], success: ["She thaws a degree."], partial: ["A noncommittal shrug."], fail: ["She visibly checks out."] },
    neutral: { crit: ["She laughs, genuinely caught off guard."], success: ["\"…Okay. I like that.\""], partial: ["\"Mm. Sure.\""], fail: ["She pulls back a little."] },
    warm: { crit: ["Her whole face changes. That landed deep."], success: ["She holds your eyes a beat too long."], partial: ["The spark dims a touch."], fail: ["She cools, and you feel it."] },
    hot: { crit: ["The air goes electric. She doesn't look away."], success: ["She brushes your arm and lets it stay."], partial: ["Her smile flickers. \"Hm.\""], fail: ["She stiffens. The heat drains out of it."] },
  };

  const ITEMS = {
    espresso: { name: "Double Espresso", emoji: "☕", price: 6, type: "tempStat", stat: "charisma", amount: 3, phases: 1, desc: "Liquid confidence. +3 CHA for the next part of the day." },
    preworkout: { name: "Pre-Workout", emoji: "🥤", price: 9, type: "tempStat", stat: "strength", amount: 4, phases: 2, desc: "Jittery power. +4 STR for two phases." },
    outfit: { name: "Sharp Outfit", emoji: "👔", price: 15, type: "tempStat", stat: "style", amount: 4, phases: 3, desc: "Dress to kill. +4 STY for three phases." },
    protein: { name: "Protein Plan", emoji: "💪", price: 18, type: "permStat", stat: "strength", amount: 1, desc: "Real gains. +1 STR, permanently." },
    course: { name: "Online Course", emoji: "💻", price: 24, type: "permStat", stat: "intelligence", amount: 2, desc: "Actually finish it. +2 INT, permanently." },
    watch: { name: "Designer Watch", emoji: "⌚", price: 32, type: "permStat", stat: "style", amount: 2, desc: "Quiet flex. +2 STY, permanently." },
    flowers: { name: "Flowers", emoji: "💐", price: 8, type: "gift", value: 6, desc: "Classic. A safe little nudge for anyone." },
    chocolates: { name: "Chocolates", emoji: "🍫", price: 11, type: "gift", value: 8, desc: "Sweet, well-received by most." },
    book: { name: "Rare First Edition", emoji: "📕", price: 17, type: "gift", value: 6, desc: "Niche. The right person melts for it." },
    tickets: { name: "Concert Tickets", emoji: "🎫", price: 21, type: "gift", value: 6, desc: "Niche. The right person loses it." },
    wine: { name: "Bottle of Wine", emoji: "🍷", price: 14, type: "gift", value: 5, desc: "Loosens the evening. Romantic, a little bold." },
    condom: { name: "Condoms", emoji: "🛡️", price: 6, type: "consumable", desc: "Just in case the night goes there. One gets used if it does." },
  };
  const SHOPS = { gym: ["preworkout", "protein"], cafe: ["espresso", "chocolates"], library: ["book"], park: ["flowers"], mall: ["outfit", "watch", "course", "tickets", "chocolates", "flowers", "wine", "condom"] };

  const LOCATIONS = {
    gym: { name: "The Gym", emoji: "🏋️", blurb: "Clanking iron and mirror selfies.", arrive: "Sweat, rubber mats, someone grunting through a deadlift.",
      action: { label: "Train hard", stat: "strength", text: "You chase the burn until your arms quit negotiating." } },
    library: { name: "The Library", emoji: "📚", blurb: "Hushed, warm, smells of old paper.", arrive: "Dust motes drift through window light. Somewhere, a page turns.",
      action: { label: "Study", stat: "intelligence", text: "You read like it matters, because for once it does." } },
    cafe: { name: "The Café", emoji: "☕", blurb: "Espresso machine screaming, everyone half-working.", arrive: "Steam, milk foam, the low churn of a dozen half-finished conversations.", social: true, dateSpot: true, dateCost: 14,
      action: { label: "Banter with strangers", stat: "charisma", text: "You charm the barista and three regulars before your coffee's done." },
      work: { label: "Pick up a barista shift", wage: 14, text: "Six hours of latte art and small talk." } },
    club: { name: "Neon Club", emoji: "🪩", blurb: "Bass you feel in your sternum.", arrive: "The floor is already sweating. Light cuts through the dark in slabs.", social: true, dateSpot: true, dateCost: 35,
      action: { label: "Work the room", stat: "style", text: "You move like the night's already yours." } },
    park: { name: "The Park", emoji: "🌳", blurb: "Joggers, dogs, a guy selling flowers.", arrive: "Cut grass, a frisbee somewhere, the city humming politely at a distance.", social: true, dateSpot: true, dateCost: 0,
      action: { label: "Mingle on the green", stat: "charisma", text: "Easy chatter with strangers and their unreasonably happy dogs." } },
    restaurant: { name: "The Bistro", emoji: "🍝", blurb: "Warm light, real napkins, a wine list.", arrive: "Low gold light, clinking glass, the smell of garlic and butter doing the Lord's work.", social: true, dateSpot: true, dateCost: 42,
      action: { label: "Linger over coffee", stat: "style", text: "You nurse an espresso and read the room like a regular." },
      work: { label: "Wait tables tonight", wage: 20, text: "On your feet for hours, but the tips are real." } },
    mall: { name: "The Mall", emoji: "🛍️", blurb: "Fountains, food court, retail purgatory.", arrive: "Skylights, a fountain nobody looks at, the gravitational pull of a pretzel stand.",
      action: { label: "Study the trends", stat: "style", text: "You window-shop with the focus of a field researcher." },
      work: { label: "Work a retail shift", wage: 18, text: "Folding the same sweater forty times." } },
    home: { name: "Home", emoji: "🏠", blurb: "Yours. Quiet. Somewhere to land.", arrive: "Your door clicks shut and the day finally goes quiet.", home: true, dateCost: 0 },
  };

  const PHASES = ["Morning", "Afternoon", "Night"];

  const CHARACTERS = {
    aiko: {
      name: "Aiko", emoji: "📖", blurb: "Reference librarian. Reads three books a week and quietly judges yours.",
      likedStat: "intelligence", likedStyle: "thoughtful", dislikedStyle: "brash", favoriteGift: "book",
      schedule: { Morning: "library", Afternoon: "park", Night: "library" },
      hint: "A slow burn. Sincerity and a sharp mind move her; flash bounces off.",
      attractProfile: { intelligence: 0.5, charisma: 0.2, style: 0.2, strength: 0.1 },
      barWeights: { affection: 0.45, attraction: 0.3, romance: 0.15, libido: 0.1 },
      libidoRange: [8, 38], decay: { affection: 1, romance: 4 },
      traitAffinity: { sincere: 3, classy: 2, generous: 1, playful: 0, adventurous: -1, independent: 2 },
      opens: {
        cold: ["Aiko marks her page with one finger. \"…Yes?\"", "Aiko, not looking up: \"I'm mid-paragraph. But go on.\""],
        neutral: ["Aiko: \"Oh — you. I was just losing an argument with a footnote.\"", "Aiko sets the book down, mildly intrigued."],
        warm: ["Aiko smiles before she means to. \"I was hoping you'd wander over.\"", "Aiko: \"Good. I needed a reason to stop reading.\""],
        hot: ["Aiko: \"I lost a whole page thinking about last time.\"", "Aiko closes the book entirely. \"You have my full attention. That's dangerous for you.\""],
      },
      reveals: ["She's reading every Le Guin novel in publication order — no skipping.", "She grew up in a foggy coastal town and still misses the water.", "She volunteers teaching adults to read on Sunday mornings.", "She trusts people who can say 'I don't know' and mean it."],
    },
    bianca: {
      name: "Bianca", emoji: "🎧", blurb: "Club DJ. Reads a room in two seconds, reads books approximately never.",
      likedStat: "charisma", likedStyle: "bold", dislikedStyle: "thoughtful", favoriteGift: "tickets",
      schedule: { Morning: "cafe", Afternoon: "mall", Night: "club" },
      hint: "Hot and fast. Confidence and nerve spike her; overthinking kills it.",
      attractProfile: { charisma: 0.4, style: 0.35, strength: 0.2, intelligence: 0.05 },
      barWeights: { romance: 0.35, attraction: 0.25, libido: 0.25, affection: 0.15 },
      libidoRange: [35, 82], decay: { affection: 1, romance: 6 },
      traitAffinity: { adventurous: 3, playful: 2, independent: 2, classy: 0, sincere: 0, generous: -1 },
      opens: {
        cold: ["Bianca doesn't lift the headphones. \"Make it quick.\"", "Bianca: \"You're standing in my light.\""],
        neutral: ["Bianca: \"Well, well. Look who surfaced.\"", "Bianca half-smiles, still half on the decks."],
        warm: ["Bianca pulls one headphone off. \"Okay. You have my ear. Literally.\"", "Bianca: \"I was about to text you. Don't make it weird.\""],
        hot: ["Bianca: \"I've been watching the door for you. Humiliating, honestly.\"", "Bianca leans across the booth. \"Say something good.\""],
      },
      reveals: ["She's been DJing since she was sixteen — started at her cousin's wedding.", "She acts like the crowd doesn't matter, but she clocks every face.", "She has three stage names and won't explain a single one.", "The only thing that scares her is being bored."],
    },
    priya: {
      name: "Priya", emoji: "☕", blurb: "Barista and grad student. Will out-argue you and refill your cup mid-sentence.",
      likedStat: "intelligence", likedStyle: "playful", dislikedStyle: "brash", favoriteGift: "chocolates",
      schedule: { Morning: "cafe", Afternoon: "library", Night: "cafe" },
      hint: "Wit over muscle. Quick, warm banter wins; chest-beating loses her.",
      attractProfile: { intelligence: 0.4, charisma: 0.35, style: 0.15, strength: 0.1 },
      barWeights: { affection: 0.4, romance: 0.25, attraction: 0.2, libido: 0.15 },
      libidoRange: [20, 55], decay: { affection: 1, romance: 4 },
      traitAffinity: { playful: 3, sincere: 2, classy: 1, adventurous: 1, independent: 1, generous: 0 },
      opens: {
        cold: ["Priya slides your drink over without looking. \"Mm.\"", "Priya: \"I'm on a deadline in my head. Talk fast.\""],
        neutral: ["Priya: \"Ah. My favorite interruption.\"", "Priya raises an eyebrow over the espresso machine."],
        warm: ["Priya: \"I made you the off-menu thing. Don't make it a thing.\"", "Priya grins. \"Please give me an excuse to stop studying.\""],
        hot: ["Priya: \"I rehearsed something clever and forgot it. That's on you.\"", "Priya leans on the counter, close. \"Hi. Hi.\""],
      },
      reveals: ["She's one semester from a linguistics PhD she resents and loves.", "She makes a secret off-menu drink only for people she likes.", "She was a debate captain and still can't lose gracefully.", "She journals every night and would sooner die than let you read it."],
    },
    rosa: {
      name: "Rosa", emoji: "💃", blurb: "Dance instructor with a triathlon habit. Two speeds: full send and asleep.",
      likedStat: "strength", likedStyle: "brash", dislikedStyle: "thoughtful", favoriteGift: "flowers",
      schedule: { Morning: "gym", Afternoon: "park", Night: "club" },
      hint: "All momentum. Boldness and energy electrify her; brooding bores her.",
      attractProfile: { strength: 0.4, style: 0.3, charisma: 0.25, intelligence: 0.05 },
      barWeights: { attraction: 0.35, libido: 0.3, romance: 0.2, affection: 0.15 },
      libidoRange: [40, 85], decay: { affection: 1, romance: 6 },
      traitAffinity: { adventurous: 3, independent: 2, playful: 2, generous: -1, classy: 0, sincere: 0 },
      opens: {
        cold: ["Rosa, mid-stretch: \"You need something, or…?\"", "Rosa barely slows. \"Keep up or stand back.\""],
        neutral: ["Rosa: \"Oh good, a moving target.\"", "Rosa bounces on her heels, sizing you up."],
        warm: ["Rosa: \"There you are. I was about to come find you.\"", "Rosa, towel around her neck: \"Tell me something fun.\""],
        hot: ["Rosa: \"Too much energy, and you just walked in. Convenient.\"", "Rosa pulls you in by the wrist. \"Keep me interested.\""],
      },
      reveals: ["She's training for an Ironman literally nobody asked her to do.", "She quit a corporate job to teach dance and never once looked back.", "Sit her still over an hour and she vibrates out of her skin.", "She'd rather fail out loud than win quietly."],
    },
    elena: {
      name: "Elena", emoji: "🍷", blurb: "Gallery curator and part-time sommelier. Notices the one detail you got wrong.",
      likedStat: "style", likedStyle: "smooth", dislikedStyle: "playful", favoriteGift: "wine",
      schedule: { Morning: "restaurant", Afternoon: "mall", Night: "restaurant" },
      hint: "Taste is everything. Polish and sincerity land; goofing around does not.",
      attractProfile: { style: 0.45, intelligence: 0.25, charisma: 0.2, strength: 0.1 },
      barWeights: { affection: 0.35, attraction: 0.3, romance: 0.2, libido: 0.15 },
      libidoRange: [15, 45], decay: { affection: 1, romance: 4 },
      traitAffinity: { classy: 3, sincere: 2, generous: 2, independent: 1, adventurous: 0, playful: -2 },
      opens: {
        cold: ["Elena considers you like a piece she hasn't decided about. \"Yes?\"", "Elena: \"I'm working. Be interesting, or be brief.\""],
        neutral: ["Elena: \"You. I was deciding if this light is forgivable.\"", "Elena tilts her head, appraising."],
        warm: ["Elena: \"Good timing. I was tired of being the most interesting person here.\"", "Elena's mouth curves. \"Sit. Briefly impress me.\""],
        hot: ["Elena: \"I noticed you the second you walked in. I notice everything. You, more.\"", "Elena: \"Don't waste this. I don't hand it out.\""],
      },
      reveals: ["She names a wine's region blind, and will, entirely unprompted.", "She's curating a show she's privately terrified will flop.", "She collects single earrings she finds and never wears them.", "She thinks taste is just paying attention longer than everyone else."],
    },
  };

  const BILL = {
    tab: { text: "Pick up the tab", costMul: 1, trait: "generous", mag: 3 },
    split: { text: "Split it", costMul: 0.5, trait: "independent", mag: 2 },
    cheap: { text: "Let her get this one", costMul: 0, trait: "independent", mag: 1, cheap: true },
  };

  // Dates: narrative intro, decision beats, optional bill (only where it fits).
  const DATE_SCENES = {
    restaurant: { intro: "Candlelight, a shared bottle, the good silverware. She looks like she belongs here, and like she knows it.",
      beats: [
        { q: "She slides the menu toward you. \"Surprise me.\"", opts: [
          { text: "\"Trust me — I've got this.\" (order for both)", trait: "adventurous", mag: 2 },
          { text: "\"Tell me what you actually love here.\"", trait: "sincere", mag: 2 },
          { text: "\"We're getting the tasting menu. All of it.\"", trait: "generous", mag: 2 } ] },
        { q: "A lull. She watches you over her glass.", opts: [
          { text: "\"So what's the thing you never get to talk about?\"", trait: "sincere", mag: 3 },
          { text: "Tell the most ridiculous story you've got", trait: "playful", mag: 3 },
          { text: "Let the silence sit, comfortably", trait: "independent", mag: 2 } ] } ],
      bill: { options: ["tab", "split", "cheap"] } },
    club: { intro: "Her turf, maybe. Bottle service, a roped booth, light cutting the dark in slabs.",
      beats: [
        { q: "She's already pulling you toward the floor.", opts: [
          { text: "Go all in, no hesitation", trait: "adventurous", mag: 3 },
          { text: "Hang back, watch her move", trait: "classy", mag: 2 },
          { text: "Make a deliberately goofy bit of it", trait: "playful", mag: 2 } ] },
        { q: "Someone tries to cut in.", opts: [
          { text: "Stay cool, let her handle it", trait: "independent", mag: 3 },
          { text: "Smoothly close the space", trait: "adventurous", mag: 3 },
          { text: "Buy the whole booth a round", trait: "generous", mag: 2 } ] } ],
      bill: { options: ["tab", "split"] } },
    cafe: { intro: "Corner table, two coffees, the low churn of other people's afternoons.",
      beats: [
        { q: "She's reading the chalkboard menu.", opts: [
          { text: "\"One of your usual, from memory.\"", trait: "sincere", mag: 3 },
          { text: "\"I dare you to order the weirdest thing on there.\"", trait: "adventurous", mag: 3 },
          { text: "Get matching ridiculous pastries", trait: "playful", mag: 2 } ] },
        { q: "She gets quiet, then opens up about a hard week.", opts: [
          { text: "Listen. Actually listen.", trait: "sincere", mag: 3 },
          { text: "\"Okay — how do we fix it?\"", trait: "generous", mag: 3 },
          { text: "Make her laugh about it", trait: "playful", mag: 2 } ] } ],
      bill: { options: ["tab", "split"] } },
    park: { intro: "A blanket, cheap snacks, the whole open afternoon. No check, no rush — just the evening unspooling.",
      beats: [
        { q: "She points at a cloud. \"That one. What is it?\"", opts: [
          { text: "Invent an absurd backstory for it", trait: "playful", mag: 3 },
          { text: "Lie back and just watch with her", trait: "sincere", mag: 3 },
          { text: "\"Race you to those trees.\"", trait: "adventurous", mag: 3 } ] },
        { q: "Golden hour. She's lit up like a painting.", opts: [
          { text: "Tell her something true", trait: "sincere", mag: 3 },
          { text: "Pull her up to dance with no music", trait: "adventurous", mag: 3 },
          { text: "Keep her guessing", trait: "playful", mag: 2 } ] } ] },
  };
  // How you close out the night (shown at the end of a date).
  const DATE_END = [
    { say: "\"This was perfect. Goodnight.\"", kind: "gracious" },
    { say: "\"…I really don't want tonight to end yet.\"", kind: "eager" },
    { say: "\"Let's make this a habit.\"", kind: "forward" },
  ];

  const PARTY = {
    rounds: 6, guestsMin: 2, guestsMax: 3, gameRounds: 3,
    // flow stage by (rounds elapsed + drink boost); pick highest whose `at` <= level
    flows: [
      { at: 0, name: "warming up", desc: "People are still arriving. It's loose and easy." },
      { at: 3, name: "in full swing", desc: "Music's up, everyone's a few drinks in, the night has momentum." },
      { at: 5, name: "loose and late", desc: "It's dim, it's late, and the room has stopped pretending." },
    ],
    dance: [
      { id: "casual", label: "Keep it casual", rom: 5, lib: 1, gateFlow: 0, gateRecept: 0, risk: false, desc: "Easy and fun. No stakes." },
      { id: "dirty", label: "Dirty dancing", rom: 9, lib: 7, gateFlow: 1, gateRecept: 25, risk: true, desc: "Close and hot. Reads the room." },
      { id: "handsy", label: "Get handsy", rom: 13, lib: 13, gateFlow: 2, gateRecept: 45, risk: true, desc: "Bold. She has to be all the way in." },
    ],
    games: ["truthdare", "spin", "pong"],
    truths: ["What's a secret nobody here knows?", "Biggest red flag you've talked yourself past?", "Who in this room would you actually date?"],
    spicyTruths: ["Who here have you thought about, and don't lie?", "What's the last thing you fantasized about?", "Hottest thing anyone's ever done to you?"],
    dares: ["Do your worst dance move. Now.", "Let the person on your left restyle your hair.", "Dramatic reading of the last text you sent."],
    spicyDares: ["Kiss the most attractive person in the circle.", "Sit in someone's lap until your next turn.", "Whisper what you'd do later into someone's ear."],
    askTruths: [{ text: "\"Who in here do you actually have a crush on?\"", trait: "adventurous", mag: 3 }, { text: "\"What's something you secretly want?\"", trait: "sincere", mag: 3 }],
    askDares: [{ text: "Dare her to dance with you", trait: "adventurous", mag: 3 }, { text: "Dare her to give her honest first impression of you", trait: "sincere", mag: 2 }],
    // The player can pick who to kiss when dared.
    kissDare: "Kiss someone in the circle — your pick.",
    // Concrete: what she actually did, and how the room reacts.
    guestBeats: [
      "{n} downs her drink, stands on the couch, and belts the chorus of a song nobody requested — half the room joins in, the other half films it.",
      "{n} gets dared to do an impression of the host and nails it so hard he throws a cushion at her while everyone howls.",
      "{n}'s truth is 'what's your most embarrassing nickname' — she answers, instantly regrets it, and the whole circle starts using it.",
      "{n} dodges her question with a story about a goat at a wedding; nobody finds out if it was true, but everybody's crying laughing.",
      "{n} loses a dare and has to wear a lampshade for the round; she commits to it completely, fielding questions like it's a press conference.",
      "{n} answers 'biggest red flag you ignored' with brutal honesty and the room goes dead quiet, then erupts in sympathetic groaning.",
      "{n} gets dared to call an ex and chickens out at the last ring, dropping the phone like it bit her — relieved cheering all around.",
      "{n} takes a dare to swap an item of clothing with the person left of her; they trade jackets and parade it like a runway, to applause.",
    ],
    spicyGuestBeats: [
      "{n} gets 'who here would you actually go home with' — she doesn't answer out loud, just looks dead at you for a beat too long. The circle catches it and loses it.",
      "{n}'s dare is to give someone a thirty-second shoulder rub; she picks the person across from her, and the room starts a slow clap that turns into chaos.",
      "{n} answers 'last thing you fantasized about' by leaning in and saying it only to the girl beside her, who goes scarlet and refuses to repeat it.",
      "{n} loses a dare and has to sit in the nearest lap until her next turn — she chooses deliberately, gets comfortable, and runs the rest of the round from there.",
      "{n} is dared to whisper what she'd do later into someone's ear; whatever she says makes him laugh, then go very quiet, then very pink.",
      "{n} takes 'kiss the most attractive person in the circle,' scans the room slowly to draw it out, and plants a quick one on whoever she's decided is the safest scandal.",
      "{n}'s truth is 'who's the best kisser you know' — she answers with a name, won't elaborate, and sips her drink while the interrogation fails.",
      "{n} gets dared to slow-dance with someone for a full minute with no music; she makes it weirdly tender and the room doesn't know whether to laugh or look away.",
    ],
    // Highest tier — only when the night's momentum has truly tipped.
    scorchingTruths: [
      "Describe the best night you've ever had — no names, every other detail.",
      "Who in this room have you actually pictured, and what were they doing?",
      "What's the most reckless thing you'd do tonight if no one remembered it tomorrow?",
    ],
    scorchingDares: [
      "Two minutes in the hall with whoever the circle picks.",
      "Tell the hottest person here exactly what you noticed about them — to their face.",
      "Demonstrate your single best move on a willing volunteer.",
    ],
    scorchingGuestBeats: [
      "{n} takes the two-minutes-in-the-hall dare, picks someone with zero hesitation, and comes back flushed and re-buttoning, stonewalling every single question.",
      "{n} answers the 'who have you pictured' truth by walking across the circle, saying it directly into someone's ear, and walking back. The room detonates.",
      "{n} loses a dare and spends the rest of the round draped across the arm of someone's chair like a verdict, running the game from up there.",
      "{n} does the 'best move' dare for real, on a very willing volunteer, and the circle has to physically separate the cheering from the booing.",
    ],
    // Slip-away second beat (nested before the read).
    privateScene: {
      esc: [
        { label: "Slow. Against the wall. In no rush at all.", mod: 1, line: "You take it slow enough that the noise on the other side of the door stops being a thing that exists." },
        { label: "Don't make it anywhere in particular.", mod: 0, line: "Neither of you makes it more than two steps from where you started. Decor was not a priority." },
        { label: "Find somewhere with an actual door that locks.", mod: 2, line: "You get her somewhere with a lock and a flat surface and a guarantee of being uninterrupted, which she clearly appreciates." },
      ],
      win: ["{n} answers by pulling you in, and the party stops existing for as long as you let it.", "Some of the night stays strictly between the two of you."],
    },
    privateGateFlow: 2, privateGateInterest: 45,
  };

  // Shared, character-driven, non-graphic. Choices steer the outcome;
  // the camera stays above the collarbone. Used by the home date and
  // the party slip-away.
  const INTIMACY = {
    beats: [
      { q: "How does it go?", opts: [
        { label: "Slow. Unhurried. Make it last.", fx: { rom: 8, aff: 6, inti: 1 }, line: "You take it slow enough that every part of it registers — her breath, the pauses, the way she keeps saying your name like she's checking you're still there." },
        { label: "Urgent — neither of you can wait.", fx: { lib: 10, atr: 5, rom: 4 }, line: "It's all heat and no patience: a mess of half-removed everything, one shared laugh, and then very much not laughing." },
        { label: "Let her set the pace entirely.", fx: { rom: 7, aff: 7, lib: 3 }, line: "You hand her the tempo and she takes it with a certainty that quietly rearranges a few of your assumptions about her." } ] },
      { q: "Who's running this?", opts: [
        { label: "Take the lead.", fx: { atr: 6, lib: 6, rom: 3 }, line: "You take charge; she lets you, watching your face the whole time like she's filing every second of it away." },
        { label: "Let her take over.", fx: { rom: 6, lib: 7, aff: 3 }, line: "You give it up to her and she does not hesitate to take it. It is not a thing you'll be forgetting." },
        { label: "Trade it back and forth.", fx: { rom: 7, aff: 5, lib: 4 }, line: "It keeps changing hands — a push, an answer, a quiet contest neither of you is actually trying to win." } ] },
      { q: "And underneath all of it —", opts: [
        { label: "Keep it tender. Stay close.", fx: { rom: 9, aff: 8 }, line: "You keep your forehead to hers and it stays unbearably close the whole way through — more sincere than you meant to be, and not sorry about it." },
        { label: "Let it get intense.", fx: { lib: 9, atr: 7, rom: 3 }, line: "It stops being careful somewhere in the middle, and neither of you is performing a single thing by the end." },
        { label: "Make her laugh, then mean it.", fx: { aff: 8, rom: 6, lib: 3 }, line: "You crack a joke at precisely the wrong moment; she laughs, swats you, and then the laugh turns into something with no jokes left in it at all." } ] },
    ],
    close: { q: "After —", opts: [
      { label: "Stay tangled up, talk till it's late.", fx: { rom: 10, aff: 10 }, line: "Neither of you sleeps for a while. You just talk in the dark — the good kind, the kind that's its own entire thing.", tone: "good" },
      { label: "Both of you pass out instantly.", fx: { aff: 6, rom: 4 }, line: "You get about ninety seconds of intending to talk before you're both gone, her hand still flat on your chest.", tone: "good" },
      { label: "She slips out before dawn.", fx: { atr: 4, rom: -3 }, line: "You wake to a cold half of the bed and a note: a phone number you already have, and a drawn smirk. Infuriating. Effective.", tone: "neutral" } ] },
  };

  // Deep, explorable home date. Rooms → activities → intimate sub-actions.
  // {n} = her name. recept rolls read her composite/romance/libido + mood.
  const HOME = {
    intro: "Your door clicks shut behind you both. The city noise drops away. It's just your place, the lamps low, and {n} — and the whole rest of the night with nothing scheduled in it.",
    bedroomGate: { inti: 6, rom: 45 },
    rooms: [
      { key: "living", name: "Living room", enter: "The lamp light is warm. {n} kicks her shoes off by the door without being told to, which says something.",
        actions: [
          { label: "Sit on the couch with her", enter: "She folds onto the couch, tucks her feet up, and there's a clear, deliberate amount of space left beside her.", sub: [
            { label: "Just talk, shoulder to shoulder", fx: { rom: 4, aff: 6, inti: 1 }, lines: ["You sink in next to her and the conversation goes somewhere real — the kind you don't have standing up. {n} turns to face you, knee against yours, in no hurry to be anywhere."] },
            { label: "Run your fingers through her hair", fx: { rom: 6, lib: 3, inti: 2 }, lines: ["You tuck a loose strand back and let your hand stay, fingers slow through her hair. {n}'s eyes half-close; she leans into your palm like a cat and doesn't pretend otherwise."] },
            { label: "Give her a massage", enter: "She turns her back to you and lifts her hair out of the way — which is its own kind of yes.", sub: [
              { label: "Her shoulders", fx: { rom: 6, lib: 4, inti: 2 }, lines: ["You work the knots loose until she actually groans into a cushion. \"Okay,\" {n} mumbles, \"you're not allowed to stop now.\""] },
              { label: "Down her back", roll: { dc: 12, win: { fx: { rom: 8, lib: 7, inti: 3 }, lines: ["You press slow down the length of her spine. She goes boneless, every exhale landing a little louder than the last."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["You push lower than she's ready for; she shifts and sits up. \"Let's — stay up here.\""] } } },
              { label: "Her thighs", gate: { inti: 4, rom: 35 }, roll: { dc: 14, win: { fx: { rom: 10, lib: 11, inti: 4 }, lines: ["Your hands move to her thighs and she stops pretending this is about her shoulders. \"…that's not my back,\" she says, not stopping you."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She catches your wrist. \"Hey — slower than that.\" Not angry. Just true."] } } },
              { label: "Lower, over her hips", gate: { inti: 5, rom: 40 }, roll: { dc: 15, win: { fx: { rom: 11, lib: 12, inti: 4 }, lines: ["Your hands settle low and she arches into it with a sound she clearly didn't plan to make, then laughs at herself for it."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["Too far, too soon. She rolls over and sits up — that look more warning than invitation."] } } },
              { label: "Back up", back: true },
            ] },
            { label: "Pull her in and kiss her", roll: { dc: 13, win: { fx: { rom: 11, lib: 8, inti: 3 }, kiss: true, lines: ["You close the gap. {n} meets you halfway and then some — a hand fisting your shirt, the couch forgotten. It goes from soft to unhurried-but-certain, and neither of you is in a rush to come up for air."] }, lose: { fx: { rom: -7, aff: -4 }, lines: ["You lean in and she puts two fingers gently on your chest. \"Hey. Slow down — I'm enjoying this, I just want to get there, not skip there.\" Fair, and it stings a little."] } } },
            { label: "Start undressing her", gate: { inti: 5, rom: 45 }, enter: "It's gone quiet and close, her eyes dark and certain. She's not stopping you.", sub: [
              { label: "Slip her shirt off", roll: { dc: 14, into: true, win: { fx: { rom: 8, lib: 9, inti: 3, un: "shirt" }, lines: ["She lifts her arms for you without a word. The shirt goes somewhere neither of you will look for later."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She covers your hands with hers. \"Not — not yet, okay?\" You stop instantly, and she softens that you did."] } }, sub: [
                { label: "Unclasp her bra", roll: { dc: 15, into: true, win: { fx: { rom: 10, lib: 12, inti: 4, un: "bra" }, lines: ["One hand, the clasp, a slow breath out of her as it gives. She watches your face the whole time, daring you to make it weird. You don't."] }, lose: { fx: { rom: -7, aff: -5 }, lines: ["Your hands fumble and she stills them, gently. \"Slow down. We've got all night.\" Soft, but a no for now."] } }, sub: [
                  { label: "Kiss down her chest", roll: { dc: 15, win: { fx: { rom: 13, lib: 15, inti: 5 }, kiss: true, lines: ["You kiss a slow line down and she lets her head fall back, one hand fisting in your hair, the other gripping the couch like the room moved."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She tenses under your mouth; you feel it and stop at once. \"Sorry — I just need to slow this down.\""] } } },
                  { label: "Undo her jeans", roll: { dc: 16, into: true, win: { fx: { rom: 12, lib: 14, inti: 5, un: "pants" }, lines: ["Button, zip, the slow drag of denim — she lifts her hips to help, and that small motion says more than any of the talking did."] }, lose: { fx: { rom: -7, aff: -5 }, lines: ["She closes her hand over yours at the button. \"That's the line for tonight.\" Kindly. Fully."] } }, sub: [
                    { label: "Slide her underwear down", gate: { inti: 9, rom: 60 }, roll: { dc: 16, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["So close, and she catches your hand. \"Wait — come here first.\" Not no. Just not like that, not rushed."] } } },
                    { label: "Back up", back: true },
                  ] },
                  { label: "Back up", back: true },
                ] },
                { label: "Back up", back: true },
              ] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Put music on and pull her up to dance", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 2 }, lines: ["You find something slow and hold a hand out. {n} rolls her eyes, takes it anyway, and then stops performing the eye-roll about thirty seconds in — one hand sliding to the back of your neck, both of you barely moving in the middle of your own living room."] }, lose: { fx: { rom: 1 }, lines: ["She laughs you off — \"absolutely not, I've seen you move\" — and stays on the couch. Worth a shot."] } } },
          { label: "Put something on TV and half-watch it", fx: { rom: 5, aff: 3, inti: 1 }, lines: ["You put on something neither of you intends to follow. Within ten minutes she's sideways against you, narrating it badly on purpose, your arm around her like it lives there."] },
          { label: "Go somewhere else", rooms: true },
        ] },
      { key: "kitchen", name: "Kitchen", enter: "The kitchen's all low light and counter space. {n} hops up to sit on the counter like she owns it.",
        actions: [
          { label: "Cook something together", fx: { rom: 5, aff: 7, inti: 1 }, lines: ["You actually cook — her on prep, you on heat, a real amount of bickering about salt. It comes out good. Eating it standing up at the counter at this hour feels better than any restaurant did."] },
          { label: "Open a bottle and let it breathe", fx: { rom: 5, lib: 5, inti: 1, loosen: true }, lines: ["You pour two glasses of something decent. {n} swirls hers, watches you over the rim, and the whole room drops half a gear looser."] },
          { label: "Stand between her knees and talk close", roll: { dc: 12, win: { fx: { rom: 8, lib: 6, inti: 3 }, lines: ["You step in where the counter put her exactly at your height. {n} doesn't move her knees apart for show — she just doesn't close them, and the conversation gets very quiet and very specific about nothing."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["She slides off the counter with a light \"easy, tiger\" and puts the island between you, smiling but resetting the pace."] } } },
          { label: "Steal a kiss while she's mid-sentence", roll: { dc: 13, win: { fx: { rom: 10, lib: 7, inti: 3 }, kiss: true, lines: ["She's complaining about something and you just lean in and kiss her mid-word. {n} makes an indignant sound that lasts about half a second before her hands are in your hair and the sentence is permanently unfinished."] }, lose: { fx: { rom: -6, aff: -3 }, lines: ["You go for it and mistime it badly; she turns her head and your mouth lands on her cheek. \"Smooth,\" she says, kind but not melting. Recoverable. Barely."] } } },
          { label: "Go somewhere else", rooms: true },
        ] },
      { key: "yard", name: "Back yard", enter: "Out back it's cooler and darker, the sky doing more than the city usually lets it.",
        actions: [
          { label: "Lie back and look at the stars", fx: { rom: 6, aff: 5, inti: 1 }, lines: ["You both lie back on the cool grass. {n} finds your hand without looking and the talk goes low and honest the way it only does when nobody has to make eye contact."] },
          { label: "Light a fire and sit close", fx: { rom: 7, lib: 3, inti: 2 }, lines: ["You get a small fire going. {n} migrates into your side for the warmth — allegedly — and stays there long after the chill stops being an excuse."] },
          { label: "Get in the hot tub", chance: true },
          { label: "Go somewhere else", rooms: true },
        ] },
      { key: "bedroom", name: "Bedroom", gateFail: "You glance toward the bedroom. {n} clocks it, and gently doesn't follow your eyes. Not tonight — she's not there with you yet. The door stays shut.",
        enter: "You end up in the doorway of the bedroom together and the air changes — quieter, slower, every small sound suddenly loud. {n} steps in first and turns to look at you.",
        actions: [
          { label: "Lie down together, just close", fx: { rom: 10, aff: 8, lib: 4, inti: 3 }, lines: ["You don't rush anything. You lie down facing her, fully clothed, the lamp still on, and just be close — her fingertips tracing idle lines on your arm, talking in near-whispers about nothing important. It's almost unbearably good, and it isn't even the point."] },
          { label: "Undress the moment slowly — kiss her there", roll: { dc: 14, win: { fx: { rom: 14, lib: 12, inti: 4 }, kiss: true, lines: ["You kiss her standing at the foot of the bed and let it build with no hurry at all — every layer of distance peeled back one at a time, her breath catching against your mouth, her hands deciding things before she says them. By the time you ease down onto the bed there's nothing tentative left in it."] }, lose: { hard: true, fx: { rom: -10, aff: -6 }, lines: ["You move too fast for where she actually is. {n} catches your hands and holds them still. \"I want to — I do — just not tonight, not like this.\" She means it kindly, and she means it. The night doesn't recover from here, and you both quietly know it."] } } },
          { label: "Take it all the way", gate: { inti: 9, rom: 60 }, roll: { dc: 15, win: { sex: true }, lose: { hard: true, fx: { rom: -12, aff: -7 }, lines: ["You reach for more than the moment is holding. {n} stops you — fully, gently, not unkindly. \"Hey. Not tonight.\" She sits up, fixes her shirt, and the warmth goes out of the room like a door opened on winter. The night's over, and it didn't end the way you wanted."] } } },
          { label: "Step back out", rooms: true },
        ] },
    ],
    swim: {
      ask: "The tub's hot and the night's quiet. {n} dips a hand in, then looks at you with the specific problem written on her face: nobody packed for this.",
      hasSuit: { lines: ["Turns out {n} came prepared — a swimsuit under the dress, because of course she had a feeling. She changes and slides in across from you, grinning at how smug she gets to be about it."], fx: { rom: 6, lib: 5, inti: 2 } },
      noSuit: [
        { label: "\"We don't have to — let's just sit by it.\"", fx: { rom: 4, aff: 5, inti: 1 }, lines: ["You wave it off and you both just sit on the edge, feet in, leaning into each other. Easy. She seems to like that you offered the out."] },
        { label: "\"Underwear's basically a swimsuit.\"", roll: { dc: 12, win: { fx: { rom: 9, lib: 9, inti: 3 }, lines: ["{n} considers you, then the water, then shrugs — \"it absolutely is not, but fine\" — and is down to it before you've finished agreeing. The water's hot, the space between you isn't, and nobody mentions the technicality again."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["\"Nice try.\" She laughs but keeps her dress firmly on, dangling her feet in instead. Pace check, noted."] } } },
        { label: "\"…or we skip the swimwear entirely.\"", roll: { dc: 15, into: true, win: { fx: { rom: 13, lib: 14, inti: 4 }, kiss: true, lines: ["You say it like a dare and {n} holds your eyes while she calls it — no hesitation in the end, just a slow smile and a quiet \"turn the porch light off, then.\" The water's dark and warm and very close."] }, lose: { hard: true, fx: { rom: -9, aff: -6 }, lines: ["It lands wrong. {n}'s smile flattens. \"Okay — that's a lot faster than I'm going.\" She pulls her feet out and reaches for her shoes, and the air's gone out of the night."] } }, sub: [
          { label: "Eventually get out — grab towels", fx: { rom: 6, aff: 4, inti: 2, attire: "towel" }, lines: ["You climb out laughing and freezing, and wrap her in the nearest towel, then yourself. She stays close for the warmth, hair dripping, not going inside just yet."] },
          { label: "Get out — don't bother with the towels", roll: { dc: 14, win: { fx: { rom: 11, lib: 12, inti: 4, attire: "bare" }, lines: ["Neither of you reaches for a towel. The walk back to the door is slow and unhurried and very awake, the night air doing nothing to cool any of it."] }, lose: { fx: { rom: -4, aff: -3, attire: "towel" }, lines: ["You go for bold; she grabs a towel with a pointed look. \"Confidence. Cute. Towel.\" Reset, gently."] } } },
          { label: "Back up", back: true },
        ] },
      ],
    },
    // Reached from any "all the way" beat. Condom needs one in your bag;
    // going raw is a real read of who she is.
    sex: {
      ask: "Everything narrows to right here. {n}'s breath is uneven against your jaw; her hand finds the back of your neck and stays. There's one small, honest beat left to get right.",
      condom: { lines: ["You reach for it; she watches you do it and something in her shoulders lets go — the kind of easy that only comes from not having to ask. After that there's nothing careful left in it, just the two of you and the lamp off and the rest of the night going exactly where it was always going.", "Some of it stays where it happened."], fx: { rom: 18, lib: 16, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She holds your eyes for the question and answers it by pulling you the rest of the way down. It's unhurried and certain and entirely, mutually meant — trust doing half the work the want started. Later she's tucked into the dark against you, tracing your collarbone, not going anywhere.", "Some of it stays where it happened."], fx: { rom: 20, lib: 18, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that. Not without.\" It's not anger, it's a line, and you went over it. The warmth leaves the room all at once, and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease off, forehead to hers, and just breathe for a second. {n} exhales a little laugh — half relief, half something rawer — and pulls you down to just hold her instead. Not nothing. Not tonight, the rest of it."] },
    },
  };

  const STAGES = [
    { min: 0, name: "Stranger" }, { min: 10, name: "Acquaintance" }, { min: 25, name: "Friend" },
    { min: 45, name: "Crush" }, { min: 70, name: "Close" }, { min: 95, name: "Smitten" },
  ];

  const TUNING = {
    barCap: 100, statCap: 25, baseDC: 10, dcPerInterest: 0.1,
    likedStyleBonus: 5, dislikedStylePenalty: 5, likedStatBonus: 2,
    startMoney: 20, dailyAllowance: 12,
    statModes: {
      easy: { label: "Take it easy", roll: [{ p: 1, min: 0.3, max: 0.6 }] },
      focused: { label: "Stay focused", roll: [{ p: 0.15, min: 0, max: 0 }, { p: 0.5, min: 0.3, max: 0.7 }, { p: 0.3, min: 1, max: 1 }, { p: 0.05, min: 2, max: 2 }] },
      allout: { label: "Go all-out", roll: [{ p: 0.3, min: 0, max: 0 }, { p: 0.35, min: 1, max: 1 }, { p: 0.35, min: 2, max: 2 }] },
    },
    workModes: { easy: { label: "Coast through it", mult: 1, variance: 0 }, hustle: { label: "Hustle for tips", mult: 1, variance: 0.5 } },
    beatBar: { crit: 7, success: 4, partial: 1, fail: -3 }, beatMomentum: { crit: 2, success: 1, partial: 0, fail: -2 }, beatAffSpill: 1,
    revealAfter: 3,
    numberMinInterest: 15, dateMinInterest: 30, kissMinRomance: 35, kissMinInterest: 55,
    numberDC: 13, dateDC: 14, kissDC: 18,
    numberReward: { affection: 3 }, numberFail: { affection: -3 },
    kissReward: { romance: 16, attractionEvent: 6 }, kissFail: { romance: -10, affection: -5 },
    moveBaseDC: 11, movePerInterestMissing: 0.18, moveReward: { romance: 12 }, moveFail: { romance: -8, affection: -3 },
    dateRomance: 9, dateAffection: 5, dateAttractionEvent: 4, dateContinueMinQ: 0.2, homeContinueMinRomance: 45, maxDateVenues: 3, cheapBillPenalty: 5,
    attractK: 4, attractBaseCap: 85, attractEventCap: 22,
    giftRomanceShare: 0.4, favoriteGiftMult: 2.2,
    textDC: 11, textReward: 4,
    partyInviteChance: 0.3, partyVibe: 2, partyLoud: 3, partyDrinkLibido: 14, overDrinkAt: 3,
    danceFail: { romance: -6, affection: -3 },
    privateReward: { romance: 18, libido: 14, attractionEvent: 5 }, privateFail: { romance: -10, affection: -6 },
  };

  window.GAMEDATA = {
    STATS, STAT_LABEL, STAT_SHORT, BARS, BAR_LABEL, BAR_SHORT, TRAITS,
    BACKGROUNDS, SAYS, MOVE, LINES, ITEMS, SHOPS, LOCATIONS, PHASES,
    CHARACTERS, BILL, DATE_SCENES, DATE_END, HOME, INTIMACY, PARTY, STAGES, TUNING,
  };
})();
