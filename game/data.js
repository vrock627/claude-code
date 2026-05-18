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
  };
  const SHOPS = { gym: ["preworkout", "protein"], cafe: ["espresso", "chocolates"], library: ["book"], park: ["flowers"], mall: ["outfit", "watch", "course", "tickets", "chocolates", "flowers", "wine"] };

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
    home: { intro: "Your place. Lower lights, no audience, the night slowing down to just the two of you.",
      beats: [
        { q: "She steps in, takes it all in. \"So this is you.\"", opts: [
          { text: "Cook for her, properly", trait: "generous", mag: 3 },
          { text: "Put on something you love, explain why", trait: "sincere", mag: 3 },
          { text: "Pour two glasses, let it breathe", trait: "classy", mag: 3 } ] },
        { q: "It goes quiet and close. Her eyes haven't left yours.", opts: [
          { text: "Say exactly what you feel", trait: "sincere", mag: 3 },
          { text: "Let the moment take over", trait: "adventurous", mag: 3 },
          { text: "Slow it down on purpose", trait: "classy", mag: 2 } ] } ] },
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
    // What other guests do during a game round (narrated even when you're not involved).
    guestBeats: [
      "{n} takes the dare without blinking and the circle loses it.", "{n} deflects with a joke so smooth nobody notices she dodged.",
      "{n} answers way too honestly and the room goes \"ooooh.\"", "{n} drags someone else into her turn and makes it their problem.",
      "{n} rolls her eyes, then does it anyway, grinning.",
    ],
    spicyGuestBeats: [
      "{n} holds eye contact with you while she answers. On purpose.", "{n}'s dare ends with her in someone's lap, laughing.",
      "{n} leans in and whispers her answer, and whoever hears it goes red.", "{n} picks the spicy option without hesitating and watches your face.",
    ],
    privateGateFlow: 2, privateGateInterest: 45,
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
    CHARACTERS, BILL, DATE_SCENES, DATE_END, PARTY, STAGES, TUNING,
  };
})();
