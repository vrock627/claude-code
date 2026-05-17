(function () {
  const STATS = ["strength", "style", "intelligence", "charisma"];
  const STAT_LABEL = { strength: "Strength", style: "Style", intelligence: "Intelligence", charisma: "Charisma" };
  const STAT_SHORT = { strength: "STR", style: "STY", intelligence: "INT", charisma: "CHA" };

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

  const SHOPS = {
    gym: ["preworkout", "protein"],
    cafe: ["espresso", "chocolates"],
    library: ["book"],
    park: ["flowers"],
    mall: ["outfit", "watch", "course", "tickets", "chocolates", "flowers", "wine"],
  };

  // dateCost = the bill if you take her here on a date.
  const LOCATIONS = {
    gym: { name: "The Gym", emoji: "🏋️", blurb: "Clanking iron and mirror selfies.",
      action: { label: "Train hard", stat: "strength", text: "You grind through the reps." } },
    library: { name: "The Library", emoji: "📚", blurb: "Hushed, warm, smells of old paper.",
      action: { label: "Study", stat: "intelligence", text: "You read instead of doomscrolling." } },
    cafe: { name: "The Café", emoji: "☕", blurb: "Espresso machine screaming, everyone half-working.", social: true, dateSpot: true, dateCost: 14,
      action: { label: "Banter with strangers", stat: "charisma", text: "You charm the barista and three regulars." },
      work: { label: "Pick up a barista shift", wage: 14, text: "Six hours of latte art and small talk." } },
    club: { name: "Neon Club", emoji: "🪩", blurb: "Bass you feel in your sternum.", social: true, dateSpot: true, dateCost: 35,
      action: { label: "Work the room", stat: "style", text: "You move like you mean it." } },
    park: { name: "The Park", emoji: "🌳", blurb: "Joggers, dogs, a guy selling flowers.", social: true, dateSpot: true, dateCost: 10,
      action: { label: "Mingle on the green", stat: "charisma", text: "Easy chatter with strangers and their dogs." } },
    restaurant: { name: "The Bistro", emoji: "🍝", blurb: "Warm light, real napkins, a wine list.", social: true, dateSpot: true, dateCost: 42,
      action: { label: "Linger over coffee", stat: "style", text: "You soak up the ambience and people-watch." },
      work: { label: "Wait tables tonight", wage: 20, text: "On your feet for hours, but the tips are good." } },
    mall: { name: "The Mall", emoji: "🛍️", blurb: "Fountains, food court, retail purgatory.",
      action: { label: "Study the trends", stat: "style", text: "You window-shop with intent." },
      work: { label: "Work a retail shift", wage: 18, text: "Folding the same sweater forty times." } },
    home: { name: "Home", emoji: "🏠", blurb: "Yours. Quiet. Somewhere to crash.", home: true, dateCost: 12 },
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
    },
    priya: {
      name: "Priya", emoji: "☕", blurb: "Barista and grad student. Will out-argue you and refill your cup while doing it.",
      likedStat: "intelligence", likedStyle: "playful", dislikedStyle: "brash", favoriteGift: "chocolates",
      schedule: { Morning: "cafe", Afternoon: "library", Night: "cafe" },
      hint: "Wit over muscle. Quick, warm banter wins; chest-beating loses her.",
      attractProfile: { intelligence: 0.4, charisma: 0.35, style: 0.15, strength: 0.1 },
      barWeights: { affection: 0.4, romance: 0.25, attraction: 0.2, libido: 0.15 },
      libidoRange: [20, 55], decay: { affection: 1, romance: 4 },
      traitAffinity: { playful: 3, sincere: 2, classy: 1, adventurous: 1, independent: 1, generous: 0 },
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
    },
  };

  const DATE_SCENES = {
    restaurant: { intro: "Candlelight, a shared bottle, the good silverware.", beats: [
      { q: "She asks what you're having. You —", opts: [
        { text: "Order for both of you, confidently", trait: "adventurous", mag: 2 },
        { text: "Ask what she'd recommend", trait: "sincere", mag: 2 },
        { text: "Get the tasting menu, grinning", trait: "generous", mag: 2 } ] },
      { q: "Conversation lulls. You —", opts: [
        { text: "Ask about something she's passionate about", trait: "sincere", mag: 3 },
        { text: "Tell a ridiculous story", trait: "playful", mag: 3 },
        { text: "Let the silence be comfortable", trait: "independent", mag: 2 } ] } ] },
    park: { intro: "A blanket, cheap snacks, the whole afternoon ahead.", beats: [
      { q: "She points at the clouds. You —", opts: [
        { text: "Invent a dumb story for each one", trait: "playful", mag: 3 },
        { text: "Lie back and just watch with her", trait: "sincere", mag: 3 },
        { text: "Race her to the trees", trait: "adventurous", mag: 3 } ] },
      { q: "Golden hour. You —", opts: [
        { text: "Tell her something true", trait: "sincere", mag: 3 },
        { text: "Pull her up to dance with no music", trait: "adventurous", mag: 3 },
        { text: "Keep her guessing", trait: "playful", mag: 2 } ] } ] },
    cafe: { intro: "Corner table, two coffees, low background hum.", beats: [
      { q: "She's reading the menu. You —", opts: [
        { text: "Order her usual from memory", trait: "sincere", mag: 3 },
        { text: "Dare her to try the weirdest drink", trait: "adventurous", mag: 3 },
        { text: "Get matching pastries", trait: "playful", mag: 2 } ] },
      { q: "She opens up about a hard week. You —", opts: [
        { text: "Listen, really listen", trait: "sincere", mag: 3 },
        { text: "Offer to actually help fix it", trait: "generous", mag: 3 },
        { text: "Make her laugh about it", trait: "playful", mag: 2 } ] } ] },
    club: { intro: "Lights, bass, a roped-off booth — possibly her turf.", beats: [
      { q: "She pulls you toward the floor. You —", opts: [
        { text: "Go all in, no hesitation", trait: "adventurous", mag: 3 },
        { text: "Hang back and watch her move", trait: "classy", mag: 2 },
        { text: "Make a goofy bit of it", trait: "playful", mag: 2 } ] },
      { q: "Someone tries to cut in. You —", opts: [
        { text: "Stay cool, let her handle it", trait: "independent", mag: 3 },
        { text: "Smoothly close the space", trait: "adventurous", mag: 3 },
        { text: "Buy the whole booth a round", trait: "generous", mag: 2 } ] } ] },
    home: { intro: "Your place. Lower lights, no audience, the night slows down.", beats: [
      { q: "She steps inside and looks around. You —", opts: [
        { text: "Cook for her, properly", trait: "generous", mag: 3 },
        { text: "Put on something you love and explain why", trait: "sincere", mag: 3 },
        { text: "Pour two glasses and let it breathe", trait: "classy", mag: 3 } ] },
      { q: "It gets quiet and close. You —", opts: [
        { text: "Say exactly what you feel", trait: "sincere", mag: 3 },
        { text: "Let the moment take over", trait: "adventurous", mag: 3 },
        { text: "Slow it down on purpose", trait: "classy", mag: 2 } ] } ] },
  };

  // Bill options shared by every venue. cost = fraction of dateCost.
  const BILL = [
    { id: "tab", text: "Pick up the tab", costMul: 1, trait: "generous", mag: 3 },
    { id: "split", text: "Split it", costMul: 0.5, trait: "independent", mag: 2 },
    { id: "ask", text: "Let her get it", costMul: 0, trait: "independent", mag: 1, cheap: true },
  ];

  // Interactive party content.
  const PARTY = {
    rounds: 4,
    games: [
      { id: "truth", label: "Truth or Dare" },
      { id: "spin", label: "Spin the Bottle" },
      { id: "pong", label: "Beer Pong" },
    ],
    truths: [
      "Who in this room would you actually date?",
      "What's the most embarrassing thing you did this year?",
      "What's a secret nobody here knows about you?",
      "Biggest red flag you ignored for someone?",
    ],
    dares: [
      "Do your worst dance move, right now.",
      "Let someone here restyle your hair.",
      "Do a dramatic reading of the last thing in your texts.",
      "Serenade the nearest person, badly.",
    ],
    // Options you can hand someone when it's your turn to ask.
    askTruths: [
      { text: "\"Who here do you have a crush on?\"", trait: "adventurous", mag: 3 },
      { text: "\"What's something you secretly want?\"", trait: "sincere", mag: 3 },
    ],
    askDares: [
      { text: "Dare her to dance with you", trait: "adventurous", mag: 3 },
      { text: "Dare her to give you her honest first impression", trait: "sincere", mag: 2 },
    ],
  };

  const STAGES = [
    { min: 0, name: "Stranger" }, { min: 10, name: "Acquaintance" },
    { min: 25, name: "Friend" }, { min: 45, name: "Crush" },
    { min: 70, name: "Close" }, { min: 95, name: "Smitten" },
  ];

  const TUNING = {
    barCap: 100, statCap: 25, baseDC: 10, dcPerInterest: 0.1,
    likedStyleBonus: 5, dislikedStylePenalty: 5, likedStatBonus: 2,
    startMoney: 20, dailyAllowance: 12,

    // Effort modes for training (fractional, random).
    statModes: {
      easy: { label: "Take it easy", roll: [{ p: 1, min: 0.3, max: 0.6 }] },
      focused: { label: "Stay focused", roll: [{ p: 0.15, min: 0, max: 0 }, { p: 0.5, min: 0.3, max: 0.7 }, { p: 0.3, min: 1, max: 1 }, { p: 0.05, min: 2, max: 2 }] },
      allout: { label: "Go all-out", roll: [{ p: 0.3, min: 0, max: 0 }, { p: 0.35, min: 1, max: 1 }, { p: 0.35, min: 2, max: 2 }] },
    },
    workModes: {
      easy: { label: "Coast through it", mult: 1, variance: 0 },
      hustle: { label: "Hustle for tips", mult: 1, variance: 0.5 },
    },

    beatBar: { crit: 7, success: 4, partial: 1, fail: -3 },
    beatMomentum: { crit: 2, success: 1, partial: 0, fail: -2 },
    beatAffSpill: 1,
    revealHintAfter: 3,

    numberMinInterest: 15, dateMinInterest: 30,
    kissMinRomance: 35, kissMinInterest: 55,
    numberDC: 13, dateDC: 14, kissDC: 18,
    numberReward: { affection: 3 }, numberFail: { affection: -3 },
    kissReward: { romance: 16, attractionEvent: 6 }, kissFail: { romance: -10, affection: -5 },

    moveBaseDC: 11, movePerInterestMissing: 0.18,
    moveReward: { romance: 12 }, moveFail: { romance: -8, affection: -3 },

    dateRomance: 9, dateAffection: 5, dateAttractionEvent: 4,
    dateContinueMinQ: 0.2,           // night keeps going only if it's landing
    homeContinueMinRomance: 45,      // Home is only offered when it's hot
    maxDateVenues: 3,
    cheapBillPenalty: 5,             // flat affection hit for "let her get it" (eased if she's independent)

    attractK: 4, attractBaseCap: 85, attractEventCap: 22,
    giftRomanceShare: 0.4, favoriteGiftMult: 2.2,
    textDC: 11, textReward: 4,

    partyInviteChance: 0.3, partyVibe: 2, partyLoud: 3, partyDrinkLibido: 14,
    overDrinkAt: 3,
  };

  window.GAMEDATA = {
    STATS, STAT_LABEL, STAT_SHORT, BARS, BAR_LABEL, BAR_SHORT, TRAITS,
    BACKGROUNDS, RESPONSES, MOVE, LINES, ITEMS, SHOPS, LOCATIONS, PHASES,
    CHARACTERS, DATE_SCENES, BILL, PARTY, STAGES, TUNING,
  };
})();
