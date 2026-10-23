/* Local tone controls and a provider-independent instruction contract. No network calls. */
(function (root) {
  'use strict';
  const variants = Object.freeze(['funny', 'cheeky', 'wacky']);
  const isAmusing = tone => tone === 'drôle' || tone === 'amusant';
  const normalize = variant => variants.includes(variant) ? variant : 'funny';
  function context(pet, {tone, humorVariant, rubric, story, language = 'fr'} = {}) {
    const characteristics = root.AniMoiCharacteristics || (typeof require === 'function' ? require('./characteristics.js') : null);
    return {
      tone: isAmusing(tone) ? 'amusing' : tone,
      humorVariant: isAmusing(tone) ? normalize(humorVariant) : null,
      rubric, story, language,
      animal: characteristics.toAIContext(pet, language),
      instructions: {
        perspective: 'animal-first-person', preserveFacts: true, inventEvents: false,
        dominantTraitsTakePriority: true, listPersonalityTraits: false,
        coherentStyle: true, humorousEnding: isAmusing(tone),
        humorStyle: isAmusing(tone) ? {
          funny: 'Natural, gently cheeky humour with a funny ending.',
          cheeky: 'Confident, provocative voice with sharp but friendly quips.',
          wacky: 'Absurd, exaggerated theatrical presentation of the supplied facts only; never invent real events.'
        }[normalize(humorVariant)] : null
      }
    };
  }
  // These are demonstrative closing lines, not AI rewriting or invented events.
  const endings = {
    fr: ['Mon humain a sa version. Moi, j’ai le dernier mot. 😏', 'Mon humain peut toujours négocier. Je reste la direction. 😎', 'SCANDALE À PATTES ! À ce rythme, même une virgule mérite son édition spéciale. 🎭'],
    en: ['My human has their version. I get the last word. 😏', 'My human can negotiate. I am still in charge. 😎', 'PAW-SOME SCANDAL! At this rate, even a comma deserves a special edition. 🎭'],
    es: ['Mi humano tiene su versión. Yo tengo la última palabra. 😏', 'Mi humano puede negociar. Yo sigo al mando. 😎', '¡ESCÁNDALO CON PATAS! A este paso, hasta una coma merece una edición especial. 🎭'],
    de: ['Mein Mensch hat seine Version. Ich habe das letzte Wort. 😏', 'Mein Mensch darf verhandeln. Das Sagen habe immer noch ich. 😎', 'SKANDAL AUF PFOTEN! So verdient sogar ein Komma eine Sonderausgabe. 🎭'],
    it: ['Il mio umano ha la sua versione. Io ho l’ultima parola. 😏', 'Il mio umano può trattare. Il comando resta mio. 😎', 'SCANDALO A QUATTRO ZAMPE! Di questo passo, anche una virgola merita un’edizione speciale. 🎭']
  };
  function style(text, variant, language) {
    const locale = String(language || 'fr').split('-')[0];
    const parts = String(text).split('\n\n');
    // Replace only the local formatter's final closing paragraph, before hashtags.
    const last = parts.length - 1;
    const index = /^#/.test(parts[last]) ? last - 1 : last;
    if (index >= 0) parts[index] = (endings[locale] || endings.fr)[variants.indexOf(normalize(variant))];
    return parts.join('\n\n');
  }
  function mount(parent, id) {
    const doc = root.document, i18n = root.AniMoiI18n;
    const field = doc.createElement('fieldset'); field.id = id; field.className = 'humor-variants';
    field.append(i18n.bind(doc.createElement('legend'), 'humor.title'));
    for (const variant of variants) {
      const label = doc.createElement('label'), radio = doc.createElement('input');
      radio.type = 'radio'; radio.name = id; radio.value = variant; radio.checked = variant === 'funny';
      const words = doc.createElement('span');
      words.append(i18n.bind(doc.createElement('strong'), 'humor.' + variant), i18n.bind(doc.createElement('small'), 'humor.' + variant + 'Hint'));
      label.append(radio, words); field.append(label);
    }
    parent.append(field);
    return {element: field, get value() { return field.querySelector('input:checked').value; }, set value(value) { field.querySelector('input[value="' + normalize(value) + '"]').checked = true; }};
  }
  const api = {variants, isAmusing, normalize, context, style, mount};
  root.AniMoiHumor = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
