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

  const LOCATIONS = {
    gym: {
      name: "The Gym",
      emoji: "🏋️",
      blurb: "Clanking iron and mirror selfies.",
      action: {
        label: "Train hard",
        stat: "strength",
        gain: 1,
        text: "You grind through the reps. Your arms file a complaint. Strength up.",
      },
    },
    library: {
      name: "The Library",
      emoji: "📚",
      blurb: "Hushed, warm, smells of old paper.",
      action: {
        label: "Study",
        stat: "intelligence",
        gain: 1,
        text: "You actually read instead of doomscrolling. Intelligence up.",
      },
    },
    cafe: {
      name: "The Café",
      emoji: "☕",
      blurb: "Espresso machine screaming, everyone half-working.",
      action: {
        label: "Banter with strangers",
        stat: "charisma",
        gain: 1,
        text: "You charm the barista and three regulars. Charisma up.",
      },
    },
    club: {
      name: "Neon Club",
      emoji: "🪩",
      blurb: "Bass you feel in your sternum.",
      action: {
        label: "Work the room",
        stat: "style",
        gain: 1,
        text: "You move like you mean it. Style up.",
      },
    },
  };

  const PHASES = ["Morning", "Afternoon", "Night"];

  const CHARACTERS = {
    aiko: {
      name: "Aiko",
      emoji: "📖",
      blurb: "Reference librarian. Reads three books a week and quietly judges yours.",
      likedStat: "intelligence",
      likedStyle: "thoughtful",
      dislikedStyle: "brash",
      schedule: { Morning: "library", Afternoon: "cafe", Night: "library" },
      hint: "Rewards a sharp mind and sincerity. Showboating bounces right off her.",
    },
    bianca: {
      name: "Bianca",
      emoji: "🎧",
      blurb: "Club DJ. Reads a room in two seconds, reads books approximately never.",
      likedStat: "charisma",
      likedStyle: "bold",
      dislikedStyle: "thoughtful",
      schedule: { Morning: "cafe", Afternoon: "gym", Night: "club" },
      hint: "Rewards confidence and flair. Overthinking it kills the vibe.",
    },
  };

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
    statCap: 20,
    baseDC: 10,
    dcPerAffection: 0.12,
    likedStyleBonus: 5,
    dislikedStylePenalty: 5,
    likedStatBonusAffection: 3,
    revealHintAfter: 3,
  };

  window.GAMEDATA = {
    STATS,
    STAT_LABEL,
    STAT_SHORT,
    BACKGROUNDS,
    APPROACHES,
    LOCATIONS,
    PHASES,
    CHARACTERS,
    STAGES,
    TUNING,
  };
})();
