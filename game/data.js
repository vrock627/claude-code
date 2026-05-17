(function () {
  // Player stats
  const STATS = ["strength", "style", "intelligence", "charisma"];
  const STAT_LABEL = {
    strength: "Strength",
    style: "Style",
    intelligence: "Intelligence",
    charisma: "Charisma",
  };
  const STAT_SHORT = {
    strength: "STR",
    style: "STY",
    intelligence: "INT",
    charisma: "CHA",
  };

  // Starting backgrounds — each sums to 18 points across the four stats.
  const BACKGROUNDS = {
    athlete: {
      name: "Athlete",
      emoji: "🏋️",
      blurb: "Gym rat. Strong, steady, terrible at small talk.",
      stats: { strength: 8, style: 4, intelligence: 3, charisma: 3 },
    },
    scholar: {
      name: "Scholar",
      emoji: "🎓",
      blurb: "Reads everything. Sharp mind, soft handshake.",
      stats: { strength: 3, style: 3, intelligence: 8, charisma: 4 },
    },
    socialite: {
      name: "Socialite",
      emoji: "🥂",
      blurb: "Knows everyone. Charm first, substance later.",
      stats: { strength: 2, style: 6, intelligence: 2, charisma: 8 },
    },
    artist: {
      name: "Artist",
      emoji: "🎨",
      blurb: "All taste and vibes. Style for days.",
      stats: { strength: 2, style: 8, intelligence: 5, charisma: 3 },
    },
  };

  // Conversation approaches. Each rolls a specific player stat.
  const APPROACHES = [
    { id: "witty", label: "Make a clever observation", style: "thoughtful", stat: "intelligence" },
    { id: "bold", label: "Flirt boldly", style: "bold", stat: "charisma" },
    { id: "playful", label: "Crack a joke", style: "playful", stat: "charisma" },
    { id: "flex", label: "Show off (subtly)", style: "brash", stat: "strength" },
    { id: "smooth", label: "Compliment her taste", style: "smooth", stat: "style" },
  ];

  // Shop catalogue. type: tempStat | permStat | gift | tool
  const ITEMS = {
    espresso: { name: "Double Espresso", emoji: "☕", price: 6, type: "tempStat",
      stat: "charisma", amount: 3, phases: 1,
      desc: "Liquid confidence. +3 CHA for the next part of the day." },
    preworkout: { name: "Pre-Workout", emoji: "🥤", price: 9, type: "tempStat",
      stat: "strength", amount: 4, phases: 2,
      desc: "Jittery power. +4 STR for two phases." },
    outfit: { name: "Sharp Outfit", emoji: "👔", price: 15, type: "tempStat",
      stat: "style", amount: 4, phases: 3,
      desc: "Dress to kill. +4 STY for three phases." },
    protein: { name: "Protein Plan", emoji: "💪", price: 18, type: "permStat",
      stat: "strength", amount: 1,
      desc: "Real gains. +1 STR, permanently." },
    course: { name: "Online Course", emoji: "💻", price: 24, type: "permStat",
      stat: "intelligence", amount: 2,
      desc: "Actually finish it. +2 INT, permanently." },
    watch: { name: "Designer Watch", emoji: "⌚", price: 32, type: "permStat",
      stat: "style", amount: 2,
      desc: "Quiet flex. +2 STY, permanently." },
    flowers: { name: "Flowers", emoji: "💐", price: 8, type: "gift", value: 6,
      desc: "Classic. A safe little affection boost for anyone." },
    chocolates: { name: "Chocolates", emoji: "🍫", price: 11, type: "gift", value: 8,
      desc: "Sweet and well-received by most." },
    book: { name: "Rare First Edition", emoji: "📕", price: 17, type: "gift", value: 6,
      desc: "Niche. Some people will absolutely melt for this." },
    tickets: { name: "Concert Tickets", emoji: "🎫", price: 21, type: "gift", value: 6,
      desc: "Niche. The right person will lose their mind." },
    phone: { name: "Smartphone", emoji: "📱", price: 26, type: "tool",
      desc: "Texting and date plans. Required to contact anyone." },
  };

  // location -> item ids on sale there
  const SHOPS = {
    gym: ["preworkout", "protein"],
    cafe: ["espresso", "chocolates"],
    library: ["book"],
    park: ["flowers"],
    mall: ["outfit", "watch", "course", "phone", "tickets", "chocolates", "flowers"],
  };

  const LOCATIONS = {
    gym: { name: "The Gym", emoji: "🏋️", blurb: "Clanking iron and mirror selfies.",
      action: { label: "Train hard", stat: "strength", gain: 1,
        text: "You grind through the reps. Your arms file a complaint. Strength up." } },
    library: { name: "The Library", emoji: "📚", blurb: "Hushed, warm, smells of old paper.",
      action: { label: "Study", stat: "intelligence", gain: 1,
        text: "You read instead of doomscrolling. Intelligence up." } },
    cafe: { name: "The Café", emoji: "☕", blurb: "Espresso machine screaming, everyone half-working.",
      social: true,
      action: { label: "Banter with strangers", stat: "charisma", gain: 1,
        text: "You charm the barista and three regulars. Charisma up." },
      work: { label: "Pick up a barista shift", wage: 14,
        text: "Six hours of latte art and small talk. Cash in hand." } },
    club: { name: "Neon Club", emoji: "🪩", blurb: "Bass you feel in your sternum.",
      social: true,
      action: { label: "Work the room", stat: "style", gain: 1,
        text: "You move like you mean it. Style up." } },
    park: { name: "The Park", emoji: "🌳", blurb: "Joggers, dogs, a guy selling flowers.",
      social: true,
      action: { label: "Mingle on the green", stat: "charisma", gain: 1,
        text: "Easy chatter with strangers and their dogs. Charisma up." } },
    mall: { name: "The Mall", emoji: "🛍️", blurb: "Fountains, food court, retail purgatory.",
      action: { label: "Study the trends", stat: "style", gain: 1,
        text: "You window-shop with intent. Style up." },
      work: { label: "Work a retail shift", wage: 18,
        text: "Folding the same sweater forty times. Decent pay though." } },
    home: { name: "Home", emoji: "🏠", blurb: "Yours. Quiet. The phone lives here.",
      home: true },
  };

  const PHASES = ["Morning", "Afternoon", "Night"];

  const CHARACTERS = {
    aiko: {
      name: "Aiko", emoji: "📖",
      blurb: "Reference librarian. Reads three books a week and quietly judges yours.",
      likedStat: "intelligence",
      likedStyle: "thoughtful",
      dislikedStyle: "brash",
      favoriteGift: "book",
      schedule: { Morning: "library", Afternoon: "park", Night: "library" },
      hint: "Rewards a sharp mind and sincerity. Showboating bounces right off her.",
    },
    bianca: {
      name: "Bianca", emoji: "🎧",
      blurb: "Club DJ. Reads a room in two seconds, reads books approximately never.",
      likedStat: "charisma",
      likedStyle: "bold",
      dislikedStyle: "thoughtful",
      favoriteGift: "tickets",
      schedule: { Morning: "cafe", Afternoon: "mall", Night: "club" },
      hint: "Rewards confidence and flair. Overthinking it kills the vibe.",
    },
  };

  // Two-beat conversation prompts (kept generic so content stays thin).
  const CONVO = {
    beats: 2,
    prompts: [
      "You catch her with a moment to spare. You open with —",
      "There's room to take this somewhere. You —",
    ],
  };

  // Capstone pursue options. Gates/DCs enforced in the engine.
  const PURSUE = [
    { id: "gift", label: "Give her a gift" },
    { id: "number", label: "Ask for her number" },
    { id: "date", label: "Ask her on a date" },
    { id: "kiss", label: "Go in for a kiss" },
    { id: "wrap", label: "Wrap it up warmly" },
  ];

  // Affection -> relationship stage (endless: this is the progression feedback).
  const STAGES = [
    { min: 0, name: "Stranger" },
    { min: 10, name: "Acquaintance" },
    { min: 25, name: "Friend" },
    { min: 45, name: "Crush" },
    { min: 70, name: "Close" },
    { min: 95, name: "Smitten" },
  ];

  const TUNING = {
    affectionCap: 100,
    statCap: 25,
    baseDC: 10,
    dcPerAffection: 0.12,
    likedStyleBonus: 5,
    dislikedStylePenalty: 5,
    likedStatBonusAffection: 3,
    revealHintAfter: 3,

    startMoney: 20,
    dailyAllowance: 12,

    beatDelta: { crit: 4, success: 2, partial: 0, fail: -2 },
    beatMomentum: { crit: 2, success: 1, partial: 0, fail: -2 },

    numberMinAff: 15,
    dateMinAff: 30,
    kissMinAff: 55,
    numberDC: 13,
    dateDC: 15,
    kissDC: 17,
    numberReward: 3,
    numberFail: -3,
    dateReward: 10,
    dateFail: -4,
    kissReward: 14,
    kissFail: -8,
    favoriteGiftMult: 2.2,

    textDC: 11,
    textReward: 4,

    partyInviteChance: 0.28,
    partyVibe: 2,
    partyLoud: 3,
  };

  window.GAMEDATA = {
    STATS, STAT_LABEL, STAT_SHORT, BACKGROUNDS, APPROACHES,
    ITEMS, SHOPS, LOCATIONS, PHASES, CHARACTERS, CONVO, PURSUE,
    STAGES, TUNING,
  };
})();
