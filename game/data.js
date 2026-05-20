(function () {
  const STATS = ["strength", "style", "intelligence", "charisma"];
  const STAT_LABEL = { strength: "Strength", style: "Style", intelligence: "Intelligence", charisma: "Charisma" };
  const STAT_SHORT = { strength: "STR", style: "STY", intelligence: "INT", charisma: "CHA" };
  const BARS = ["attraction", "affection", "romance", "libido"];
  const BAR_LABEL = { attraction: "Attraction", affection: "Affection", romance: "Romance", libido: "Libido" };
  const BAR_SHORT = { attraction: "ATR", affection: "AFF", romance: "ROM", libido: "LIB" };
  const TRAITS = ["sincere", "playful", "classy", "adventurous", "generous", "independent"];

  // Character creation: pick one from each category. Sub-budgets sum to
  // 18, always — so the starting stat pool stays exactly where the rest
  // of the economy/DC tuning expects it, regardless of combo.
  const BG_CATEGORIES = [
    { id: "origin", name: "Where you're from", sub: 8, blurb: "Where you grew up shaped the rough shape of you.", opts: [
      { id: "gymrat", name: "Gym kid", emoji: "🏋️", blurb: "Spent your teens under a barbell. Built first, polished later.", stats: { strength: 5, style: 1, intelligence: 1, charisma: 1 } },
      { id: "bookish", name: "Bookworm", emoji: "📚", blurb: "Library kid. Read everything; spoke up rarely.", stats: { strength: 1, style: 1, intelligence: 5, charisma: 1 } },
      { id: "socialite", name: "Popular kid", emoji: "🥂", blurb: "Always knew everyone. Made it look effortless.", stats: { strength: 1, style: 1, intelligence: 1, charisma: 5 } },
      { id: "artkid", name: "Art kid", emoji: "🎨", blurb: "Sketched in margins, lived in thrift stores.", stats: { strength: 1, style: 5, intelligence: 1, charisma: 1 } },
    ] },
    { id: "training", name: "What you trained in", sub: 6, blurb: "The thing you put real hours into after school.", opts: [
      { id: "athlete", name: "Athlete", emoji: "🥇", blurb: "Sport, varsity, all of it.", stats: { strength: 3, style: 1, intelligence: 1, charisma: 1 } },
      { id: "scholar", name: "Scholar", emoji: "🎓", blurb: "Books and lectures and arguments.", stats: { strength: 1, style: 1, intelligence: 3, charisma: 1 } },
      { id: "entertainer", name: "Entertainer", emoji: "🎤", blurb: "Stages, crowds, working a room.", stats: { strength: 1, style: 1, intelligence: 1, charisma: 3 } },
      { id: "stylist", name: "Stylist", emoji: "🧵", blurb: "Clothes, frames, taste as a craft.", stats: { strength: 1, style: 3, intelligence: 1, charisma: 1 } },
    ] },
    { id: "lifestyle", name: "How you live now", sub: 4, blurb: "The way you actually move through a week these days.", opts: [
      { id: "hustler", name: "Hustler", emoji: "💼", blurb: "Always moving, always on it.", stats: { strength: 2, style: 1, intelligence: 1, charisma: 0 } },
      { id: "thinker", name: "Thinker", emoji: "🧠", blurb: "Slow with people, fast with ideas.", stats: { strength: 0, style: 1, intelligence: 2, charisma: 1 } },
      { id: "charmer", name: "Charmer", emoji: "😏", blurb: "Talk first; the rest follows.", stats: { strength: 0, style: 1, intelligence: 1, charisma: 2 } },
      { id: "trendsetter", name: "Trendsetter", emoji: "✨", blurb: "People copy you, late.", stats: { strength: 0, style: 2, intelligence: 1, charisma: 1 } },
    ] },
  ];

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Career: pick one. Weekly schedule blocks the (weekday, phase) slots
  // listed — you're auto at work, that wage is credited, and you can't
  // do anything else those phases. `freelance` is the zero-floor option.
  const JOBS = {
    freelance: { name: "Freelance", emoji: "🎲", wage: 0, blurb: "No boss, no floor. Pure free time — and you pay for it.",
      schedule: {} },
    barista: { name: "Café Barista", emoji: "☕", wage: 16, blurb: "Weekday mornings on the espresso machine.",
      schedule: { Mon: ["Morning"], Tue: ["Morning"], Wed: ["Morning"], Thu: ["Morning"], Fri: ["Morning"] } },
    retail: { name: "Retail Floor", emoji: "🛍️", wage: 18, blurb: "Weekday afternoons folding the same sweater.",
      schedule: { Mon: ["Afternoon"], Tue: ["Afternoon"], Wed: ["Afternoon"], Thu: ["Afternoon"], Fri: ["Afternoon"] } },
    server: { name: "Bistro Server", emoji: "🍝", wage: 22, blurb: "Late shifts, real tips — Wed through Sat nights.",
      schedule: { Wed: ["Night"], Thu: ["Night"], Fri: ["Night"], Sat: ["Night"] } },
    office: { name: "Office 9–5", emoji: "💼", wage: 26, blurb: "Weekdays, both morning and afternoon. The big floor, the small life.",
      schedule: { Mon: ["Morning", "Afternoon"], Tue: ["Morning", "Afternoon"], Wed: ["Morning", "Afternoon"], Thu: ["Morning", "Afternoon"], Fri: ["Morning", "Afternoon"] } },
  };

  // Housing: per-day rent, tiered. `rooms` lists which HOME date rooms
  // the place even has; `hotTub` flag gates the yard's hot-tub node. The
  // cheapest is the start; you can buy up (or get pushed down if you
  // can't pay). `impress` softly nudges her affection on a home date.
  const HOUSES = {
    studio: { name: "Studio Flat", emoji: "🛏️", rent: 3, tier: 0, blurb: "One room and a kitchenette. The bare minimum.",
      rooms: ["living", "kitchen", "bedroom"], hotTub: false, impress: {} },
    apartment: { name: "Apartment", emoji: "🏢", rent: 8, tier: 1, blurb: "Real rooms. Real windows. Still no yard.",
      rooms: ["living", "kitchen", "bedroom"], hotTub: false, impress: { classy: 1 } },
    house: { name: "House w/ Yard", emoji: "🏡", rent: 16, tier: 2, blurb: "Your own door, your own grass.",
      rooms: ["living", "kitchen", "yard", "bedroom"], hotTub: false, impress: { classy: 2, generous: 1 } },
    loft: { name: "Luxury Loft", emoji: "🌆", rent: 30, tier: 3, blurb: "View, yard, hot tub, the works.",
      rooms: ["living", "kitchen", "yard", "bedroom"], hotTub: true, impress: { classy: 3, generous: 2, independent: 1 } },
  };

  // Cars: per-day lease. `drive:true` unlocks the venues you have to drive
  // to (overlook, beach). `dislike` reads against her traits when she sees
  // the car; `impress` reads with them.
  const CARS = {
    none: { name: "No Car", emoji: "🚶", lease: 0, tier: 0, blurb: "Bus passes and your own two feet.", drive: false, dislike: {}, impress: {} },
    beater: { name: "Old Beater", emoji: "🚗", lease: 5, tier: 1, blurb: "Runs. Mostly. Don't look at the upholstery.", drive: true, dislike: { classy: 2 }, impress: {} },
    sedan: { name: "Clean Sedan", emoji: "🚙", lease: 12, tier: 2, blurb: "Respectable, comfortable, anonymous.", drive: true, dislike: {}, impress: {} },
    luxury: { name: "Luxury Coupe", emoji: "🏎️", lease: 24, tier: 3, blurb: "Turns heads in the parking lot. On purpose.", drive: true, dislike: {}, impress: { classy: 2 } },
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
    perfume: { name: "Perfume", emoji: "🌹", price: 19, type: "gift", value: 7, desc: "Personal. Niche. Lands very hard for the right person." },
    condom: { name: "Condoms", emoji: "🛡️", price: 6, type: "consumable", desc: "Just in case the night goes there. One gets used if it does." },
  };
  const SHOPS = { gym: ["preworkout", "protein"], cafe: ["espresso", "chocolates"], library: ["book"], park: ["flowers"], mall: ["outfit", "watch", "course", "tickets", "chocolates", "flowers", "wine", "perfume", "condom"] };

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
    overlook: { name: "Scenic Overlook", emoji: "🌃", blurb: "A ridge road, the whole city laid out below.", arrive: "Gravel pull-off, guardrail, the city spread out under you like a circuit board nobody turned off.", overlookSpot: true, dateCost: 10 },
    beach: { name: "The Beach", emoji: "🏖️", blurb: "Sand, surf, and a little dock renting boats by the hour.", arrive: "Salt wind, the slap of halyards on masts, the sand still warm under the going-down sun.", beachSpot: true, dateCost: 38 },
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
    krystalle: {
      name: "Krystalle", emoji: "💍", blurb: "Married. Romantic, spontaneous, witty. Reads people in a glance and forgets to read herself.",
      likedStat: "strength", likedStyle: "smooth", dislikedStyle: "brash", favoriteGift: "perfume",
      schedule: { Morning: "cafe", Afternoon: "park", Night: "restaurant" },
      hint: "Married, and she means it — mostly. Realness, banter, confidence without the strut. Slowest burn in the game; the moment exists, but you have to earn it.",
      attractProfile: { strength: 0.4, style: 0.3, charisma: 0.2, intelligence: 0.1 },
      barWeights: { affection: 0.45, romance: 0.3, attraction: 0.2, libido: 0.05 },
      libidoRange: [4, 22], decay: { affection: 1, romance: 5 },
      traitAffinity: { sincere: 3, generous: 2, classy: 2, playful: 2, adventurous: 1, independent: 0 },
      gates: { homeRomance: 78, intimacyComposite: 82, partyPrivateInterest: 78 },
      marriage: { active: true, anxietyAt: 50 },
      opens: {
        cold: ["Krystalle twists her ring on her finger without thinking. \"Hi. Hi — sorry, I'm somewhere else today.\"", "Krystalle, half a step back: \"You're sweet to come over. I'm a little spoken-for, you know that, right?\""],
        neutral: ["Krystalle, brightening: \"Oh — hi. Okay. Distract me, I dare you.\"", "Krystalle: \"You always show up when my brain's loud. That's a talent.\""],
        warm: ["Krystalle leans her chin in her hand. \"Tell me a true thing. I'll trade you one back.\"", "Krystalle: \"You know I look forward to this part of my day. That's a problem I'm not solving right now.\""],
        hot: ["Krystalle, quieter: \"I shouldn't be this glad to see you. I know that. Sit down anyway.\"", "Krystalle: \"I keep telling myself I'm just being friendly. I'm a bad liar about a lot of things, apparently.\""],
      },
      reveals: [
        "Half Filipino, half white — her lola taught her three swears and one prayer and she uses all of them.",
        "Married three years. Talks about him fondly and rarely, which is its own answer.",
        "Reads people in a glance and trusts it; reads herself in a glance and immediately questions it.",
        "Owns up to anxiety attacks — the spontaneous streak is partly because sitting still feels worse.",
        "Will be carried up a single stair without complaint. Will pretend she didn't ask to be.",
        "Tells you, in passing, that she can read a man who's full of himself inside ten seconds. You believe her.",
      ],
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
    rounds: 6, guestsMin: 2, guestsMax: 3, gameRounds: 3, tdRounds: 6,
    // flow stage by (rounds elapsed + drinks + heat from spicy beats); pick highest whose `at` <= level
    flows: [
      { at: 0, name: "warming up", desc: "Still arriving, but this one's loud early — it's already got a charge to it." },
      { at: 2, name: "in full swing", desc: "Music's cranked, everyone's a few in, and the night tipped from polite to electric fast." },
      { at: 4, name: "loose and late", desc: "Dim, late, and the room stopped pretending some time ago. Anything goes from here." },
    ],
    // Rooms in the house. Filters who's around + what you can do.
    rooms: [
      { key: "main", name: "Main room", desc: "Speakers, a packed floor, the gravitational center of the noise.", here: "all" },
      { key: "kitchen", name: "Kitchen", desc: "Counters of bottles, a sticky island, the unofficial drinks HQ.", here: "some" },
      { key: "yard", name: "Back yard", desc: "Cooler, darker, a fire going and fewer people pretending to dance.", here: "some" },
      { key: "upstairs", name: "Upstairs", desc: "Quieter. A hallway, a couple of doors, one of them ajar.", here: "few", gateFlow: 1 },
    ],
    // Male NPCs in the mix — she can be caught talking to one.
    npcs: ["a guy with great forearms and a worse haircut", "some confident bartender type", "a tall guy doing card tricks nobody asked for", "the host's loud cousin", "a soft-spoken guy with a guitar he won't put down"],
    npcBeats: [
      "{n} is cornered by {g}, laughing politely at something that did not earn it, eyes flicking around for an exit.",
      "{n} and {g} are deep in it by the window — he's leaning in a little far, and she's not leaning back, exactly.",
      "{g} just made {n} laugh for real, a hand landing on her arm like he's testing whether it stays.",
      "{n} is letting {g} buy her the next one, head tipped, giving him precisely enough rope and no more.",
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
    spicyDares: ["Kiss the most attractive person in the circle.", "Sit in someone's lap until your next turn.", "Whisper what you'd do later into someone's ear.", "Lose an item of clothing — circle's choice."],
    // Strip dares — for you, or pointed at a guest. Lands as a real beat.
    stripDares: ["Lose one item of clothing.", "Whoever you pick takes something off — or you do.", "Down to one less layer before your next turn."],
    strip: {
      you: {
        ok: "You don't make it a thing — you just lose the layer like it's nothing and let the circle do the screaming for you. {n} is not screaming. {n} is just looking.",
        shy: "You ham it up, peel it off like a bad magician, and turn the whole thing into a joke before it can turn into anything else. The room loves it; {n} laughs and files it away.",
      },
      her: {
        win: "{n} holds your eyes the whole time she does it — slow, unbothered, like the dare was her idea — and the room's noise goes very far away.",
        lose: "{n} laughs it off and trades a bracelet instead. \"Nice try, circle.\" Smooth. The line held.",
      },
    },
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
    // Body shots — kitchen, spicy, a real read.
    bodyShot: {
      ask: "Someone's lining up body shots on the island. {n} raises an eyebrow at you: salt, lime, the works. \"Well? You volunteering, or am I?\"",
      who: { you: "Lime in your teeth, salt on your collarbone, the kitchen suddenly very interested.", her: "She tips her head back, lime in her teeth, salt at the line of her throat, and waits with a look that says she already knows you'll be careful and slow about it." },
      win: "Neither of you rushes it. The kitchen whoops; you barely hear it. She comes up grinning, lime gone, mouth a lot closer to yours than it was.",
      lose: "You fumble the lime and the salt goes everywhere and it's funny instead of anything else. {n} cracks up, wipes her chin. \"Smooth. We are not a body-shots couple.\"",
    },
    // Hooking up in a party room (upstairs/yard). Leads to the protection beat.
    hookup: {
      ask: "{n} pulls the door most of the way shut behind you and the party drops to a thudding bassline through the wall. Her back finds it; she pulls you in by the shirt and there's no more talking for a while.",
      esc: [
        { label: "Slow it down, make it count", mod: 1, line: "You make yourself slow down, and she makes a sound against your mouth like that was exactly the right call." },
        { label: "Don't stop, don't think", mod: 0, line: "Neither of you slows down for anything; the door, the noise, the rest of it all stops mattering at once." },
        { label: "Get the door actually locked first", mod: 2, line: "You get the lock turned before anything else, and she exhales a laugh into your neck — \"okay, points for that\" — and stops being careful." },
      ],
      win: ["The party keeps going without either of you for a while.", "Some of tonight is staying in this room."],
    },
    // Dares the player can hand out to a guest. Tiered like everything else.
    makeDares: {
      plain: ["do their worst dance move, right now", "do a dramatic reading of the last text they sent", "let the circle restyle their hair", "talk in an accent until their next turn"],
      spicy: ["sit in your lap until their next turn", "give someone in the circle a thirty-second shoulder rub", "whisper the last thing they fantasized about to the person on their left", "kiss the most attractive person in the circle", "lose one item of clothing — your call"],
      scorch: ["two minutes in the hall with whoever you pick", "demonstrate their single best move on a willing volunteer", "tell the hottest person here exactly what they noticed about them, to their face", "lose a layer, then run the next round from someone's lap"],
    },
    // Both of you naked + a get-handsy dance that lands → the floor stops
    // being a metaphor. Routes into the same protection/finish beat.
    floorSex: {
      ask: "There is, very literally, nothing left in the way — no clothes, no pretense, the dance having quietly stopped being a dance a minute ago. {n}'s mouth is at your ear over the bass: \"…nobody's even looking anymore. Your call.\" She's not wrong, and she's not waiting much longer for the answer.",
      win: ["The crowd has folded back into its own noise; the dark and the bass do the rest. Right here, on the floor, with the party going on stupid and oblivious around you both, is exactly where it happens, and neither of you decides to be discreet about it.", "Some of this particular party is never getting described to anyone."],
      headOut: "Find your clothes — eventually",
    },
    privateGateFlow: 1, privateGateInterest: 40,
  };

  // Shared, character-driven, non-graphic. Choices steer the outcome;
  // the camera stays above the collarbone. Used by the home date and
  // the party slip-away.
  const INTIMACY = {
    beats: [
      { q: "How does it start?", opts: [
        { label: "Slow. Unhurried. Make her wait for it.", fx: { rom: 8, aff: 6, inti: 1 }, line: "You take it slow on purpose — slow enough that everything has time to land. The drag of your mouth down the side of her throat. The way her breath catches and then deliberately steadies, like she's trying to keep some composure and losing. Her fingers spread flat on your back and press, asking for more without saying it, and you don't give it to her yet. She says your name once, low, half a complaint. You feel her give up the last of the patience somewhere against your collarbone." },
        { label: "Urgent — neither of you can wait.", fx: { lib: 10, atr: 5, rom: 4 }, line: "There's nothing careful about it. It's hands and mouths and too many clothes in the way and one of you laughing breathlessly at the logistics before the laugh turns into something with no humor left in it. She pulls you down by the front of your shirt like she's been waiting all night to stop being polite about this — and she has — and after that neither of you is being polite about anything." },
        { label: "Let her set the pace entirely.", fx: { rom: 7, aff: 7, lib: 3 }, line: "You go still and let her have it, and she takes it without a flicker of hesitation — pushes you back, settles her weight over you, sets the rhythm slow and certain and entirely her own. She watches your face the whole time she does it, reading every reaction, adjusting, unhurried, in complete command of the room and clearly enjoying that you noticed." } ] },
      { q: "And then —", opts: [
        { label: "Take the lead. Pin it down.", fx: { atr: 6, lib: 6, rom: 3 }, line: "You take over and she lets you, her wrists going easy under your hands, her hips arching up to meet you on the first beat like she'd already decided how this part went. She keeps her eyes open. She wants to watch you do this. Every sound she makes is involuntary and she stops trying to hide that they are." },
        { label: "Let her take over completely.", fx: { rom: 6, lib: 7, aff: 3 }, line: "You give it up to her and she does not hesitate to take it — both hands flat on your chest, her weight pinning you exactly where she wants you, setting a pace that has you saying things you don't fully plan to. She likes that. You can feel her like it, the smile against your jaw, the way she leans into every reaction she pulls out of you." },
        { label: "Trade it back and forth.", fx: { rom: 7, aff: 5, lib: 4 }, line: "It keeps changing hands — you take it, she takes it back, a roll and a pin and a low laugh that gets cut off. Neither of you is actually trying to win the quiet contest of it; you're just both refusing to be the one who's only along for the ride, and the friction of that is most of the point." } ] },
      { q: "In the middle of all of it —", opts: [
        { label: "Keep it close. Foreheads together.", fx: { rom: 9, aff: 8 }, line: "You slow it right down to almost nothing, your forehead dropped to hers, every breath shared in the inch between you. It gets unbearably intimate — eye contact she doesn't break, your name said like it means something specific, her hand coming up to hold the side of your face like she needs you to not look away. More sincere than either of you meant to be tonight, and neither of you backs off it." },
        { label: "Let it get loud.", fx: { lib: 9, atr: 7, rom: 3 }, line: "It stops being careful somewhere in the middle and stays there — her nails, your name bitten off against her shoulder, the headboard and neither of you caring, every performance she walked in wearing gone completely. By the end there is nothing left of the version of her that has a public face. Just this one. You're keeping that." },
        { label: "Make her laugh, then ruin the joke.", fx: { aff: 8, rom: 6, lib: 3 }, line: "You say something stupid at exactly the wrong moment and she laughs — a real one, surprised out of her — and swats your shoulder, and then the laugh changes register without fully stopping, goes ragged, becomes a sound that is not about anything funny at all. She keeps her face hidden in your neck after that, like the laugh embarrassed her less than what replaced it." } ] },
      { q: "When it crests —", opts: [
        { label: "Drag it out. Don't let her get there yet.", fx: { rom: 8, lib: 9, atr: 4 }, line: "You feel her get close and you back off the edge of it, on purpose, and she makes a sound that is mostly outrage and entirely the opposite of stop. You do it again. The third time she gets a fist in your hair and a threat half-formed against your mouth, and you finally stop being cruel about it, and what happens then is loud and undignified and worth every second of the wait." },
        { label: "Take her over with you.", fx: { lib: 10, rom: 7, aff: 3 }, line: "You stop holding any of it back and so does she, and it goes over the edge together — her grip locking, her face pressed hard into the side of your neck, both of you saying nothing coherent, the whole world narrowed to a few seconds that neither of you will be describing to anyone, ever, and will both be thinking about for a while." },
        { label: "Her first. Watch.", fx: { rom: 9, aff: 7, lib: 6 }, line: "You take your time and make it about her, and when it finally takes her you're watching — that's the point, you wanted to see it — the exact moment her composure goes, the arch and the held breath and the way she says your name like an accusation. She catches you watching, after, still wrecked, and laughs at you for it, breathless, and pulls you down anyway." } ] },
    ],
    close: { q: "After —", opts: [
      { label: "Stay tangled up, talk till it's late.", fx: { rom: 10, aff: 10 }, line: "Neither of you sleeps for a long time. You stay exactly where you ended up, sweat cooling, her leg hooked over yours, and just talk — quiet, unguarded, the kind of conversation that only happens at this specific hour with this specific person and a ceiling to look at. She traces shapes on your chest and tells you a true thing she wouldn't have told you with the lights on.", tone: "good" },
      { label: "Round two — neither of you is remotely done.", fx: { lib: 8, rom: 5 }, line: "She's the one who starts it again, actually — a slow line of her mouth along your jaw and a low \"…we are not finished\" that is not a question. You were not going to argue.", again: true, tone: "good" },
      { label: "Shower together — that becomes its own thing.", fx: { rom: 8, lib: 7, aff: 4 }, line: "The shower is supposedly to clean up. The shower does not, for a noticeable while, accomplish that. Eventually it does, and you end up clean and worse off than when you started, in the best way.", tone: "good" },
      { label: "Both of you pass out instantly.", fx: { aff: 6, rom: 4 }, line: "You get about ninety seconds of intending to debrief before you're both gone — her face mashed into your shoulder, one hand still flat over your heartbeat like she fell asleep mid-thought checking it was still doing that.", tone: "good" },
      { label: "Clean up, and she heads out — easy about it.", fx: { atr: 4, rom: -2 }, line: "She finds her clothes unhurried, steals your water glass, kisses you once at the door like a full stop, and is gone — entirely unbothered, leaving you the specific problem of how good unbothered looks on her.", tone: "neutral" } ] },
    // Only shown when it was unprotected. "Finish inside" gates a real
    // pregnancy-risk consequence.
    finish: {
      q: "Right at the edge —",
      pull: { label: "Pull out", fx: { rom: 2, aff: 3 }, line: "You pull back at the last second, jaw tight, and finish against the curve of her hip with her hand fisted in the sheet and her forehead pressed to your temple, both of you breathing like you ran somewhere. \"…good call,\" she manages, eventually, a little wrecked, a little laughing. Neither of you moves for a while." },
      inside: { label: "Stay. Finish inside.", fx: { rom: 6, lib: 4 }, line: "Neither of you stops, or wants to, and you feel her decide that at the same moment you do — her legs locking you in, the unspoken thing very loud in the quiet right after. She keeps you there a long minute, heartbeat slamming against yours, not saying the obvious. Neither do you. Both of you are thinking it." },
    },
    // Protection beat for party hookups (home has its own HOME.sex).
    party: {
      ask: "It's about to be a great deal more than a closed door. {n} has you backed against it, her mouth at your jaw, her hands already deciding things — and then they still, for one honest second, the only pause either of you is going to take. The question's in it. She's waiting to see how you answer.",
      condom: { lines: ["You've got one on you and she watches you produce it and the held breath goes out of her all at once — that specific ease that only comes from not having had to ask. After that there is nothing careful left in any of it. The bassline comes through the wall and the door takes most of your weight and she's got a fistful of your shirt and her mouth at your ear telling you exactly what she wants, and the party stops existing for as long as you let it. It goes on a while. Neither of you is in a hurry to be anywhere this isn't."], fx: { rom: 14, lib: 14, inti: 4, kiss: true } },
      raw: { lines: ["Neither of you reaches for anything, and the look you trade about that is its own short conversation, asked and answered in about a second. After that it's skin and the wall and her breath going uneven against your throat and the muffled thud of a party that has nothing to do with this room. She doesn't keep quiet. She doesn't try to. By the end she's boneless against you in the dark, mouth still at your jaw, in no state and no hurry to go back out there."], fx: { rom: 16, lib: 16, inti: 5, kiss: true } },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease it back down to just this — her forehead dropped to your jaw, both of you breathing hard against a door, the party stupid and loud and very far away on the other side of it. \"…probably smart,\" she admits, not moving, clearly not entirely meaning it."] },
      close: { q: "After — there's still a party on the other side of that door.", opts: [
        { label: "Go again before anyone notices you're both gone.", fx: { lib: 8, rom: 4 }, line: "Neither of you reaches for the door handle. She gets a grip on your collar instead and a low \"…they won't miss us yet,\" and they do not.", again: true, tone: "good" },
        { label: "Fix your clothes, slip back in separately.", fx: { rom: 6, atr: 4 }, line: "You put yourselves back together by feel in the dark, badly, and rejoin the party from two different directions like that fools a single person. It does not. She catches your eye across the room and very deliberately does not smile.", tone: "good" },
        { label: "Forget the party — leave together, now.", fx: { rom: 9, aff: 6 }, line: "You don't go back in at all. You find a side door and the cold and a cab, the party a sound that gets smaller behind you, her hand in yours and the night clearly not over.", tone: "good" },
        { label: "Linger here a minute, just breathing.", fx: { rom: 7, aff: 7 }, line: "You stay in the dark with the bass coming through the wall and don't say anything and don't need to, foreheads together, the party something happening to other people.", tone: "good" } ] },
    },
    // Days later, if it caught.
    pregnancy: {
      wait: "A few quiet days. Then {n} asks to meet somewhere with nobody else around — and you read it on her face before she gets a single word out.",
      react: {
        warm: "She's scared and working very hard not to let you see how much.",
        cool: "She's calm in the specific way that means the exact opposite of calm.",
      },
      say: "\"I'm late. I took a test. Two of them. It's positive.\"",
      opts: [
        { label: "\"Then we figure it out. Together. I'm not going anywhere.\"", kind: "stay", fx: { rom: 18, aff: 22 }, status: "together", line: "Something in her face comes apart. She doesn't say thank you — she just holds onto you like the floor moved, and doesn't let go for a while." },
        { label: "\"I… need a minute. This is a lot.\"", kind: "wobble", fx: { rom: -9, aff: -7 }, status: "strained", line: "You watch her clock exactly how long the minute took. \"Sure,\" she says, far too evenly. \"Take your minute.\" Something cooled that won't fully warm back." },
        { label: "\"Whatever you decide, it's your call — and I've got you either way.\"", kind: "support", fx: { rom: 10, aff: 16 }, status: "supported", line: "She lets out a breath she'd clearly been holding for days. \"Okay,\" she says. \"Okay. That — actually helps.\"" },
      ],
    },
    // Phone-aware beats — used when the scene comes out of the photoshoot,
    // so every choice is about the camera, not generic.
    shoot: {
      beats: [
        { q: "The phone's still in someone's hand. What happens to it?", opts: [
          { label: "Keep shooting — let her perform it for the lens", fx: { lib: 12, atr: 7, rom: 3 }, line: "You don't put it down. She figures that out fast and leans all the way into being looked at — every frame deliberate, every glance straight down the lens like it's you holding it, because it is. She is, it turns out, extremely good at being watched, and she has clearly thought about this." },
          { label: "Hand it to her — let her run the camera", fx: { rom: 7, lib: 9, aff: 4 }, line: "You give her the phone and she takes the whole thing over with it, directing the angle and the pace and you, narrating what she wants in a low flat voice that is somehow worse than any of the photos. You do as you're told. You'd do it again." },
          { label: "Set it down still recording, forget it exists", fx: { rom: 8, lib: 8, aff: 5 }, line: "You prop it where it can see and then genuinely stop thinking about it, and so does she, and whatever it caught it caught honest — neither of you performing a single frame of it by the time it stopped mattering there was a phone at all." },
          { label: "Screen-down on the dash. None of this is recorded.", fx: { rom: 10, aff: 9 }, line: "You kill it and set it face-down and the relief that goes through her is its own answer — this part she wanted only for the two of you, no proof, no audience, and she tells you that with everything except words." } ] },
        { q: "And the way it actually goes —", opts: [
          { label: "Slow, like you're still composing every shot", fx: { rom: 9, lib: 8, inti: 1 }, line: "You keep the unhurried, deliberate attention of the shoot and just take the camera out of it — every pause held, every reaction watched and answered, her breath going uneven under exactly that and her clearly not used to being paid attention to this precisely and clearly not hating it." },
          { label: "All the held-back heat at once", fx: { lib: 12, atr: 6, rom: 3 }, line: "The patience the whole shoot was built on just goes, all of it, at the same moment for both of you — every careful frame's worth of restraint spent at once, and what's left after is loud and graceless and entirely meant." },
          { label: "Trading the lead like trading the camera", fx: { rom: 8, aff: 5, lib: 4 }, line: "It keeps changing hands the way the phone did all night — you take it, she takes it back, a look that's a dare answered with a better one. Neither of you concedes the contest and that is most of the appeal of it." } ] },
      ],
      close: { q: "After — and the phone's still lying right there, screen up, warm.", opts: [
        { label: "Film the aftermath — both of you wrecked, the mess of it", fx: { lib: 10, atr: 6, rom: 2 }, line: "You pick it up and get the after instead of the during — her laughing, ruined, hair a catastrophe, throwing a hand up at the lens and not actually stopping you. \"This is the one nobody EVER sees,\" she says, posing anyway. It's the best photo either of you has ever been in.", tone: "good" },
        { label: "Delete all of it, together, right now.", fx: { rom: 10, aff: 14 }, line: "You hand it to her and she scrolls back through the whole night and then, watching your face, deletes it — all of it — and the trust that takes the place of the photos is worth more than the photos and you both feel the trade land.", tone: "good" },
        { label: "Keep them. Your eyes only. She decides which.", fx: { lib: 9, atr: 6, rom: 4 }, line: "She curates with a ruthless thumb, kills about half, and leaves you with the survivors and a flat \"those do not leave that phone\" that is a contract, not a request. You intend to keep it.", tone: "good" },
        { label: "Airdrop her the good ones before she changes her mind.", fx: { rom: 8, aff: 6 }, line: "You send them over while she pretends to object and very much does not actually object, and now you've each got a copy of the night, which is its own quiet kind of commitment neither of you names.", tone: "good" },
        { label: "Go again — and just leave it recording.", fx: { lib: 9, rom: 5 }, line: "She sets it back up herself this time, props it, raises an eyebrow, and the documentary is not over because she has decided it isn't.", again: true, tone: "good" },
        { label: "Phone away, clean up, drive her home.", fx: { rom: 6, aff: 7 }, line: "You put it face-down and out of reach and just deal with being two people in a car after that, which is its own thing, quieter and somehow bigger. You drive her home with her hand on your leg and neither of you saying much.", tone: "good" } ] },
    },
    // Contextual dance-floor scene — bass, crowd, no clothes, not a door.
    floor: {
      ask: "There is genuinely nothing left in the way and the floor stopped being a metaphor a minute ago. {n} has both arms looped behind your neck and her mouth at your ear over the bass: \"…still nobody looking. Last chance to be sensible.\" She does not sound like she's hoping you'll be sensible.",
      condom: { lines: ["You've got one and she watches you have it and the last half-second of hesitation goes out of her — the ease of not having had to ask, even here. After that the crowd just becomes weather, the bass does half the work, and the two of you move with it and then very much against it, in the dark of a packed room that has politely decided not to notice. It goes on far longer than is wise and neither of you is the one who stops it.", "Whatever the floor saw, the floor is keeping."], fx: { rom: 14, lib: 16, inti: 4, kiss: true } },
      raw: { lines: ["Neither of you reaches for anything and the look you trade about that lasts exactly one bar of the song. After that there's just heat and the press of a crowd that's stopped existing, her not staying remotely quiet because the music's louder than she is, the floor doing the rest. By the time the track changes neither of you has any idea how many did.", "Whatever the floor saw, the floor is keeping."], fx: { rom: 15, lib: 18, inti: 5, kiss: true } },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You bring it back down to just moving together, foreheads close, both of you wrecked and laughing about almost not being. \"…probably the one sensible thing all night,\" she admits, not stepping back, not meaning it much."] },
      beats: [
        { q: "On a packed floor, in the dark — how?", opts: [
          { label: "Don't stop moving. Let the crowd be cover.", fx: { lib: 12, atr: 6, rom: 3 }, line: "You never actually stop dancing, which is the entire trick of it — to anyone not paying very close attention it stays a dance, and nobody at this hour is paying very close attention, and she uses exactly that, grinning against your jaw the whole time about how much you're both getting away with." },
          { label: "Back her into the dark at the edge", fx: { rom: 7, lib: 10, aff: 3 }, line: "You move her off the press of bodies to the dim edge by the speakers where the bass is a physical thing and the light doesn't reach, and she goes, walking backward, pulling you with her by the waistband, fully committed to the bad idea." },
          { label: "Let her run it, like the dance", fx: { rom: 8, lib: 9, aff: 4 }, line: "You give it to her the way you'd give her the lead in the dance and she takes it exactly that way — sets the rhythm, makes you keep it, the song doing the counting. She's better at this than you and she wants you to know it." } ] },
        { q: "And the part where you stop pretending it's dancing —", opts: [
          { label: "Slow it against the beat, draw it out", fx: { rom: 9, lib: 8 }, line: "You drop it to half the tempo of the room, deliberately off the beat, and she makes a sound at that you feel more than hear, both of you moving slower than everything around you while it gets very far from a dance." },
          { label: "Match the bass, no mercy", fx: { lib: 13, atr: 6, rom: 2 }, line: "You take it to the tempo of the low end and keep it there and she keeps up and then sets it faster, the noise of the room swallowing the noise of the two of you completely, which she clearly counted on." } ] },
      ],
      close: { q: "After — still on a dance floor, still missing most of your clothes.", opts: [
        { label: "Find your clothes, rejoin like absolutely nothing happened.", fx: { rom: 6, atr: 5 }, line: "You reassemble in the dark, badly, and walk back into the party from two angles wearing the faces of people who were definitely just getting drinks. Nobody is fooled. She hands you somebody's drink and does not make eye contact and is shaking with held laughter.", tone: "good" },
        { label: "Round two — somewhere with an actual door this time.", fx: { lib: 9, rom: 5 }, line: "\"Okay,\" she pants, \"that was the dare. This next part is just because I want to,\" and tows you off the floor by the wrist toward the quieter dark of upstairs.", again: true, tone: "good" },
        { label: "Stay out here, keep dancing, completely wrecked.", fx: { rom: 8, aff: 6 }, line: "Neither of you leaves the floor. You just keep moving, loose and ruined and grinning, hidden in plain sight in the middle of a crowd that will never know, which is somehow the most fun the whole night was going to allow.", tone: "good" },
        { label: "Slip out together — leave the party behind entirely.", fx: { rom: 9, aff: 7 }, line: "You don't bother rejoining anything. You collect your shoes and her and the cold air outside, the party a bass line getting smaller, the night clearly going somewhere else now and both of you fine with that.", tone: "good" } ] },
    },
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
              { label: "Slower — between her legs", gate: { inti: 7, rom: 55 }, roll: { dc: 16, win: { fx: { rom: 12, lib: 16, inti: 5, kiss: true }, lines: ["She doesn't pretend it's a massage anymore — she turns over for you, watching your face, her breath going ragged and unhidden, one hand fisting the cushion and the other not stopping yours. It stops being something you're doing to her shoulders some time ago and she is extremely clear about wanting you to keep going."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She catches your hand, firm and kind. \"Hey — not yet. I want to, just not from a back rub.\" Fair. You ease back up."] } } },
              { label: "Back up", back: true },
            ] },
            { label: "Pull her in and kiss her", roll: { dc: 13, win: { fx: { rom: 11, lib: 8, inti: 3 }, kiss: true, lines: ["You close the gap. {n} meets you halfway and then some — a hand fisting your shirt, the couch forgotten. It goes from soft to unhurried-but-certain, and neither of you is in a rush to come up for air."] }, lose: { fx: { rom: -7, aff: -4 }, lines: ["You lean in and she puts two fingers gently on your chest. \"Hey. Slow down — I'm enjoying this, I just want to get there, not skip there.\" Fair, and it stings a little."] } } },
            { label: "Start undressing her", ustep: "begin", gate: { inti: 5, rom: 45 }, enter: "It goes quiet and close, her eyes dark and certain on yours, her chin tipping up. She's not stopping you — she's waiting on you, which is worse, in the best way. Whatever you do here you can stop at any layer; nothing here has to be all of it.", sub: [
              { label: "Slip her shirt up and off", ustep: "shirt", roll: { dc: 14, win: { fx: { rom: 8, lib: 9, inti: 3, un: "shirt" }, lines: ["She lifts her arms for you without being asked and lets you draw it up slow, the hem dragging, her watching your face the whole way like she's grading it. It comes off and gets dropped somewhere neither of you will think about again tonight. She doesn't reach to cover anything. She just looks at you looking, and lets you."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She covers your hands with hers, gentle. \"Not — not yet, okay?\" You stop the instant she says it, and you watch her notice that you stopped that fast, and soften."] } } },
              { label: "Unclasp her bra", ustep: "bra", roll: { dc: 15, win: { fx: { rom: 10, lib: 12, inti: 4, un: "bra" }, lines: ["One hand, the clasp, the slow breath she lets out as it gives and you ease it off her shoulders and away. She watches your face do whatever it does about that, daring you to make it weird, and you don't — you just kiss the bare curve of her shoulder where the strap was, and feel the dare go out of her."] }, lose: { fx: { rom: -7, aff: -5 }, lines: ["Your hands fumble it and she covers them, stilling it, kind about it. \"Slow down. We've got all night.\" Soft. A no, for now, and a promise about later."] } } },
              { label: "Kiss your way down her chest", ustep: "chest", roll: { dc: 15, win: { fx: { rom: 13, lib: 15, inti: 5 }, kiss: true, lines: ["You put your mouth to her sternum and work down slow, unhurried, paying attention to what changes her breathing and then doing more of that. Her head goes back, one hand fisting in your hair, the other gripping the couch cushion like the floor tilted. She says your name like it got away from her."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She tenses under your mouth and you feel it land and you stop at once, lifting off her. \"Sorry — I just. Slower. Stay up here a minute.\" You do."] } } },
              { label: "Undo her jeans, ease them off", ustep: "pants", roll: { dc: 16, win: { fx: { rom: 12, lib: 14, inti: 5, un: "pants" }, lines: ["Button, then the slow drag of the zip with her watching you do it, then the longer slower drag of getting them down — and she lifts her hips for you without being asked, that one small cooperative motion saying more than the entire evening of talking did. They go off the end of the couch. She does not reach for the blanket."] }, lose: { fx: { rom: -7, aff: -5 }, lines: ["She closes her hand over yours at the button, firm. \"That's the line for tonight.\" Kindly. Completely. You take your hand back and she keeps it."] } } },
              { label: "Slide her underwear off — just that, no further", ustep: "panties", gate: { inti: 6, rom: 48 }, roll: { dc: 16, win: { fx: { rom: 12, lib: 15, inti: 5, un: "panties", kiss: true }, lines: ["You hook the last of it and draw it down slow, and she lets you, hips lifting again, eyes not leaving your face — and then she's just there, nothing left between you and her at all, and she doesn't reach for anything to fix that. She pulls you down to her mouth and lets the rest of the decision sit unmade for a minute, both of you very aware it's there to be made."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She catches your wrist. \"Slow. Stay here a second.\" Not a no. Just a hand on the brake, kept there until she's ready to take it off."] } } },
              { label: "Take it all the way", ustep: "rest", gate: { inti: 9, rom: 60 }, roll: { dc: 16, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She catches you against her, breathing hard. \"Wait — come here first.\" She pulls you up to her mouth instead. Not no. Just not yet, not rushed."] } } },
              { label: "\"…whatever you're comfortable with.\" — let her decide", ustep: "hercall", hercall: {
                spicy: { fx: { rom: 12, lib: 14, inti: 4, kiss: true }, lines: ["You hand the whole decision to her and she takes it without a flicker — picks the next thing herself, gets rid of it herself, slower than you'd have dared ask for, watching your face the entire time she does it. Letting her choose, it turns out, was the boldest thing you could have done."] },
                safe: { fx: { rom: 6, aff: 8, inti: 1 }, lines: ["You give her the call and she takes the night down half a gear — pulls you in to just kiss her instead, your hands where she puts them, the clothes staying exactly where they are a while longer. That being her call too is the entire point, and she clocks that you meant it."] } } },
              { label: "Leave it here — go somewhere else", rooms: true },
              { label: "Stop undressing her, stay on the couch", back: true },
            ] },
            { label: "She's already got nothing on — take it all the way", ustep: "bareall", gate: { inti: 8, rom: 55 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She presses a hand flat to your chest, smiling, not dressed and not bothered. \"Mm — not on the couch. Come here properly.\" Not a no. A relocation, or a wait."] } } },
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
          { label: "Lie back and look at the stars", enter: "You both lie back on the cool grass. {n} finds your hand without looking; the talk goes low and honest the way it only does when nobody has to make eye contact.", sub: [
            { label: "Trade the embarrassing true things", fx: { rom: 6, aff: 7, inti: 1 }, lines: ["You tell her a real one. She's quiet, then tells you a worse one, and the trade goes back and forth until you're both laughing at the dark."] },
            { label: "Invent constellations, badly", fx: { rom: 5, aff: 5, inti: 1 }, lines: ["You point at four random stars and declare them 'the Grocery Cart.' {n} counters with 'the Regret.' It escalates. It is very stupid and you don't want it to end."] },
            { label: "Actually name them for her (INT)", roll: { stat: "intelligence", dc: 12, win: { fx: { rom: 9, aff: 9, inti: 2 }, lines: ["You actually know these — Cassiopeia, the bend of the handle, the smudge that's a whole other galaxy — and you walk her through it low and unshowy, and she goes very quiet and very still listening to you, and when you look over she's not looking at the sky."] }, lose: { fx: { rom: 3, aff: 2 }, lines: ["You confidently identify Orion. It is, she points out gently, an airplane. You both lie there laughing at the airplane for a while, which is arguably better."] } } },
            { label: "Pull her over onto your chest", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 3 }, lines: ["You tug her over and she comes easily, settling against your chest like she'd been waiting to be asked. Her hand flattens over your heartbeat and stays."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["She resists the pull, light about it. \"I can see the stars fine from here, thanks.\" Not a no — a not-yet."] } }, sub: [
              { label: "Kiss her, upside-down and slow", roll: { dc: 13, win: { fx: { rom: 12, lib: 9, inti: 4 }, kiss: true, lines: ["You tilt down and she meets you halfway, the angle ridiculous, the kiss not. Neither of you mentions the grass anymore."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["You misjudge it; she turns it into a laugh and a forehead bump. \"Smooth, astronaut.\" Recoverable."] } } },
              { label: "Just lie there with her, no next move", fx: { rom: 8, aff: 8, inti: 2 }, lines: ["You don't do anything. You just let her lie there on you under all of it, and somehow that's the thing that lands hardest all night."] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Light a fire and sit close", enter: "You get a small fire going. {n} migrates into your side for the warmth — allegedly — and stays there long after the chill stops being an excuse.", sub: [
            { label: "Share a blanket and a long story", fx: { rom: 7, aff: 6, inti: 2 }, lines: ["One blanket, two people, an unhurried story that keeps almost ending and not. The fire does most of the talking by the end."] },
            { label: "Burn something you should let go of (write it, toss it)", fx: { rom: 8, aff: 7, inti: 2 }, lines: ["You make her write one down too. Hers goes in the flames first; yours after. Neither of you reads the other's, and that's the whole point."] },
            { label: "Pull her into your lap by the fire", roll: { dc: 13, win: { fx: { rom: 10, lib: 7, inti: 3 }, lines: ["She settles into your lap facing the flames, your arms crossed over her, her head back against your shoulder. The fire pops; nobody moves for a long time."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["\"Greedy.\" She stays beside you instead, shoulder to shoulder. Fair enough."] } }, sub: [
              { label: "Kiss her, firelight and all", roll: { dc: 14, win: { fx: { rom: 13, lib: 11, inti: 4 }, kiss: true, lines: ["You turn her chin and kiss her with the fire throwing everything orange, and she goes from amused to entirely not amused in about a second."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She catches it on the cheek, gentle. \"Slower. The fire's not going anywhere.\" True."] } }, sub: [
                { label: "Take her inside, just like this", rooms: true },
                { label: "Stay out here, let it simmer", fx: { rom: 7, aff: 5, inti: 2 }, lines: ["You don't take it anywhere. You just stay tangled by the fire, letting it stay exactly this warm and no warmer, which is its own kind of brave."] },
                { label: "Take it further, right here", gate: { inti: 8, rom: 55 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She slows your hands, breath uneven. \"Not on the lawn, animal. Inside. Come on.\" Not a no — a relocation."] } } },
                { label: "Back up", back: true },
              ] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Slow-dance in the dark, no music", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 3 }, lines: ["You pull her up and you both just sway to nothing, barefoot on cold grass, the city humming a floor below. She hums something off-key on purpose and you let her."] }, lose: { fx: { rom: 1 }, lines: ["\"There's no music.\" \"That's the bit.\" \"…no.\" She grins and stays sitting. Worth a shot."] } } },
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
    // Hot tub: pick how you get in, then a real series of in-water
    // choices, then how you get out (which sets her attire for the rest
    // of the night). swimNext: "inTub" routes the entry into the series.
    swim: {
      ask: "The tub's hot and the night's quiet. {n} dips a hand in, then looks at you with the specific problem written on her face: nobody packed for this.",
      hasSuit: { lines: ["Turns out {n} came prepared — a swimsuit under the dress, because of course she had a feeling. She changes and slides in across from you, grinning at how smug she gets to be about it."], fx: { rom: 6, lib: 5, inti: 2, attire: "suit" }, swimNext: "inTub" },
      noSuit: [
        { label: "\"We don't have to — let's just sit by it.\"", enter: "You wave it off; you both just sit on the edge, feet in the water, leaning into each other. She likes that you offered the out — you can feel her decide it.", sub: [
          { label: "Trail your feet, talk in the steam", fx: { rom: 5, aff: 5, inti: 1 }, lines: ["Feet in the hot water, the rest of you in the cold air, the talk going somewhere unhurried and true. Nobody's in a rush to be wetter than this."] },
          { label: "Pull her in against your side on the edge", roll: { dc: 12, win: { fx: { rom: 8, lib: 4, inti: 2 }, lines: ["You pull her in and she folds against your side, knees up, your arm around her, both of you steaming gently into the dark. It's almost obscenely nice."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["\"I'm comfortable.\" She stays an arm's length off, smiling. Pace noted."] } }, sub: [
            { label: "\"…okay, actually, let's get in.\"", swimNext: "inTub", fx: { rom: 4, lib: 4, inti: 1, attire: "underwear" }, lines: ["She caves first, actually — \"fine, the edge is a tease\" — and you're both in before either of you fully agreed to it."] },
            { label: "Stay right here, dry and close", fx: { rom: 7, aff: 6, inti: 2 }, lines: ["You don't get in. You just stay on the lip of it, tangled up, letting the heat come off the water instead of off either of you. It counts."] },
            { label: "Back up", back: true },
          ] },
          { label: "Head back inside instead", rooms: true },
          { label: "Back up", back: true },
        ] },
        { label: "\"Underwear's basically a swimsuit.\"", roll: { dc: 12, swimNext: "inTub", win: { fx: { rom: 9, lib: 9, inti: 3, attire: "underwear" }, lines: ["{n} considers you, then the water, then shrugs — \"it absolutely is not, but fine\" — and is down to it before you've finished agreeing. The water's hot, the space between you isn't."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["\"Nice try.\" She laughs but keeps the dress on, dangling her feet in instead. Pace check, noted."] } } },
        { label: "\"…or we skip the swimwear entirely.\"", roll: { dc: 15, swimNext: "inTub", win: { fx: { rom: 13, lib: 14, inti: 4, attire: "bare", kiss: true }, lines: ["You say it like a dare and {n} holds your eyes while she calls it — no hesitation in the end, just a slow smile and a quiet \"turn the porch light off, then.\" The water's dark and warm and very close."] }, lose: { hard: true, fx: { rom: -9, aff: -6 }, lines: ["It lands wrong. {n}'s smile flattens. \"Okay — that's a lot faster than I'm going.\" She pulls her feet out and reaches for her shoes, and the air's gone out of the night."] } } },
      ],
      inTub: [
        { label: "Float back, heads at the sky, just talk", fx: { rom: 6, aff: 5, inti: 1 }, lines: ["You both push off and float, heads tipped back, hands occasionally bumping underwater and not moving away. The talk goes quiet and good."] },
        { label: "Pull her across the water into your lap", roll: { dc: 13, win: { fx: { rom: 9, lib: 8, inti: 3 }, lines: ["You pull and she glides across and settles astride your lap like the water made it easy, arms looping your neck, very much not talking about the stars anymore."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["She drifts back just out of reach, grinning. \"Patience.\" The water laps. Noted."] } }, sub: [
          { label: "Kiss her, slow, in the steam", roll: { dc: 14, win: { fx: { rom: 12, lib: 11, inti: 4 }, kiss: true, lines: ["You kiss her with the water between you doing nothing to cool it, her fingers locked behind your neck, the night gone very small and very warm."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["You move too fast for the moment; she eases back, hands flat on your chest. \"Slower. We have the whole tub.\""] } }, sub: [
            { label: "Take it all the way, right here in the water", gate: { inti: 8, rom: 55 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She slows your hands under the water, breath uneven. \"Not in the tub — come inside with me.\" Not a no. A relocation."] } } },
            { label: "Just hold her there, let it idle", fx: { rom: 8, aff: 6, inti: 2 }, lines: ["You don't push it anywhere. You just hold her astride your lap in the heat, foreheads together, letting it idle exactly here — which somehow lands harder than rushing would have."] },
            { label: "Cool off — climb out", goOut: true },
            { label: "Back up", back: true },
          ] },
          { label: "Just hold her there, no agenda", fx: { rom: 8, aff: 7, inti: 2 }, lines: ["She stays in your lap, cheek to your jaw, and you don't do a single thing about it except be very glad. The jets hum. Neither of you moves."] },
          { label: "Back up", back: true },
        ] },
        { label: "Steal a kiss across the water", roll: { dc: 14, win: { fx: { rom: 11, lib: 10, inti: 4 }, kiss: true, lines: ["You close the gap through the water and catch her mid-laugh; the laugh stops being a laugh. Steam, dark, her hand fisting in your wet hair."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She tips back out of reach with a splash and a grin. \"Work for it.\" Fair."] } }, sub: [
          { label: "Pull her in closer, keep going", roll: { dc: 14, win: { fx: { rom: 11, lib: 11, inti: 4 }, lines: ["You reel her in by the waist under the water and she comes the rest of the way without being asked twice."] }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"Easy.\" She stays close but sets the speed herself. You let her."] } }, sub: [
            { label: "Take it all the way, right here", gate: { inti: 8, rom: 55 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["\"Inside,\" she breathes, not stopping so much as redirecting. \"Come on.\""] } } },
            { label: "Cool off — climb out", goOut: true },
            { label: "Back up", back: true },
          ] },
          { label: "Cool off — climb out", goOut: true },
          { label: "Back up", back: true },
        ] },
        { label: "Climb out — grab towels", goOut: true },
      ],
      getOut: [
        { label: "Wrap her in a towel, stay close", fx: { rom: 6, aff: 4, inti: 2, attire: "towel" }, enter: "You climb out laughing and freezing and wrap her up before yourself; she stays pressed in for the warmth, hair dripping, in absolutely no hurry to find clothes.", sub: [
          { label: "Take her inside exactly like this", rooms: true },
          { label: "Drift over to the fire to dry off", toFire: true },
          { label: "Back into the water", backTub: true },
        ] },
        { label: "Don't bother with towels at all", roll: { dc: 14, win: { fx: { rom: 11, lib: 12, inti: 4, attire: "bare" }, lines: ["Neither of you reaches for a towel. The walk back toward the door is slow and unhurried and very awake, the cold air doing nothing to cool any of it."] }, lose: { fx: { rom: -4, aff: -3, attire: "towel" }, lines: ["You go for bold; she hands you a towel with a pointed look. \"Confidence. Cute. Towel.\" Reset, gently."] } }, sub: [
          { label: "Inside, just like this", rooms: true },
          { label: "Over to the fire", toFire: true },
          { label: "Back into the water", backTub: true },
        ] },
        { label: "Actually — back into the water", backTub: true },
      ],
    },
    // Reached from any "all the way" beat. Condom needs one in your bag;
    // going raw is a real read of who she is.
    sex: {
      ask: "Everything narrows to right here — the lamp off, the city a long way down, {n}'s breath uneven against your jaw and her hand fisted in the back of your collar like she's not planning to let go of it. There's one honest beat left before this goes all the way, and she's holding still through it, waiting to see how you take it.",
      condom: { lines: ["You reach for it and she watches you do it and the last of the tension goes out of her shoulders all at once — that specific ease that only comes from not having had to ask for it. After that there is nothing careful left. It's slow and then not, her mouth at your throat and then her teeth, your name said into the dark like it's the only word she's kept. It goes on a long time and neither of you wastes a second of it being shy about what you want.", "Later she's tucked into the dark along the length of you, tracing your collarbone with one idle finger, not asleep, not talking, not going anywhere."], fx: { rom: 18, lib: 16, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She holds your eyes for the unasked question and answers it by pulling you the rest of the way down with her, both hands, no hesitation in any of it. It's unhurried and then it absolutely isn't — entirely, mutually meant, trust doing half the work the want started and neither of you bothering to be quiet about the rest. She gets a hand in your hair and her mouth at your ear and tells you, specifically, and you listen.", "Later she's folded into the dark against you, sweat cooling, her finger drawing slow nothing on your chest, in no state and no hurry to be anywhere that isn't this."], fx: { rom: 20, lib: 18, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that. Not without.\" It's not anger, it's a line, and you went over it. The warmth goes out of the room all at once, and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease off, forehead dropped to hers, and just breathe for a second in the inch of space between you. {n} lets out a small laugh — half relief, half something a lot rawer — and pulls you down to just hold her instead, hard, like that's its own thing. It is. Not nothing. Just not the rest of it, not tonight."] },
    },
  };

  // Scenic overlook date — nested like HOME. "The view" and "the car",
  // with a photoshoot that branches silly / casual / spicy. Uses the
  // same node grammar; its own sex block (the car).
  const OVERLOOK = {
    intro: "You take the ridge road up with the windows down. The pull-off is empty, the guardrail's the only thing between you and the whole city laid out and lit. You kill the engine. {n} just looks at it for a second before she looks at you.",
    rooms: [
      { key: "view", name: "The overlook", enter: "You both get out into the cold clean air. The city does that thing where it stops being traffic and becomes a circuit board. {n} leans on the rail like she could watch it all night.",
        actions: [
          { label: "Stand at the rail and take it in", enter: "Shoulder to shoulder at the guardrail, the wind doing the talking for a minute.", sub: [
            { label: "Point out the places that mean something", fx: { rom: 6, aff: 7, inti: 1 }, lines: ["You start naming them — that's the bridge you got lost on, that's where the good tacos were before it closed — and she trades hers back, and the map turns personal fast."] },
            { label: "Find her street from up here", fx: { rom: 5, aff: 6, inti: 1 }, lines: ["You make her find her own window in the grid. She can't, gives up, points at the wrong neighborhood entirely, and somehow that's the warmest the night's been."] },
            { label: "Stop talking, put an arm around her", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 3 }, lines: ["You stop narrating the city and just put an arm around her. She leans the whole line of herself into it without a word and the silence does more than the talking did."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["She steps half a pace to fix her hair — \"it's freezing, give it a second\" — and the moment politely waits."] } }, sub: [
              { label: "Turn her in and kiss her, city behind her", roll: { dc: 13, win: { fx: { rom: 13, lib: 9, inti: 4 }, kiss: true, lines: ["You turn her by the shoulder and kiss her with a million lights out of focus behind her. She makes a small sound and stops being cold."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She tilts back, soft about it. \"Not — let me just look at it a little longer first.\" Fair. The view's not going anywhere."] } } },
              { label: "Just hold her there, watch it together", fx: { rom: 8, aff: 7, inti: 2 }, lines: ["You don't make a move. You just keep her tucked under your arm and watch the city not move, and it's stupid how good that is."] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Share the drink you brought", enter: "You brought something worth bringing. Two paper cups in the cold, which is somehow better than any glass at the bistro.", sub: [
            { label: "Pass it back and forth, no rush", fx: { rom: 6, lib: 4, inti: 1, loosen: true }, lines: ["One cup, traded back and forth, the night dropping half a gear looser with every pass."] },
            { label: "Make her toast to something real", roll: { dc: 12, win: { fx: { rom: 9, aff: 7, inti: 2 }, lines: ["You make her toast to something true instead of something cute. She thinks, then says it, and means it, and the cold doesn't matter for a second."] }, lose: { fx: { rom: 1 }, lines: ["\"To… not freezing.\" She dodges the real one with a grin. You let her keep it."] } } },
            { label: "Get her warm — pull her into your coat", roll: { dc: 13, win: { fx: { rom: 10, lib: 7, inti: 3 }, lines: ["You open the coat and she steps into it, back to your chest, both your arms around her over the rail. She goes quiet in the specific way that isn't really about the cold."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["\"I run warm, weirdly.\" She stays just out of the coat, smiling. Pace noted."] } }, sub: [
              { label: "Kiss the side of her neck, see what she does", roll: { dc: 14, win: { fx: { rom: 12, lib: 11, inti: 4 }, kiss: true, lines: ["You kiss the cold side of her neck and feel the breath go out of her; she turns inside the coat to make it a real one."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She shivers and laughs and resettles. \"Patience. The view, remember.\" Recoverable."] } } },
              { label: "Don't move, just keep her warm", fx: { rom: 7, aff: 6, inti: 2 }, lines: ["You hold the moment exactly where it is — her in the coat, the city below — and let it be enough, which it very much is."] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Take a picture", enter: "\"Okay, this we are documenting,\" she says, digging your phone out of your own pocket like she lives there.", sub: [
            { label: "One nice one — arms around each other", fx: { rom: 6, aff: 6, inti: 1 }, lines: ["You take exactly one, both of you squinting, the city a blur of gold behind you. It's not a good photo. You're both keeping it forever."] },
            { label: "Make it a real shoot — you direct", enter: "She hands you the phone and steps into the headlight wash, mock-serious. \"Fine. Direct me. Be gentle, I'm an artist.\" Try any direction you like, in any order — suggest a layer whenever you want, or let her decide; push on or stop wherever.", sub: [
              { label: "\"Make a silly face\"", fx: { rom: 5, aff: 7, inti: 1 }, lines: ["Something cross-eyed and feral and perfect; you take nine. Somewhere in the bad ones she stops performing for a camera and starts trusting the person holding it. You."] },
              { label: "\"Hands in your hair, eyes closed, just feel it\"", roll: { dc: 11, win: { fx: { rom: 8, aff: 7, inti: 2 }, lines: ["She does it for real and the self-consciousness drops off her like a coat. The frame where she forgets the lens entirely is the one neither of you will ever delete."] }, lose: { fx: { rom: 2, aff: 2 }, lines: ["She peeks. \"I can feel you judging the angle.\" Fair. You both reset, laughing."] } } },
              { label: "\"Whatever you're comfortable with — just move\"", roll: { dc: 11, win: { fx: { rom: 8, aff: 8, inti: 2 }, lines: ["You quit posing her and let her drift; she finds her own angles, glances back to check you're still watching. You are. She clocks that you are. That mid-turn look is the whole shoot."] }, lose: { fx: { rom: 2, aff: 2 }, lines: ["She seizes up, too aware of the lens. \"I'm so bad at this.\" You lower the phone and let her shake it off."] } } },
              { label: "\"Look back over your shoulder\"", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 2 }, lines: ["Chin to her shoulder, eyes back down the lens, the city soft and gold behind her. She holds it a half-beat too long and the half-beat is the photograph and neither of you mentions the half-beat."] }, lose: { fx: { rom: 3, aff: 2 }, lines: ["She overthinks it stiff and you both crack up. \"Delete. Again.\" You'd go all night."] } } },
              { label: "\"Arch your back, chin down\"", gate: { inti: 3, rom: 28 }, roll: { dc: 12, win: { fx: { rom: 9, lib: 7, inti: 2 }, lines: ["She finds the line of it and holds it, and the cold has stopped being why she's doing this slowly. Several frames. None of them are leaving the phone and you both know it now."] }, lose: { fx: { rom: 2, aff: 1 }, lines: ["\"That's a gym-selfie pose and I won't.\" She refuses on principle, grinning. Try another."] } } },
              { label: "\"Strap off the shoulder — just that\"", gate: { inti: 4, rom: 34 }, roll: { dc: 13, win: { fx: { rom: 10, lib: 9, inti: 3 }, lines: ["One strap, slow, with her eyes on you the whole way down it instead of the lens. It's still technically a shoot. It is unmistakably not only a shoot, and she's the one who decided that."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["She thumbs the strap back up, smirking. \"Earn it.\" The moment waits, patient."] } } },
              { label: "\"Hands on the hood, look back at me\"", gate: { inti: 4, rom: 36 }, roll: { dc: 13, win: { fx: { rom: 11, lib: 11, inti: 3 }, lines: ["She braces on the warm metal and turns just her head, and the look down the lens is not one you photograph and post, it's one you keep, and she knows precisely which kind she just gave you."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["\"Cold metal! Cold!\" She breaks the pose laughing. Reset, no damage."] } } },
              { label: "\"…whatever you're comfortable with — your call.\" (let her decide how far)", ustep: "hercall", hercall: {
                spicy: { fx: { rom: 12, lib: 14, inti: 4, kiss: true }, lines: ["You hand the whole shoot to her and she takes it without a flicker — decides the next thing herself, loses it herself, slower than you'd have dared direct, never breaking eye contact with the lens or with you behind it. Giving her the call turns out to be the boldest frame in the set."] },
                safe: { fx: { rom: 6, aff: 8, inti: 1 }, lines: ["You give her the call and she takes the shoot down half a gear — pulls a goofy face, then a real soft one, keeps every layer exactly where it is and the camera exactly that honest. That being hers to decide is the whole point, and she clocks that you meant it."] } } },
              { label: "Suggest: lose the jacket", ustep: "jacket", gate: { inti: 3, rom: 30 }, roll: { dc: 13, win: { fx: { rom: 9, lib: 8, inti: 3, un: "jacket" }, lines: ["You ask for the jacket like a joke and she gives the first frame as a joke — then drops it off both shoulders on the next, slow, not joking at all, watching you watch the little screen. The whole evening moves ten degrees and you both feel exactly when."] }, lose: { fx: { rom: -3, aff: -2 }, lines: ["\"It is genuinely freezing, maniac.\" Jacket stays. No harm. Try a different angle."] } } },
              { label: "Suggest: the top, slow", ustep: "shirt", gate: { inti: 4, rom: 38 }, roll: { dc: 14, win: { fx: { rom: 11, lib: 11, inti: 4, un: "shirt" }, lines: ["She crosses her arms, takes the hem, and draws it up slow with the city burning behind her — watching your face do whatever it does, daring you to make it weird. You don't. You keep shooting, because she told you to and because you could not stop."] }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"Slower than that.\" Top stays. Not a no — a pace. Run another frame first."] } } },
              { label: "Suggest: the bra — only if she wants", ustep: "bra", gate: { inti: 5, rom: 45 }, roll: { dc: 15, win: { fx: { rom: 12, lib: 13, inti: 4, un: "bra", kiss: true }, lines: ["One hand, the clasp, the slow breath out of her as it goes — and she gives you exactly that, unhurried, the phone steady because you're making it be. She doesn't reach to cover anything. She watches you fail to look away and looks extremely pleased about it."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["\"That one I keep for now.\" Firm about the clasp, pointedly not about the night. Another frame, then."] } } },
              { label: "Suggest: the skirt — turn for me", ustep: "pants", gate: { inti: 6, rom: 50 }, roll: { dc: 15, win: { fx: { rom: 13, lib: 14, inti: 4, un: "pants" }, lines: ["Button, slide, the long unhurried drag of it down with her watching you over her shoulder the whole way. She steps out of it like the shoot was always heading exactly here, because by now it obviously was."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["She shakes her head once, smiling. Not yet. Keep shooting up here."] } } },
              { label: "Suggest: all of it — last one, just for us", ustep: "panties", gate: { inti: 7, rom: 55 }, roll: { dc: 16, win: { fx: { rom: 15, lib: 16, inti: 5, un: "panties", kiss: true, attire: "bare" }, lines: ["She holds your eyes, never the lens, and takes the last of it off like the dare had been hers from the first frame, and lets you take exactly one photo that is never touching a cloud as long as you both live. Then she's done being the subject — nothing at all between the camera and her now, and entirely unbothered about it."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["\"Mm — no. That one stays in my head, not your phone.\" A line, calmly kept. You put the phone down and mean it; she watches you mean it."] } } },
              { label: "\"…okay. Now hand me the camera.\" (she turns it on you)", ustep: "camera", enter: "She slides the phone out of your fingers with a slow, ruinous grin and turns it around on you. \"Fair's fair. Your turn. Same rule — only what you want to.\" She's already finding your light, merciless.", sub: [
                { label: "Let it all hang out", roll: { dc: 11, win: { fx: { rom: 11, lib: 14, inti: 4 }, lines: ["You give her exactly what she gave you — all of it, zero flinch — and she goes very quiet behind the phone, which from her is the entire review. \"…huh,\" she says, evenly, and does not stop at one. She has some of you now, and she knows it, and she likes it."] }, lose: { fx: { rom: 4, aff: 3 }, lines: ["You overdo it into a pratfall and she howls and gets that instead. Honestly a better photo. She still got one of you."] } }, sub: [
                  { label: "\"Now both of us.\" (together, on the record)", gate: { inti: 8, rom: 58 }, roll: { dc: 15, win: { sex: "shoot" }, lose: { fx: { rom: -3, aff: -2 }, lines: ["You reach to pull her into frame; she lets the phone drop to the seat instead. \"Forget the picture for a second.\" The exact opposite of a no."] } } },
                  { label: "Hand it back — let her keep the camera on you both", gate: { inti: 8, rom: 58 }, roll: { dc: 15, win: { sex: "shoot" }, lose: { fx: { rom: -3, aff: -2 }, lines: ["\"Greedy.\" She pockets the phone and pulls you down anyway, deciding the next part isn't for the lens after all."] } } },
                  { label: "Phone away — just her now, none of it kept", fx: { rom: 9, aff: 8, inti: 3 }, lines: ["You set the phone screen-down on the hood and that's the end of the documentary. Whatever happens next, nobody can ever prove it — exactly how she keeps the best ones."], sub: [
                    { label: "…then take it all the way, no camera", gate: { inti: 7, rom: 52 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"Slow. Not on the hood like a calendar.\" Not a no — a relocation, kindly meant."] } } },
                    { label: "Just her, just this, nothing else", fx: { rom: 10, aff: 9, inti: 3 }, lines: ["You don't take it anywhere. Just her, against the warm metal, the city indifferent below — and stopping here is somehow the loudest thing all night."] },
                    { label: "Back up", back: true },
                  ] },
                  { label: "Back up", back: true },
                ] },
                { label: "Cover up — make her work for it", roll: { dc: 12, win: { fx: { rom: 9, lib: 9, inti: 3 }, lines: ["You play coy and she gets competitive, directing you exactly the way you directed her, merciless and laughing, until she lands the frame she was after and looks insufferably pleased. The scoreboard, she announces, is even."] }, lose: { fx: { rom: 4, aff: 3 }, lines: ["She can't get the angle and gives up cackling. \"Useless. Gorgeous, but useless.\" Try letting her actually get one."] } }, sub: [
                  { label: "\"Now both of us.\" (together, on the record)", gate: { inti: 8, rom: 58 }, roll: { dc: 15, win: { sex: "shoot" }, lose: { fx: { rom: -3, aff: -2 }, lines: ["You reach for her and she lets the phone drop. \"Forget the picture.\" The opposite of a no."] } } },
                  { label: "Phone away — just her, none of it kept", fx: { rom: 9, aff: 8, inti: 3 }, lines: ["You set the phone face-down on the hood and the shoot's over. Whatever's next leaves no proof, exactly how she likes the best ones."], sub: [
                    { label: "…then take it all the way, no camera", gate: { inti: 7, rom: 52 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"Slower. Come here properly.\" Not a no."] } } },
                    { label: "Just her, just this", fx: { rom: 10, aff: 9, inti: 3 }, lines: ["You stop it right here against the warm hood with the city below, and the stopping is the thing that lands hardest."] },
                    { label: "Back up", back: true },
                  ] },
                  { label: "Back up", back: true },
                ] },
                { label: "Refuse — it's a one-way camera", fx: { rom: 3, aff: 4 }, lines: ["\"Absolutely not.\" She mock-gasps at the hypocrisy, lobs your jacket at your head, and keeps the photos she already has — the only leverage in this car that matters, she points out, very smug, in your jacket now and not giving the phone back."] },
                { label: "Back up", back: true },
              ] },
              { label: "Take it all the way now — forget the phone", gate: { inti: 8, rom: 56 }, roll: { dc: 15, win: { sex: "shoot" }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"Not on the hood like a calendar. Slow.\" Not a no — a relocation, or a wait."] } } },
              { label: "Stop the shoot — just kiss her, no camera", fx: { rom: 9, lib: 7, inti: 3 }, lines: ["You set the phone face-first on the hood and close the gap instead. She makes a small approving sound against your mouth like that was the correct read of the room, which it was."] },
              { label: "Leave it here — go somewhere else", rooms: true },
              { label: "Back up — done shooting", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Get in the car", rooms: true },
        ] },
      { key: "car", name: "In the car", enter: "You both pile back into the car, out of the wind. Heater ticking, windows starting to fog at the edges, the city still out there through the glass. It's suddenly very quiet and very close in here.",
        actions: [
          { label: "Talk low with the heater running", fx: { rom: 6, aff: 7, inti: 1 }, lines: ["Two seats, one armrest neither of you uses as a border, the talk going somewhere you don't get to in daylight."] },
          { label: "Put music on, recline the seats back", fx: { rom: 6, lib: 5, inti: 2, loosen: true }, lines: ["Seats back, something low on the speakers, the ceiling of the car and the smear of city light through the fog. She finds your hand across the gap and keeps it."] },
          { label: "Make out in the car", roll: { dc: 13, win: { fx: { rom: 11, lib: 9, inti: 4 }, kiss: true, lines: ["You lean across the console and she meets you there, and the bad geometry of car seats stops mattering almost immediately. The windows do the rest of the fogging."] }, lose: { fx: { rom: -5, aff: -4 }, lines: ["You misread the timing; she ducks it to a laugh against your jaw. \"The gearshift, ow — okay, slower.\" Recoverable, barely."] } }, sub: [
            { label: "Pull her over the console into your lap", roll: { dc: 14, win: { fx: { rom: 12, lib: 13, inti: 4 }, lines: ["She climbs the console without being asked twice and the front seat gets a lot smaller and a lot warmer."] }, lose: { fx: { rom: -4, aff: -3 }, lines: ["\"This car was not built for that.\" She laughs, stays in her seat, keeps kissing you across the gap instead. Fine by you."] } }, sub: [
              { label: "Climb into the back, all the way", gate: { inti: 6, rom: 45 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["\"Slow,\" she breathes, forehead to yours, hand stilling yours. \"Not — yet. Just this for a while.\" Not a no."] } } },
              { label: "Stay up front, just this, windows fogged", fx: { rom: 9, lib: 8, inti: 3 }, lines: ["You don't escalate it. You just stay tangled in the front seat with the whole city erased by fog on the glass, and it's more than enough."] },
              { label: "Back up", back: true },
            ] },
            { label: "Keep it to just this, fog the windows", fx: { rom: 8, lib: 6, inti: 3 }, lines: ["Neither of you reaches for more than this. The windows go opaque and the city disappears and it stays exactly, deliberately, here."] },
            { label: "Back up", back: true },
          ] },
          { label: "Take it all the way — climb in back", gate: { inti: 7, rom: 50 }, roll: { dc: 15, win: { sex: true }, lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["You reach past where the night actually is. {n} stops you, fully, kindly. \"Hey — no. Not in the back of a car on the first real one of these.\" She sits up, fixes her jacket, and the fog on the windows suddenly just feels cold. The night's over."] } } },
          { label: "Back to the view", rooms: true },
        ] },
    ],
    sex: {
      ask: "It narrows down to just the fogged-in dark of the car and the sound of both of you breathing. {n}'s hand is fisted in your collar and not letting go. One honest beat left before this goes all the way.",
      condom: { lines: ["You've got one and she watches you have it and the last of the held breath goes out of her — the ease that only comes from not having had to ask. After that the city's gone behind the fog on the glass and there is just the two of you and a back seat that was very much not designed for any of this and neither of you caring even slightly. It's cramped and graceless and she's laughing into your mouth about it right up until she very much isn't, and then it's none of those things, just close and certain and going on longer than the geometry should allow.", "After, she's folded against you in a space far too small for two people, fogging the last clear inch of window, not complaining about a single part of it."], fx: { rom: 17, lib: 16, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She holds your eyes for the unasked question and answers it by pulling you the rest of the way back with her, no hesitation, the decision made for both of you in about a second. It's close and certain and entirely mutual, the whole car gone white with it, the city erased, her breath and your name and the seat creaking and absolutely none of you caring about the last one. She is not quiet. There is nobody up here to be quiet for and she knows it.", "After, she's draped boneless half over you in a space built for one, tracing your jaw, watching the fog go slowly clear again, in no hurry to fix any of it."], fx: { rom: 19, lib: 18, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that, not without.\" It's a line, not a mood, and you went over it. The fog on the glass goes from intimate to just cold, and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease it back down to forehead-to-forehead in a too-small space, both of you breathing, the city slowly bleeding back through the clearing fog. \"…probably smart,\" she admits, not moving an inch."] },
    },
    // Reached straight out of the photoshoot — the phone is part of it.
    shootSex: {
      ask: "The shoot stopped being a shoot a few frames ago and you both know exactly when. {n}'s got nothing on, the phone's still warm in someone's hand, the city's a wall of light below, and she's looking at you over the top of it with one eyebrow up: \"so. on the record, or off?\" One honest beat before this goes all the way.",
      condom: { lines: ["You've got one and she watches you have it and the last of the held breath goes out of her — that ease of not having to ask, even with a lens somewhere in the room. After that it's the cold and the hood and the whole lit city for an audience that can't see a thing, her completely past being directed and fully in charge of the angle of all of it, the phone a thing that exists in the way you exist — peripherally, and very much. It goes long and gets loud; there is nobody up here.", "After, she's folded warm against you on the cooling metal, scrolling back through what's on there with a private, ruinous little smile and not showing you which ones."], fx: { rom: 18, lib: 17, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She answers her own question by setting the phone down screen-up between you, still on, and pulling you the rest of the way down anyway — on the record, then, decided in a look, no hesitation in any of it. It's the open dark and the lit city and her not remotely quiet because there is no one up here to be quiet for and she knew that the whole time. Whatever the lens caught, it caught true; neither of you performed a frame of it once it started.", "After, she's draped over you against the warm hood, going back through it on the little screen, deciding out loud and very smug which exactly two are surviving the night and which are not."], fx: { rom: 20, lib: 19, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that, not without, not with that thing on.\" It's a line, not a mood, and you went over it. She picks the phone up, screen off, and the cold comes back in all at once, and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You take the phone out of the equation, screen-down on the hood, and bring it back to just her — both of you breathing, the city indifferent below. \"…probably smarter,\" she admits, thumbing the screen dark, not stepping back an inch."] },
    },
  };

  // Beach date — nested like the overlook. Shore + an optionally-rented
  // boat with its own deep tree. Same node grammar; its own sex block.
  const BEACH = {
    intro: "You get there with the sun already low and orange and most of the crowd packing up. The sand's still warm, the water's gone glassy, and there's a little dock down the end renting boats by the hour to anyone who looks like they won't sink one. {n} kicks her shoes off the second you hit the sand.",
    rooms: [
      { key: "shore", name: "The shore", enter: "Just the two of you and a mile of emptying beach, the tide doing the talking.",
        actions: [
          { label: "Walk the waterline, no particular plan", fx: { rom: 6, aff: 7, inti: 1 }, lines: ["You walk until the people run out, the wet sand firm underfoot, the talk going wherever it wants. She picks up a shell, decides it's ugly, keeps it anyway, hands it to you to hold like that was always your job."] },
          { label: "Drop down on the blanket, watch the sun go", enter: "One towel, the last of the light, her shoulder finding yours like it was assigned there.", sub: [
            { label: "Just sit in it, shoulder to shoulder", fx: { rom: 7, aff: 8, inti: 1 }, lines: ["Neither of you narrates the sunset, which is the correct call. She leans her head on you somewhere around the part where the sky goes pink and stays there through the part where it doesn't."] },
            { label: "Pull her into your lap, face the water", roll: { dc: 12, win: { fx: { rom: 9, lib: 5, inti: 3 }, lines: ["She settles back against your chest, your arms crossed over her, both of you watching the same horizon. The last gulls give up. The dark comes in slow and she doesn't move out of it."] }, lose: { fx: { rom: -2, aff: -1 }, lines: ["\"Sandy. Patience.\" She stays beside you instead, hip to hip. Fair."] } }, sub: [
              { label: "Kiss her, salt and all", roll: { dc: 13, win: { fx: { rom: 12, lib: 9, inti: 4 }, kiss: true, lines: ["You turn her chin and she's already most of the way there, the kiss going slow and unhurried with the whole dark beach to itself and the water keeping time."] }, lose: { fx: { rom: -4, aff: -3 }, lines: ["You misjudge the angle; she laughs it onto your cheek. \"Smooth, sailor.\" Recoverable, barely, charmingly."] } } },
              { label: "Stay exactly here, no next move", fx: { rom: 8, aff: 8, inti: 2 }, lines: ["You don't do anything about it. You just keep her there against you in the dark with the tide coming up the sand, and that turns out to be the thing that lands hardest."] },
              { label: "Back up", back: true },
            ] },
            { label: "Back up", back: true },
          ] },
          { label: "Get in the water with her", roll: { dc: 12, win: { fx: { rom: 9, lib: 7, inti: 3 }, lines: ["She's in before you finish the sentence, shrieking at the cold, dragging you after her by the wrist. It's freezing and stupid and she comes up laughing and very close and not backing off the closeness."] }, lose: { fx: { rom: 3, aff: 2 }, lines: ["\"It's ICE.\" She gets exactly ankle-deep, refuses categorically to go further, and flicks water at you the entire time. Still counts."] } } },
          { label: "Rent a boat for a couple of hours", rooms: true },
          { label: "Wind the night down here", rooms: true },
        ] },
      { key: "boat", name: "On the boat", enter: "You hand over the deposit and a small open boat is suddenly yours until the dockhand wants it back. {n} takes the wheel without asking, points it at the gap in the breakwater, and opens it up until the beach is a line of lights behind you.",
        actions: [
          { label: "Let her drive, just watch her do it", fx: { rom: 7, aff: 7, inti: 2 }, lines: ["She's good at it, or fakes it well, wind doing whatever it wants to her hair, grinning at the open water like it owes her something. You mostly just watch her have this, and she catches you doing it, and doesn't tell you to stop."] },
          { label: "Cut the motor, drift, share the quiet", fx: { rom: 8, aff: 8, inti: 2, loosen: true }, lines: ["Engine off, just the hull knocking on the swell and the whole sky doing its thing with nobody around to perform for. The quiet out here is a different species of quiet. She gets quieter inside it, in the good way."] },
          { label: "Drop anchor somewhere with nobody around", enter: "You find a cove the chart doesn't bother naming, kill the engine, and the world contracts to one small boat and a lot of dark water.", sub: [
            { label: "Lie back on the bow, look up", roll: { dc: 12, win: { fx: { rom: 9, aff: 8, inti: 3 }, lines: ["You both stretch out on the foredeck, the boat rocking slow, more stars out here than the city ever admits exist. She finds your hand without looking and the talk goes very low and very true."] }, lose: { fx: { rom: 3, aff: 2 }, lines: ["The fiberglass is unforgiving and she will not stop saying so, and somehow complaining about it together is its own good time."] } }, sub: [
              { label: "Roll over and kiss her, boat rocking", roll: { dc: 14, win: { fx: { rom: 13, lib: 12, inti: 4 }, kiss: true, lines: ["You turn into her on the narrow deck and she meets you all the way, the boat doing half the moving for you, the water loud against the hull and nobody for a mile in any direction to care what this becomes."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["The boat lurches and turns it into a clumsy collision and a laugh. \"Smooth, captain.\" She keeps hold of your shirt, though."] } }, sub: [
                { label: "Take her below to the cabin", gate: { inti: 7, rom: 52 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -5, aff: -3 }, lines: ["\"The deck. Not the cabin. The cabin is where this stops being a good idea.\" She keeps you up top, not letting go, just slowing it. Not a no."] } } },
                { label: "Stay up here, just this, under the sky", fx: { rom: 10, lib: 8, inti: 3 }, lines: ["You don't take it anywhere. You stay tangled on the deck with the boat rocking you and the stars doing their thing, and choosing to stop here is somehow the loudest thing you do all night."] },
                { label: "Back up", back: true },
              ] },
              { label: "Back up", back: true },
            ] },
            { label: "Dare her to jump off the side with you", roll: { dc: 12, win: { fx: { rom: 10, lib: 8, inti: 3 }, lines: ["You both go off the gunwale into black warm water with a yell, surface gasping and laughing and treading close, the boat a dark shape above you and nothing else for miles. She's looking at you differently when you climb back in, dripping and freezing and not minding either."] }, lose: { fx: { rom: 4, aff: 3 }, lines: ["\"Out here? In the DARK water? Absolutely not, I've seen films.\" She refuses with her whole body and makes you sit back down, laughing too hard to argue."] } } },
            { label: "Below to the cabin — out of the wind", gate: { inti: 8, rom: 56 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["She stops at the top of the little companionway, hand flat on your chest. \"Slow. We've got the whole boat and the whole night.\" Not a no — a not yet, kindly meant."] } } },
            { label: "Back up", back: true },
          ] },
          { label: "Head back to the dock", rooms: true },
        ] },
    ],
    sex: {
      ask: "It comes down to just the slap of water on the hull, the boat rocking you both, and {n} with a fist in your shirt and no intention of letting the dock have its boat back on time. One honest beat left before this goes all the way out here.",
      condom: { lines: ["You've got one and she watches you have it and the last of the held breath goes out of her — the ease that only comes from not having to ask. After that there's just the rock of the boat doing half the work, the water loud against the hull, the dark absolute, and neither of you with anywhere to be or any reason to be quiet about it. It goes on a long time. The dockhand is going to be annoyed.", "After, she's draped over you in the bottom of a small boat under more stars than seems fair, in no hurry to give any of it back."], fx: { rom: 18, lib: 17, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She holds your eyes for the unasked question and answers it by pulling you the rest of the way down with her, the decision made for both of you in about a second. It's the rock of the swell and the warm dark and her not staying remotely quiet because there is genuinely nobody out here, the nearest light a mile off and not watching. The boat keeps its own time and you both lose track of it entirely.", "After, she's folded against you in the bottom of the hull, salt-damp, tracing your jaw, the boat turning slow on its anchor and neither of you fixing it."], fx: { rom: 20, lib: 19, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that, not without.\" It's a line, not a mood, and you went over it out here where there's nowhere to walk it off. The water gets cold against the hull and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease it back down to just holding her in the rock of the boat, both of you breathing, the water knocking patiently on the hull. \"…probably smart,\" she admits, not letting go, not really meaning the smart part."] },
    },
  };

  const STAGES = [
    { min: 0, name: "Stranger" }, { min: 10, name: "Acquaintance" }, { min: 25, name: "Friend" },
    { min: 45, name: "Crush" }, { min: 70, name: "Close" }, { min: 95, name: "Smitten" },
  ];

  const TUNING = {
    barCap: 100, statCap: 25, baseDC: 10, dcPerInterest: 0.1,
    likedStyleBonus: 5, dislikedStylePenalty: 5, likedStatBonus: 2,
    startMoney: 20,
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
    attrPhysK: 5.5, attrPhysCap: 60, attrInterestK: 4, attrVarianceSpan: 18,
    attractBaseCap: 95, attractEventCap: 32,
    carDislikeQ: 0.25,
    giftRomanceShare: 0.4, favoriteGiftMult: 2.2,
    pregChanceRaw: 0.35, pregTalkAfterDays: 3,
    textDC: 11, textReward: 4,
    partyInviteChance: 0.3, partyVibe: 2, partyLoud: 3, partyDrinkLibido: 14, overDrinkAt: 4,
    partyDrinkFlow: 1, partyEventHeat: 1, partySpicyAt: 1,
    danceFail: { romance: -6, affection: -3 },
    privateReward: { romance: 18, libido: 14, attractionEvent: 5 }, privateFail: { romance: -10, affection: -6 },
    bodyShot: { romance: 9, libido: 11, attractionEvent: 2, dc: 12 },
    stripDare: { romance: 6, libido: 7 }, stripFail: { romance: -4, affection: -3 },
    npcFlirt: { stayCool: { romance: 5, attractionEvent: 3 }, cutIn: { romance: 8, libido: 4 }, sulk: { romance: -6, affection: -4 }, letHer: { affection: 4, romance: -2 } },
    partyHookup: { romance: 16, libido: 14, attractionEvent: 5 },
  };

  window.GAMEDATA = {
    STATS, STAT_LABEL, STAT_SHORT, BARS, BAR_LABEL, BAR_SHORT, TRAITS,
    BG_CATEGORIES, WEEKDAYS, JOBS, HOUSES, CARS,
    SAYS, MOVE, LINES, ITEMS, SHOPS, LOCATIONS, PHASES,
    CHARACTERS, BILL, DATE_SCENES, DATE_END, HOME, OVERLOOK, BEACH, INTIMACY, PARTY, STAGES, TUNING,
  };
})();
