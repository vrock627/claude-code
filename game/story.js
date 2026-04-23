(function () {
  const scenes = {
    intro: {
      speaker: "",
      portrait: "🎑",
      text:
        "Friday evening. The autumn festival lights up the quad, and the friend who dragged you out bailed three minutes ago. You're holding a paper cup of cider and trying not to look lonely. Somewhere in this crowd, maybe, is someone worth meeting.",
      choices: [{ label: "Head in.", next: "hub" }],
    },

    hub: {
      speaker: "",
      portrait: "✨",
      text:
        "Three people catch your eye. Who do you approach?",
      choices: [
        {
          label: "The one with a stack of books near the library lanterns.",
          next: "aiko_1",
        },
        {
          label: "The barista calling drink orders like he's on stage.",
          next: "marco_1",
        },
        {
          label: "The quiet figure sketching by the fountain.",
          next: "ren_1",
        },
      ],
    },

    // ---- Aiko route ----
    aiko_1: {
      speaker: "Aiko",
      portrait: "📚",
      text:
        "She's balancing five hardbacks and a paper cup. One book slips — you catch it. The Remains of the Day. \"Oh — thank you. I, um. Hi.\"",
      choices: [
        {
          label: "\"Ishiguro fan? Good taste.\" (quiet)",
          next: "aiko_2",
          affection: { aiko: 1 },
        },
        {
          label: "\"DROPPED LIKE THE BASS!\" (loud)",
          next: "aiko_2",
          affection: { aiko: -1 },
        },
      ],
    },
    aiko_2: {
      speaker: "Aiko",
      portrait: "📚",
      text:
        "\"It's my favorite. Stevens spends his whole life repressing one feeling, and by the time he understands, it's too late. I find it... cautionary.\" She glances up at you.",
      choices: [
        {
          label: "\"Sounds like a warning.\"",
          next: "aiko_3",
          affection: { aiko: 1 },
        },
        {
          label: "\"Or romantic. The restraint.\"",
          next: "aiko_3",
          affection: { aiko: 1 },
        },
        {
          label: "\"I prefer books with dragons.\"",
          next: "aiko_3",
        },
      ],
    },
    aiko_3: {
      speaker: "Aiko",
      portrait: "📚",
      text:
        "\"I run a small book club. Saturdays, upstairs in the library. You could come.\" A pause. \"If you're not busy, I mean.\"",
      choices: [
        {
          label: "\"I have plans Saturday — but I'll cancel.\"",
          next: "aiko_4",
          affection: { aiko: 1 },
        },
        {
          label: "\"Saturday's tight. How about Sunday coffee instead?\"",
          next: "aiko_4",
          affection: { aiko: 1 },
        },
        {
          label: "\"Sounds nice. Maybe sometime.\"",
          next: "aiko_4",
        },
      ],
    },
    aiko_4: {
      speaker: "Aiko",
      portrait: "📚",
      text:
        "After some small talk, her voice drops. \"Can I tell you something? I present my thesis next week. I've been sick about it for a month. I don't usually tell people that.\"",
      choices: [
        {
          label: "\"I get terrified before every job interview. Every single one.\"",
          next: "aiko_5",
          affection: { aiko: 1 },
        },
        {
          label: "\"You'll do great. Picture everyone in their pajamas.\"",
          next: "aiko_5",
        },
      ],
    },
    aiko_5: {
      speaker: "Aiko",
      portrait: "📚",
      text:
        "Two weeks later, walking her home under streetlights. She stops. \"I'm not good at this. But I like you. I think I like you a lot. Is this... are we...?\"",
      resolve: {
        character: "aiko",
        threshold: 3,
        good: "ending_aiko_good",
        bad: "ending_aiko_bad",
      },
    },
    ending_aiko_good: {
      speaker: "",
      portrait: "💞",
      text:
        "You kiss her under the streetlight. She laughs — nervous, bright, disbelieving. Somewhere, a librarian's heart catalogs this moment in permanent collection. You spend the next semester trading margin notes in shared paperbacks.",
      ending: { character: "aiko", type: "good" },
    },
    ending_aiko_bad: {
      speaker: "",
      portrait: "🥀",
      text:
        "You hesitate too long. She reads it as an answer. \"Right. Of course. I — I should go.\" Later, at the library, you see her turn down an aisle to avoid you. The book she lent you stays on your shelf, unread.",
      ending: { character: "aiko", type: "bad" },
    },

    // ---- Marco route ----
    marco_1: {
      speaker: "Marco",
      portrait: "☕",
      text:
        "He's behind a pop-up coffee bar, narrating every drink like a game show. \"ONE hazelnut latte for MIKA — she's fighting the cold and WINNING!\" He spots you. \"You! Order and name, let's go.\"",
      choices: [
        { label: "\"Black coffee. I'm you.\"", next: "marco_2" },
        {
          label: "\"Surprise me.\"",
          next: "marco_2",
          affection: { marco: 1 },
        },
      ],
    },
    marco_2: {
      speaker: "Marco",
      portrait: "☕",
      text:
        "\"House party tomorrow at my place. Loud music, questionable snacks, suspicious punch. You in?\" He slides your drink over, eyes bright.",
      choices: [
        {
          label: "\"Wouldn't miss it.\"",
          next: "marco_3",
          affection: { marco: 1 },
        },
        {
          label: "\"Maybe. Depends who's going.\"",
          next: "marco_3",
        },
      ],
    },
    marco_3: {
      speaker: "Marco",
      portrait: "☕",
      text:
        "The party's loud. Marco's in his element — until someone knocks a drink across his record player. His face falls for half a second before the smile snaps back on.",
      choices: [
        {
          label: "\"Hey. You okay? I saw that.\"",
          next: "marco_4",
          affection: { marco: 1 },
        },
        {
          label: "\"Want me to kick them out? Joking. Mostly.\"",
          next: "marco_4",
          affection: { marco: 1 },
        },
        {
          label: "\"Your party, your problem.\"",
          next: "marco_4",
          affection: { marco: -1 },
        },
      ],
    },
    marco_4: {
      speaker: "Marco",
      portrait: "☕",
      text:
        "Two a.m. The last guests are gone. He's on the kitchen counter, uncharacteristically quiet. \"Everyone thinks I'm 'on' all the time. I don't always know who I am when I'm not performing.\"",
      choices: [
        {
          label: "\"Then sit here with me. No audience.\"",
          next: "marco_5",
          affection: { marco: 1 },
        },
        {
          label: "\"You're the guy who knows everyone's order. That's you.\"",
          next: "marco_5",
        },
      ],
    },
    marco_5: {
      speaker: "Marco",
      portrait: "☕",
      text:
        "A week later, on his fire escape at sunset. No jokes this time. \"Look. I don't do serious. But you make me want to try serious. Tell me if I'm reading this wrong.\"",
      resolve: {
        character: "marco",
        threshold: 3,
        good: "ending_marco_good",
        bad: "ending_marco_bad",
      },
    },
    ending_marco_good: {
      speaker: "",
      portrait: "💞",
      text:
        "You pull him in. He laughs — surprised, real, not the stage version. You end up ordering terrible takeout and staying until the streetlights click off. Months later he still hasn't stopped making up names for your coffee order.",
      ending: { character: "marco", type: "good" },
    },
    ending_marco_bad: {
      speaker: "",
      portrait: "🥀",
      text:
        "You pull back. \"Marco — I think you're great. But I'm not ready for this.\" He nods. Performance smile back on within a second. The next time you visit the cafe, he's friendly. Professional. The drink has a stranger's name on it.",
      ending: { character: "marco", type: "bad" },
    },

    // ---- Ren route ----
    ren_1: {
      speaker: "Ren",
      portrait: "🎨",
      text:
        "They're sketching the fountain in graphite. You lean in; they don't look up. \"If you're about to ask 'what is it,' save it.\"",
      choices: [
        {
          label: "\"It's the negative space between the water and the air. Right?\"",
          next: "ren_2",
          affection: { ren: 1 },
        },
        {
          label: "\"It's a fountain. I'm not blind.\"",
          next: "ren_2",
        },
      ],
    },
    ren_2: {
      speaker: "Ren",
      portrait: "🎨",
      text:
        "They flip to an earlier page — a portrait of someone weeping, in deep reds and black. \"Tell me what this is. Honestly. I'm tired of people being polite.\"",
      choices: [
        {
          label: "\"Grief. And you're angry at whoever caused it.\"",
          next: "ren_3",
          affection: { ren: 1 },
        },
        {
          label: "\"It's beautiful.\" (the polite answer)",
          next: "ren_3",
          affection: { ren: -1 },
        },
        {
          label: "\"I don't know. But I can't stop looking at it.\"",
          next: "ren_3",
          affection: { ren: 1 },
        },
      ],
    },
    ren_3: {
      speaker: "Ren",
      portrait: "🎨",
      text:
        "A week later. \"There's a showcase Friday. My work's up against Eitan's — the professor's favorite. Everyone expects me to lose.\" A brittle shrug. \"I don't know why I'm telling you.\"",
      choices: [
        {
          label: "\"Because you want someone in the room rooting for you.\"",
          next: "ren_4",
          affection: { ren: 1 },
        },
        {
          label: "\"Eitan's work is safe. Yours isn't. That matters.\"",
          next: "ren_4",
          affection: { ren: 1 },
        },
        {
          label: "\"It's just a showcase. Don't spiral.\"",
          next: "ren_4",
          affection: { ren: -1 },
        },
      ],
    },
    ren_4: {
      speaker: "Ren",
      portrait: "🎨",
      text:
        "After the showcase — they placed second. Back in their studio at midnight. \"I don't know if I'm any good. I don't know if I'll ever be. And the not-knowing is eating me.\"",
      choices: [
        {
          label: "\"Then stop trying to know. Just make the next thing.\"",
          next: "ren_5",
          affection: { ren: 1 },
        },
        {
          label: "\"You placed second out of fifty. That's an answer.\"",
          next: "ren_5",
        },
      ],
    },
    ren_5: {
      speaker: "Ren",
      portrait: "🎨",
      text:
        "They set down the charcoal. \"I don't fall for people. I'm telling you that because I'm falling for you and I don't know what to do with it. So. Do something with it.\"",
      resolve: {
        character: "ren",
        threshold: 3,
        good: "ending_ren_good",
        bad: "ending_ren_bad",
      },
    },
    ending_ren_good: {
      speaker: "",
      portrait: "💞",
      text:
        "You step closer and kiss them. Later, in a letter folded into a book they lend you, they'll write: \"I drew you from memory three times before I saw you again.\" You don't always understand them. You try anyway.",
      ending: { character: "ren", type: "good" },
    },
    ending_ren_bad: {
      speaker: "",
      portrait: "🥀",
      text:
        "You open your mouth and nothing right comes out. They nod, once. \"Okay. Noted.\" The next time you walk past the fountain, someone else is sitting there. A year later, you see one of their pieces in a gallery and wonder if the figure in the background is you.",
      ending: { character: "ren", type: "bad" },
    },
  };

  const characters = {
    aiko: { name: "Aiko", portrait: "📚", color: "#a8c7e6" },
    marco: { name: "Marco", portrait: "☕", color: "#e6b388" },
    ren: { name: "Ren", portrait: "🎨", color: "#c7a8e6" },
  };

  window.STORY = { scenes, characters, startScene: "intro" };
})();
