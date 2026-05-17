(function () {
  const STATS = ["strength", "style", "intelligence", "charisma"];
  const STAT_LABEL = { strength: "Strength", style: "Style", intelligence: "Intelligence", charisma: "Charisma" };
  const STAT_SHORT = { strength: "STR", style: "STY", intelligence: "INT", charisma: "CHA" };

  // Four interest bars. attraction is derived (no stored value besides event bonus).
  const BARS = ["attraction", "affection", "romance", "libido"];
  const BAR_LABEL = { attraction: "Attraction", affection: "Affection", romance: "Romance", libido: "Libido" };
  const BAR_SHORT = { attraction: "ATR", affection: "AFF", romance: "ROM", libido: "LIB" };

  const TRAITS = ["sincere", "playful", "classy", "adventurous", "generous", "independent"];

  const BACKGROUNDS = {
    athlete: { name: "Athlete", emoji: "🏋️", blurb: "Gym rat. Strong, steady, terrible at small talk.",
      stats: { strength: 8, style: 4, intelligence: 3, charisma: 3 } },
    scholar: { name: "Scholar", emoji: "🎓", blurb: "Reads everything. Sharp mind, soft handshake.",
      stats: { strength: 3, style: 3, intelligence: 8, charisma: 4 } },
    socialite: { name: "Socialite", emoji: "🥂", blurb: "Knows everyone. Charm first, substance later.",
      stats: { strength: 2, style: 6, intelligence: 2, charisma: 8 } },
    artist: { name: "Artist", emoji: "🎨", blurb: "All taste and vibes. Style for days.",
      stats: { strength: 2, style: 8, intelligence: 5, charisma: 3 } },
  };

  // Conversation responses. Each rolls a stat, pushes a bar, carries a trait + style
  // (style is matched against a character's liked/disliked style for vibe).
  const RESPONSES = [
    { text: "Ask what's really on her mind", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere" },
    { text: "Share something real about yourself", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere" },
    { text: "Talk about something you genuinely love", style: "thoughtful", stat: "intelligence", bar: "affection", trait: "sincere" },
    { text: "Tease her, just a little", style: "playful", stat: "charisma", bar: "romance", trait: "playful" },
    { text: "Make her laugh", style: "playful", stat: "charisma", bar: "affection", trait: "playful" },
    { text: "Riff and keep it light", style: "playful", stat: "charisma", bar: "affection", trait: "playful" },
    { text: "Hold eye contact, lower your voice", style: "bold", stat: "charisma", bar: "romance", trait: "adventurous" },
    { text: "Suggest sneaking off somewhere", style: "bold", stat: "charisma", bar: "romance", trait: "adventurous" },
    { text: "Compliment her taste", style: "smooth", stat: "style", bar: "attraction", trait: "classy" },
    { text: "Be warm and completely at ease", style: "smooth", stat: "charisma", bar: "affection", trait: "sincere" },
    { text: "Tell a story where you come off well", style: "brash", stat: "strength", bar: "attraction", trait: "adventurous" },
    { text: "Offer to help her with something", style: "smooth", stat: "charisma", bar: "affection", trait: "generous" },
  ];

  const MOVE = { text: "Make a move 💋", style: "bold", stat: "charisma", bar: "romance" };

  // Character lines, keyed by mood (derived from composite interest).
  const LINES = {
    cold: {
      open: ["{n} gives you a flat, polite nod.", "{n} barely looks up. \"Oh. Hi.\"", "{n}: \"Did you need something?\""],
      crit: ["Something you said actually lands. {n} blinks, reassessing.", "{n} pauses. \"...Huh. Okay, that was good.\""],
      success: ["{n} thaws a degree.", "{n}: \"Hm. Not bad.\""],
      partial: ["{n} gives a noncommittal shrug.", "{n} checks her phone."],
      fail: ["{n} visibly disengages.", "{n}: \"Right. Anyway.\""],
    },
    neutral: {
      open: ["{n}: \"Hey, you. What's up?\"", "{n} tilts her head, mildly curious.", "{n}: \"Funny running into you.\""],
      crit: ["{n} laughs, caught off guard in a good way.", "{n} leans in. \"Okay, tell me more.\""],
      success: ["{n} smiles. \"I like that.\"", "{n} nods along, into it."],
      partial: ["{n}: \"Mm. Sure.\"", "{n}'s attention drifts a little."],
      fail: ["{n} frowns slightly. \"Okay then.\"", "{n} pulls back a bit."],
    },
    warm: {
      open: ["{n} lights up when she sees you.", "{n}: \"There you are.\"", "{n} bites back a grin. \"Hi, trouble.\""],
      crit: ["{n} goes warm and bright. \"God, I like talking to you.\"", "{n}'s whole face changes. That landed deep."],
      success: ["{n} holds your gaze a beat too long.", "{n}: \"You're kind of great, you know that?\""],
      partial: ["{n}: \"...okay.\" The spark dims a touch.", "{n} lets that one slide by."],
      fail: ["{n} cools, and you feel it.", "{n}: \"Oh.\" A small step back."],
    },
    hot: {
      open: ["{n} is already smiling before you say a word.", "{n}: \"I was hoping it'd be you.\"", "{n} stands a little closer than she needs to."],
      crit: ["The air goes electric. {n} doesn't look away.", "{n}, quietly: \"Keep talking like that.\""],
      success: ["{n} brushes your arm and lets it linger.", "{n}: \"You're trouble. I like it.\""],
      partial: ["{n}'s smile flickers. \"Hm.\"", "{n} waits for you to do better."],
      fail: ["{n} stiffens. The heat drains out of it.", "{n}: \"Wow. Way to kill it.\""],
    },
  };

  const ITEMS = {
    espresso: { name: "Double Espresso", emoji: "☕", price: 6, type: "tempStat", stat: "charisma", amount: 3, phases: 1,
      desc: "Liquid confidence. +3 CHA for the next part of the day." },
    preworkout: { name: "Pre-Workout", emoji: "🥤", price: 9, type: "tempStat", stat: "strength", amount: 4, phases: 2,
      desc: "Jittery power. +4 STR for two phases." },
    outfit: { name: "Sharp Outfit", emoji: "👔", price: 15, type: "tempStat", stat: "style", amount: 4, phases: 3,
      desc: "Dress to kill. +4 STY for three phases." },
    protein: { name: "Protein Plan", emoji: "💪", price: 18, type: "permStat", stat: "strength", amount: 1,
      desc: "Real gains. +1 STR, permanently." },
    course: { name: "Online Course", emoji: "💻", price: 24, type: "permStat", stat: "intelligence", amount: 2,
      desc: "Actually finish it. +2 INT, permanently." },
    watch: { name: "Designer Watch", emoji: "⌚", price: 32, type: "permStat", stat: "style", amount: 2,
      desc: "Quiet flex. +2 STY, permanently." },
    flowers: { name: "Flowers", emoji: "💐", price: 8, type: "gift", value: 6, desc: "Classic. A safe little nudge for anyone." },
    chocolates: { name: "Chocolates", emoji: "🍫", price: 11, type: "gift", value: 8, desc: "Sweet, well-received by most." },
    book: { name: "Rare First Edition", emoji: "📕", price: 17, type: "gift", value: 6, desc: "Niche. The right person melts for it." },
    tickets: { name: "Concert Tickets", emoji: "🎫", price: 21, type: "gift", value: 6, desc: "Niche. The right person loses it." },
    wine: { name: "Bottle of Wine", emoji: "🍷", price: 14, type: "gift", value: 5, desc: "Loosens the evening. A romantic, slightly bold pick." },
  };

  const SHOPS = {
    gym: ["preworkout", "protein"],
    cafe: ["espresso", "chocolates"],
    library: ["book"],
    park: ["flowers"],
    mall: ["outfit", "watch", "course", "tickets", "chocolates", "flowers", "wine"],
  };

  const LOCATIONS = {
    gym: { name: "The Gym", emoji: "🏋️", blurb: "Clanking iron and mirror selfies.",
      action: { label: "Train hard", stat: "strength", text: "You grind through the reps." } },
    library: { name: "The Library", emoji: "📚", blurb: "Hushed, warm, smells of old paper.",
      action: { label: "Study", stat: "intelligence", text: "You read instead of doomscrolling." } },
    cafe: { name: "The Café", emoji: "☕", blurb: "Espresso machine screaming, everyone half-working.", social: true, dateSpot: true,
      action: { label: "Banter with strangers", stat: "charisma", text: "You charm the barista and three regulars." },
      work: { label: "Pick up a barista shift", wage: 14, text: "Six hours of latte art and small talk." } },
    club: { name: "Neon Club", emoji: "🪩", blurb: "Bass you feel in your sternum.", social: true, dateSpot: true,
      action: { label: "Work the room", stat: "style", text: "You move like you mean it." } },
    park: { name: "The Park", emoji: "🌳", blurb: "Joggers, dogs, a guy selling flowers.", social: true, dateSpot: true,
      action: { label: "Mingle on the green", stat: "charisma", text: "Easy chatter with strangers and their dogs." } },
    restaurant: { name: "The Bistro", emoji: "🍝", blurb: "Warm light, real napkins, a wine list.", social: true, dateSpot: true,
      action: { label: "Linger over coffee", stat: "style", text: "You soak up the ambience and people-watch." },
      work: { label: "Wait tables tonight", wage: 20, text: "On your feet for hours, but the tips are good." } },
    mall: { name: "The Mall", emoji: "🛍️", blurb: "Fountains, food court, retail purgatory.",
      action: { label: "Study the trends", stat: "style", text: "You window-shop with intent." },
      work: { label: "Work a retail shift", wage: 18, text: "Folding the same sweater forty times." } },
    home: { name: "Home", emoji: "🏠", blurb: "Yours. Quiet. Somewhere to crash.", home: true },
  };

  const PHASES = ["Morning", "Afternoon", "Night"];

  const CHARACTERS = {
    aiko: {
      name: "Aiko", emoji: "📖",
      blurb: "Reference librarian. Reads three books a week and quietly judges yours.",
      likedStat: "intelligence", likedStyle: "thoughtful", dislikedStyle: "brash",
      favoriteGift: "book",
      schedule: { Morning: "library", Afternoon: "park", Night: "library" },
      hint: "A slow burn. Sincerity and a sharp mind move her; flash bounces off.",
      // What she finds attractive (player-stat weights, sum 1).
      attractProfile: { intelligence: 0.5, charisma: 0.2, style: 0.2, strength: 0.1 },
      // Which bars drive how she responds (sum 1).
      barWeights: { affection: 0.45, attraction: 0.3, romance: 0.15, libido: 0.1 },
      libidoRange: [8, 38],
      decay: { affection: 1, romance: 4 },
      traitAffinity: { sincere: 3, classy: 2, generous: 1, playful: 0, adventurous: -1, independent: 2 },
    },
    bianca: {
      name: "Bianca", emoji: "🎧",
      blurb: "Club DJ. Reads a room in two seconds, reads books approximately never.",
      likedStat: "charisma", likedStyle: "bold", dislikedStyle: "thoughtful",
      favoriteGift: "tickets",
      schedule: { Morning: "cafe", Afternoon: "mall", Night: "club" },
      hint: "Hot and fast. Confidence and nerve spike her; overthinking kills it.",
      attractProfile: { charisma: 0.4, style: 0.35, strength: 0.2, intelligence: 0.05 },
      barWeights: { romance: 0.35, attraction: 0.25, libido: 0.25, affection: 0.15 },
      libidoRange: [35, 82],
      decay: { affection: 1, romance: 6 },
      traitAffinity: { adventurous: 3, playful: 2, independent: 2, classy: 0, sincere: 0, generous: -1 },
    },
  };

  // Date scenes: each spot has decision points; options carry a trait + magnitude.
  const DATE_SCENES = {
    restaurant: {
      intro: "Candlelight, a shared bottle, the good silverware.",
      beats: [
        { q: "She asks what you're having. You —", opts: [
          { text: "Order for both of you, confidently", trait: "adventurous", mag: 2 },
          { text: "Ask what she'd recommend", trait: "sincere", mag: 2 },
          { text: "Get the most expensive thing, grinning", trait: "generous", mag: 2 } ] },
        { q: "Conversation lulls. You —", opts: [
          { text: "Ask about something she's passionate about", trait: "sincere", mag: 3 },
          { text: "Tell a ridiculous story", trait: "playful", mag: 3 },
          { text: "Let the silence be comfortable", trait: "independent", mag: 2 } ] },
        { q: "The check arrives. You —", opts: [
          { text: "Pick up the tab", trait: "generous", mag: 3 },
          { text: "Suggest splitting it", trait: "independent", mag: 3 },
          { text: "\"Get the next one?\"", trait: "playful", mag: 2 } ] },
      ],
    },
    park: {
      intro: "A blanket, cheap snacks, the whole afternoon ahead.",
      beats: [
        { q: "She points at the clouds. You —", opts: [
          { text: "Make up a dumb story about each one", trait: "playful", mag: 3 },
          { text: "Lie back and just watch with her", trait: "sincere", mag: 3 },
          { text: "Challenge her to a race to the trees", trait: "adventurous", mag: 3 } ] },
        { q: "A dog steals your snack. You —", opts: [
          { text: "Chase it, laughing", trait: "playful", mag: 2 },
          { text: "Let it go, buy more", trait: "generous", mag: 2 },
          { text: "Shrug it off coolly", trait: "independent", mag: 2 } ] },
        { q: "Golden hour. You —", opts: [
          { text: "Tell her something true", trait: "sincere", mag: 3 },
          { text: "Pull her up to dance with no music", trait: "adventurous", mag: 3 },
          { text: "Keep it light, keep her guessing", trait: "playful", mag: 2 } ] },
      ],
    },
    cafe: {
      intro: "Corner table, two coffees, low background hum.",
      beats: [
        { q: "She's reading the menu. You —", opts: [
          { text: "Order her usual from memory", trait: "sincere", mag: 3 },
          { text: "Dare her to try the weirdest drink", trait: "adventurous", mag: 3 },
          { text: "Get matching pastries", trait: "playful", mag: 2 } ] },
        { q: "She opens up about a hard week. You —", opts: [
          { text: "Listen, really listen", trait: "sincere", mag: 3 },
          { text: "Offer to actually help fix it", trait: "generous", mag: 3 },
          { text: "Make her laugh about it", trait: "playful", mag: 2 } ] },
        { q: "Time to go. You —", opts: [
          { text: "Walk her home the long way", trait: "sincere", mag: 3 },
          { text: "\"Same time next week?\"", trait: "playful", mag: 2 },
          { text: "Let her head off, no pressure", trait: "independent", mag: 2 } ] },
      ],
    },
    club: {
      intro: "Her turf. Lights, bass, a roped-off booth.",
      beats: [
        { q: "She pulls you toward the floor. You —", opts: [
          { text: "Go all in, no hesitation", trait: "adventurous", mag: 3 },
          { text: "Hang back and watch her move", trait: "classy", mag: 2 },
          { text: "Make a goofy bit of it", trait: "playful", mag: 2 } ] },
        { q: "Someone tries to cut in. You —", opts: [
          { text: "Stay cool, let her handle it", trait: "independent", mag: 3 },
          { text: "Smoothly close the space", trait: "adventurous", mag: 3 },
          { text: "Buy the whole booth a round", trait: "generous", mag: 2 } ] },
        { q: "Last song. You —", opts: [
          { text: "Pull her close", trait: "adventurous", mag: 3 },
          { text: "Sing it badly, just for her", trait: "playful", mag: 2 },
          { text: "Catch your breath together outside", trait: "sincere", mag: 2 } ] },
      ],
    },
  };

  // House-party activities (the party is a hidden, temporary location).
  const PARTY_ACTS = {
    drink: { label: "Grab a drink", desc: "Bolder, looser, a little fuzzy." },
    buyHer: { label: "Bring her a drink", desc: "Warms her up — and her libido." },
    dance: { label: "Pull her onto the floor", desc: "Roll STY/CHA for a romance spike." },
    game: { label: "Join the party game", desc: "Truth-or-dare chaos. High variance." },
  };
  const PARTY_GAME = {
    prompts: [
      "Truth or dare. She picks dare and dares you to —",
      "Never Have I Ever goes somewhere personal —",
      "Spin the bottle. It wobbles, then points —",
      "Two truths and a lie, and hers are unreadable —",
    ],
  };

  const STAGES = [
    { min: 0, name: "Stranger" }, { min: 10, name: "Acquaintance" },
    { min: 25, name: "Friend" }, { min: 45, name: "Crush" },
    { min: 70, name: "Close" }, { min: 95, name: "Smitten" },
  ];

  const TUNING = {
    barCap: 100,
    statCap: 25,
    baseDC: 10,
    dcPerInterest: 0.1,
    likedStyleBonus: 5,
    dislikedStylePenalty: 5,
    likedStatBonus: 2,

    startMoney: 20,
    dailyAllowance: 12,

    // Fractional, random stat training. Weighted outcomes.
    statRoll: [
      { p: 0.15, min: 0, max: 0 },
      { p: 0.5, min: 0.3, max: 0.7 },
      { p: 0.3, min: 1, max: 1 },
      { p: 0.05, min: 2, max: 2 },
    ],

    // Conversation beat outcomes (applied to the chosen response's bar).
    beatBar: { crit: 7, success: 4, partial: 1, fail: -3 },
    beatMomentum: { crit: 2, success: 1, partial: 0, fail: -2 },
    beatAffSpill: 1, // tiny affection bump on any positive beat

    revealHintAfter: 3,

    // Capstone "moves".
    numberMinInterest: 15,
    dateMinInterest: 30,
    kissMinRomance: 35,
    kissMinInterest: 55,
    numberDC: 13,
    dateDC: 14,
    kissDC: 18,
    numberReward: { affection: 3 },
    numberFail: { affection: -3 },
    kissReward: { romance: 16, attractionEvent: 6 },
    kissFail: { romance: -10, affection: -5 },

    // Always-available inline move. DC rises as interest falls.
    moveBaseDC: 11,
    movePerInterestMissing: 0.18, // *(60 - interest) added to DC when below 60
    moveReward: { romance: 12 },
    moveFail: { romance: -8, affection: -3 },

    // Dates.
    dateRomance: 10, // base, scaled by how well choices fit her traits
    dateAffection: 6,
    dateAttractionEvent: 4,

    // Bars: derivation, daily roll, decay, events.
    attractK: 4,
    attractBaseCap: 85,
    attractEventCap: 22,

    giftRomanceShare: 0.4, // gifts move affection fully + a bit of romance
    favoriteGiftMult: 2.2,

    textDC: 11,
    textReward: 4,

    partyInviteChance: 0.3,
    partyVibe: 2,
    partyLoud: 3,
    partyDrinkLibido: 14, // her libido bump when you bring her a drink
  };

  window.GAMEDATA = {
    STATS, STAT_LABEL, STAT_SHORT, BARS, BAR_LABEL, BAR_SHORT, TRAITS,
    BACKGROUNDS, RESPONSES, MOVE, LINES, ITEMS, SHOPS, LOCATIONS, PHASES,
    CHARACTERS, DATE_SCENES, PARTY_ACTS, PARTY_GAME, STAGES, TUNING,
  };
})();
