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
    overlook: { name: "Scenic Overlook", emoji: "🌃", blurb: "A ridge road, the whole city laid out below.", arrive: "Gravel pull-off, guardrail, the city spread out under you like a circuit board nobody turned off.", overlookSpot: true, dateCost: 10 },
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
    privateGateFlow: 1, privateGateInterest: 40,
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
    // Only shown when it was unprotected. Non-graphic; "finish inside"
    // gates a real pregnancy-risk consequence.
    finish: {
      q: "Right at the edge —",
      pull: { label: "Pull out", fx: { rom: 2, aff: 3 }, line: "You pull back at the last second. {n} lets out a breath and a small laugh, foreheads together. \"…good call,\" she manages." },
      inside: { label: "Finish inside", fx: { rom: 6, lib: 4 }, line: "Neither of you stops, or wants to. After, she stays exactly where she is for a long minute, not saying the obvious thing — and neither do you." },
    },
    // Protection beat for party hookups (home has its own HOME.sex).
    // Mirrors the home choice: a condom if you brought one, going without
    // (real risk), or pulling back. Reached after the hookup read succeeds.
    party: {
      ask: "It's about to be a lot more than a closed door. {n}'s hands still for half a second — not stopping, just one honest beat before this goes all the way.",
      condom: { lines: ["You've got one on you; she clocks it and the half-second of held breath goes out of her. After that there's nothing careful left, just the bassline through the wall and the two of you and none of the party.", "Some of tonight stays in this room."], fx: { rom: 14, lib: 14, inti: 4, kiss: true } },
      raw: { lines: ["She doesn't reach for anything and neither do you, and the look you trade about that is its own short conversation, answered fast. After, she's still against you in the dark, the party a dull pulse somewhere far off.", "Some of tonight stays in this room."], fx: { rom: 16, lib: 16, inti: 5, kiss: true } },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease it back down to just this — her forehead on your jaw, both of you breathing, the party stupid and loud and far away. \"…probably smart,\" she admits, not moving."] },
    },
    // Days later, if it caught.
    pregnancy: {
      wait: "A few quiet days. Then {n} asks to meet somewhere with nobody else around — and you read it on her face before she gets a word out.",
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
          { label: "Lie back and look at the stars", enter: "You both lie back on the cool grass. {n} finds your hand without looking; the talk goes low and honest the way it only does when nobody has to make eye contact.", sub: [
            { label: "Trade the embarrassing true things", fx: { rom: 6, aff: 7, inti: 1 }, lines: ["You tell her a real one. She's quiet, then tells you a worse one, and the trade goes back and forth until you're both laughing at the dark."] },
            { label: "Invent constellations, badly", fx: { rom: 5, aff: 5, inti: 1 }, lines: ["You point at four random stars and declare them 'the Grocery Cart.' {n} counters with 'the Regret.' It escalates. It is very stupid and you don't want it to end."] },
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
            { label: "Make it a real little shoot", enter: "She gets into it — directing, repositioning you, ruthless about the light. It stops being one photo fast.", sub: [
              { label: "Keep it silly — pull faces, terrible poses", fx: { rom: 6, aff: 8, inti: 1 }, lines: ["You do the worst possible poses. She does worse. The camera roll is a war crime and she's never laughed like this and you'd burn the good photos to keep these."] },
              { label: "Casual — candids of her, just being her", roll: { dc: 11, win: { fx: { rom: 9, aff: 9, inti: 2 }, lines: ["You stop posing her and just catch her — laughing, looking off, pushing her hair back. She steals the phone, sees them, goes quiet. \"…oh. I look like that to you?\""] }, lose: { fx: { rom: 2, aff: 2 }, lines: ["She catches you candid-ing her and ducks every frame, laughing. \"Delete those. DELETE — \" You don't. You won't tell her that."] } }, sub: [
                { label: "Show her the one that landed", fx: { rom: 8, aff: 9, inti: 2 }, lines: ["You turn the screen around to the one. She looks at it a long time and doesn't make a joke, which from her is the entire review."] },
                { label: "Keep going — let it get a little heated", gate: { inti: 4, rom: 35 }, roll: { dc: 14, win: { fx: { rom: 12, lib: 12, inti: 4 }, kiss: true, lines: ["The shoot tips. She drops the posing and just looks down the lens like it's you — because it is — and a couple frames in, the phone's face-down on the hood and it's not a shoot anymore."] }, lose: { fx: { rom: -5, aff: -3 }, lines: ["You push the angle and she clocks it and hands the phone back. \"Let's — keep these ones PG, yeah?\" Kindly. A line."] } }, sub: [
                  { label: "Phone down, hands on her, the car right there", gate: { inti: 6, rom: 45 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["\"Not on the hood of the car like a calendar,\" she laughs into your mouth. \"Inside it, maybe. Slow down.\" Not a no."] } } },
                  { label: "Steam it down to just kissing", fx: { rom: 9, lib: 7, inti: 3 }, lines: ["You put the phone all the way away and it stays just this — her against the warm hood, the city below, no documentation of any of it. Better that way."] },
                  { label: "Back up", back: true },
                ] },
                { label: "Back up", back: true },
              ] },
              { label: "Spicy — direct her, let her direct you", gate: { inti: 5, rom: 40 }, roll: { dc: 15, win: { fx: { rom: 13, lib: 14, inti: 5 }, kiss: true, lines: ["She runs it like she's done it in her head before — over the shoulder, a look that isn't for the internet — and about four frames in she takes the phone out of your hands entirely and that's the end of the shoot."] }, lose: { fx: { rom: -6, aff: -4 }, lines: ["It curdles; she lowers the phone. \"Okay — that's a lot faster than tonight is going.\" You ease all the way off. It half-recovers."] } }, sub: [
                { label: "Take it to the back seat", gate: { inti: 6, rom: 45 }, roll: { dc: 15, win: { sex: true }, lose: { fx: { rom: -6, aff: -4 }, lines: ["\"Slower,\" she says, hand flat on your chest, not removing it. \"We've got the whole car and the whole night.\""] } } },
                { label: "Leave it here — kiss her, no camera", fx: { rom: 10, lib: 8, inti: 3 }, lines: ["You set the phone on the dash, screen down, and it's just her and the cold and the lights and none of it recorded. She seems to like that you stopped there."] },
                { label: "Back up", back: true },
              ] },
              { label: "Back up", back: true },
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
      condom: { lines: ["You've got one; she watches you have it and the last bit of held breath goes out of her — the easy that only comes from not having to ask. After that the city's gone behind the fog and there's just the two of you and a car that was definitely not designed for this and neither of you caring.", "The overlook keeps its own counsel about the rest."], fx: { rom: 17, lib: 16, inti: 5, kiss: true } },
      raw: {
        dc: 14,
        win: { lines: ["She holds your eyes for the unasked question and answers it by pulling you the rest of the way back with her. It's close and certain and entirely mutual, the windows white with it, the city erased. After, she's folded against you in a space far too small for two people and not complaining about it once.", "The overlook keeps its own counsel about the rest."], fx: { rom: 19, lib: 18, inti: 6, kiss: true } },
        lose: { hard: true, fx: { rom: -11, aff: -7 }, lines: ["She stops your hand flat. \"No — not like that, not without.\" It's a line, not a mood, and you went over it. The fog on the glass goes from intimate to just cold, and the night with it."] },
      },
      back: { fx: { rom: 2, aff: 3 }, lines: ["You ease it back down to forehead-to-forehead in a too-small space, both of you breathing, the city slowly bleeding back through the clearing fog. \"…probably smart,\" she admits, not moving an inch."] },
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
    BACKGROUNDS, SAYS, MOVE, LINES, ITEMS, SHOPS, LOCATIONS, PHASES,
    CHARACTERS, BILL, DATE_SCENES, DATE_END, HOME, OVERLOOK, INTIMACY, PARTY, STAGES, TUNING,
  };
})();
