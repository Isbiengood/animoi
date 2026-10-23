/* Authored local templates, not translation or a generative AI service.
 * The owner's anecdote is quoted; profile traits stay available as context,
 * never as an automatically printed list in a new publication.
 * Return plain text only; callers render it with textContent/value, never HTML.
 */
(function (root) {
  'use strict';
  const characteristics = root.AniMoiCharacteristics || (typeof module !== 'undefined' ? require('./characteristics.js') : null);
  const templates = {
    en: {
      intro: {
        'drôle':'OFFICIAL STATEMENT 🐾', 'sérieux':'AN IMPORTANT MATTER 🐾', 'triste':'A LITTLE MOMENT OF SADNESS 💜',
        'tendre':'HAPPINESS IS IN THE LITTLE THINGS ❤️', 'en colère':'I AM FILING A COMPLAINT! 😤',
        'dramatique':'A TRAGEDY IN THREE ACTS 🎭', 'philosophe':'THOUGHT OF THE DAY 🌿'
      },
      prefix: {pawbook:'Dear diary,', sav:'To the human complaints department,', linkedin:'Internal memo from the director of household operations,', potins:'EXCLUSIVE — Breaking news from the animal press:'},
      quote: 'Here is what my human says happened:',
      identity: (name, species) => `I am ${name}, ${species}. This is my side of the story.`,
      personality: traits => `My personality: ${traits}. I tell this adventure in my own way.`,
      ending: {
        'drôle':'I demand compensation in treats. No negotiations. 😂', 'sérieux':'I ask for this matter to be taken very seriously. 🐾',
        'triste':'I could use a little kindness today. 💜', 'tendre':'And after all that, I would not trade my human for anything. ❤️',
        'en colère':'I have notified the free paws union. 😤', 'dramatique':'My story continues next time… if my heart can bear it. 🎭',
        'philosophe':'Life is short: I will take time to sniff the roses. 🌿'
      },
      species: {Chien:'a dog', Chat:'a cat', Lapin:'a rabbit', Oiseau:'a bird', Cheval:'a horse', Poisson:'a fish', Hamster:'a hamster', Autre:'an animal'}
    },
    es: {
      intro: {
        'drôle':'COMUNICADO OFICIAL 🐾', 'sérieux':'UN ASUNTO IMPORTANTE 🐾', 'triste':'UN PEQUEÑO MOMENTO DE TRISTEZA 💜',
        'tendre':'LA FELICIDAD ESTÁ EN LAS PEQUEÑAS COSAS ❤️', 'en colère':'¡PRESENTO UNA RECLAMACIÓN! 😤',
        'dramatique':'TRAGEDIA EN TRES ACTOS 🎭', 'philosophe':'REFLEXIÓN DEL DÍA 🌿'
      },
      prefix: {pawbook:'Querido diario:', sav:'A la atención del departamento de reclamaciones de los humanos:', linkedin:'Nota interna de la dirección de operaciones domésticas:', potins:'EXCLUSIVA — La prensa animal revela:'},
      quote: 'Esto es lo que cuenta mi humano:',
      identity: (name, species) => `Soy ${name}, ${species}. Quiero contar mi versión de la historia.`,
      personality: traits => `Mi carácter: ${traits}. Cuento esta aventura a mi manera.`,
      ending: {
        'drôle':'Exijo una compensación en golosinas. Sin negociación. 😂', 'sérieux':'Pido que este asunto se tome muy en serio. 🐾',
        'triste':'Hoy me vendría bien un poco de cariño. 💜', 'tendre':'Y, a pesar de todo, no cambiaría a mi humano por nada del mundo. ❤️',
        'en colère':'He avisado al sindicato de las patas libres. 😤', 'dramatique':'Mi historia continuará… si mi corazón lo soporta. 🎭',
        'philosophe':'La vida es corta: me tomaré tiempo para oler las rosas. 🌿'
      },
      species: {Chien:'un perro', Chat:'un gato', Lapin:'un conejo', Oiseau:'un ave', Cheval:'un caballo', Poisson:'un pez', Hamster:'un hámster', Autre:'un animal'}
    },
    de: {
      intro: {
        'drôle':'OFFIZIELLE MITTEILUNG 🐾', 'sérieux':'EINE WICHTIGE ANGELEGENHEIT 🐾', 'triste':'EIN KLEINER MOMENT DER TRAURIGKEIT 💜',
        'tendre':'DAS GLÜCK LIEGT IN DEN KLEINEN DINGEN ❤️', 'en colère':'ICH REICHE BESCHWERDE EIN! 😤',
        'dramatique':'EINE TRAGÖDIE IN DREI AKTEN 🎭', 'philosophe':'GEDANKE DES TAGES 🌿'
      },
      prefix: {pawbook:'Liebes Tagebuch,', sav:'An die Beschwerdestelle für Menschen,', linkedin:'Interne Mitteilung der Leitung für häusliche Abläufe,', potins:'EXKLUSIV — Neues aus der Tierpresse:'},
      quote: 'So erzählt mein Mensch, was passiert ist:',
      identity: (name, species) => `Ich bin ${name}, ${species}. Hier ist meine Sicht der Geschichte.`,
      personality: traits => `Mein Charakter: ${traits}. Ich erzähle dieses Abenteuer auf meine eigene Art.`,
      ending: {
        'drôle':'Ich fordere Entschädigung in Leckerlis. Nicht verhandelbar. 😂', 'sérieux':'Ich bitte darum, diese Angelegenheit sehr ernst zu nehmen. 🐾',
        'triste':'Ein bisschen Zuneigung würde mir heute guttun. 💜', 'tendre':'Und trotzdem würde ich meinen Menschen gegen nichts auf der Welt eintauschen. ❤️',
        'en colère':'Ich habe die Gewerkschaft der freien Pfoten informiert. 😤', 'dramatique':'Meine Geschichte geht weiter… wenn mein Herz das aushält. 🎭',
        'philosophe':'Das Leben ist kurz: Ich nehme mir Zeit, an den Rosen zu schnuppern. 🌿'
      },
      species: {Chien:'ein Hund', Chat:'eine Katze', Lapin:'ein Kaninchen', Oiseau:'ein Vogel', Cheval:'ein Pferd', Poisson:'ein Fisch', Hamster:'ein Hamster', Autre:'ein Tier'}
    },
    it: {
      intro: {
        'drôle':'COMUNICATO UFFICIALE 🐾', 'sérieux':'UNA QUESTIONE IMPORTANTE 🐾', 'triste':'UN PICCOLO MOMENTO DI TRISTEZZA 💜',
        'tendre':'LA FELICITÀ È NELLE PICCOLE COSE ❤️', 'en colère':'PRESENTO UN RECLAMO! 😤',
        'dramatique':'TRAGEDIA IN TRE ATTI 🎭', 'philosophe':'PENSIERO DEL GIORNO 🌿'
      },
      prefix: {pawbook:'Caro diario,', sav:'All’attenzione dell’ufficio reclami degli umani,', linkedin:'Nota interna della direzione delle operazioni domestiche,', potins:'ESCLUSIVA — La stampa animale rivela:'},
      quote: 'Ecco come il mio umano racconta i fatti:',
      identity: (name, species) => `Sono ${name}, ${species}. Voglio raccontare la mia versione della storia.`,
      personality: traits => `Il mio carattere: ${traits}. Racconto questa avventura a modo mio.`,
      ending: {
        'drôle':'Esigo un risarcimento in bocconcini. Senza trattative. 😂', 'sérieux':'Chiedo che questa questione sia presa molto sul serio. 🐾',
        'triste':'Oggi mi farebbe bene un po’ di dolcezza. 💜', 'tendre':'E, nonostante tutto, non cambierei il mio umano per nulla al mondo. ❤️',
        'en colère':'Ho avvisato il sindacato delle zampe libere. 😤', 'dramatique':'La mia storia continua… se il mio cuore lo regge. 🎭',
        'philosophe':'La vita è breve: mi prenderò il tempo di annusare le rose. 🌿'
      },
      species: {Chien:'un cane', Chat:'un gatto', Lapin:'un coniglio', Oiseau:'un uccello', Cheval:'un cavallo', Poisson:'un pesce', Hamster:'un criceto', Autre:'un animale'}
    }
  };
  function format(pet, story, mood, rubric, language) {
    const locale = String(language || 'en').toLowerCase().split('-')[0];
    const words = templates[locale] || templates.en;
    const value = pet || {};
    const display = characteristics?.display(value, templates[locale] ? locale : 'en') || value;
    const name = String(value.name || '🐾');
    const species = words.species[value.species] || words.species.Autre;
    const selection = characteristics?.read(value).breed;
    const hasOrigin = selection ? characteristics.breedChoice(selection) === 'selected' &&
      (selection.ids.length || selection.custom.length || selection.legacyText) : !!value.breed;
    const detail = characteristics?.speciesDetail(value, templates[locale] ? locale : 'en');
    const breed = (hasOrigin || detail) && typeof display.breed === 'string' && display.breed.trim() ? ` (${display.breed})` : '';
    const sections = [
      words.intro[mood] || words.intro['drôle'],
      words.prefix[rubric] || words.prefix.pawbook,
      `${words.quote} « ${String(story ?? '')} »`,
      words.identity(name, species + breed)
    ];
    sections.push(words.ending[mood] || words.ending['drôle']);
    return sections.join('\n\n');
  }
  // Display compatibility only. Never rewrite historical post.text or remove
  // adjectives from an author's anecdote. Recognise the complete old template
  // frame before hiding its automatically inserted profile enumeration.
  const frenchReactions = [
    'Moi, je transforme chaque imprévu en terrain de jeu.',
    'Changer d’avis ? Je préfère défendre mon idée jusqu’au bout.',
    'Je préfère observer à l’abri avant de me lancer.',
    'Je prends le temps de savourer les petits moments.',
    'Il faut absolument que j’explore cette affaire.'
  ];
  const frenchTails = ['Je raconte cette aventure avec ma personnalité bien à moi.'];
  for (let mask = 1; mask < 32; mask++) frenchTails.push(frenchReactions.filter((_, index) => mask & (1 << index)).join(' '));
  // Prefer the complete reaction sequence over one of its shorter suffixes.
  frenchTails.sort((a, b) => b.length - a.length);
  const legacyFrames = {
    fr: {
      intro:['COMMUNIQUÉ OFFICIEL 🐾','UNE QUESTION IMPORTANTE 🐾','UN PETIT MOMENT DE MÉLANCOLIE 💜','LE BONHEUR EST DANS LES PETITS RIENS ❤️','JE DÉPOSE UNE RÉCLAMATION ! 😤','TRAGÉDIE EN TROIS ACTES 🎭','PENSÉE DU JOUR 🌿'],
      prefix:['Cher journal,','À l’attention du service réclamations des humains,','Note interne de la direction des opérations domestiques,','EXCLUSIVITÉ — La presse animalière révèle :'],
      quote:'Voici les faits selon mon humain :', identityStart:'Moi, ', identityEnd:'je tiens à faire entendre ma version.',
      label:'Mon caractère : ', tails:frenchTails,
      ending:['J’exige réparation sous forme de friandises. Sans négociation. 😂','Merci de prendre cette question très au sérieux. 🐾','Un peu de douceur me ferait du bien aujourd’hui. 💜','Et malgré tout, je ne changerais mon humain pour rien au monde. ❤️','Le syndicat des pattes libres a été prévenu. 😤','La suite au prochain épisode… si mon cœur le supporte. 🎭','La vie est courte : prenons le temps de renifler les roses. 🌿']
    }
  };
  const legacyLabels = {
    en:['My personality: ', 'I am ', 'This is my side of the story.', 'I tell this adventure in my own way.'],
    es:['Mi carácter: ', 'Soy ', 'Quiero contar mi versión de la historia.', 'Cuento esta aventura a mi manera.'],
    de:['Mein Charakter: ', 'Ich bin ', 'Hier ist meine Sicht der Geschichte.', 'Ich erzähle dieses Abenteuer auf meine eigene Art.'],
    it:['Il mio carattere: ', 'Sono ', 'Voglio raccontare la mia versione della storia.', 'Racconto questa avventura a modo mio.']
  };
  for (const [locale, [label, identityStart, identityEnd, tail]] of Object.entries(legacyLabels)) {
    const words = templates[locale];
    legacyFrames[locale] = {intro:Object.values(words.intro), prefix:Object.values(words.prefix), quote:words.quote, identityStart, identityEnd, label, tails:[tail], ending:Object.values(words.ending)};
  }
  function publicationText(value) {
    const source = String(value ?? '');
    // Keeping separators in this array preserves original CRLF, whitespace,
    // paragraphs and hashtags everywhere outside the recognised enumeration.
    const parts = source.split(/(\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*)/);
    const frame = Object.values(legacyFrames).find(words => words.intro.includes(parts[0]?.trim()) && words.prefix.includes(parts[2]?.trim()));
    if (!frame || !parts[4]?.startsWith(frame.quote + ' « ')) return source;
    for (let ending = parts.length - 1; ending >= 8; ending -= 2) {
      if (!frame.ending.includes(parts[ending].trim())) continue;
      const after = parts.slice(ending + 1).join('');
      if (after.trim() && !/^(?:\s*#[\p{L}\p{M}\p{N}_]+)*\s*$/u.test(after)) continue;
      // The anecdote may quote a complete older communiqué. Work backwards
      // from the outer conclusion so its quoted identity is never mistaken
      // for the identity of the current publication.
      for (let start = ending - 2; start >= 8; start -= 2) {
        const identity = parts[start - 2];
        const quote = parts.slice(4, start - 3).join('');
        if (!identity.startsWith(frame.identityStart) || !identity.endsWith(frame.identityEnd) || !quote.endsWith(' »')) continue;
        const block = parts.slice(start, ending - 1).join('');
        if (!block.startsWith(frame.label)) continue;
        // A closing anecdote quotation belongs to the story, never to the
        // automatic profile block. Do not cross it on a repeated projection.
        if (block.includes(' »')) continue;
        const tail = frame.tails.find(text => block.endsWith('. ' + text) && block.length > frame.label.length + text.length + 2);
        if (!tail) continue;
        parts.splice(start, ending - start - 1, tail);
        return parts.join('');
      }
    }
    return source;
  }
  const api = Object.freeze({format, publicationText});
  root.AniMoiStoryFormatter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
