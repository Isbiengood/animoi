const {test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const i18n = require('../v2-preview/i18n.js');
for (const locale of ['fr', 'en', 'es', 'de', 'it']) require('../v2-preview/locales/' + locale + '.js');
const publications = require('../v2-preview/caption.js');
beforeEach(() => i18n.setLocale('fr'));
afterEach(() => i18n.setLocale('fr'));

const species = ['Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'];
const keys = ['dog', 'cat', 'bird', 'rabbit', 'horse', 'fish', 'hamster', 'other'];
const expected = {
  fr: ['VieDAnimal', 'Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'],
  en: ['AnimalLife', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Horse', 'Fish', 'Hamster', 'Other'],
  es: ['VidaAnimal', 'Perro', 'Gato', 'Pajaro', 'Conejo', 'Caballo', 'Pez', 'Hamster', 'Otro'],
  de: ['Tierleben', 'Hund', 'Katze', 'Vogel', 'Kaninchen', 'Pferd', 'Fisch', 'Hamster', 'Andere'],
  it: ['VitaAnimale', 'Cane', 'Gatto', 'Uccello', 'Coniglio', 'Cavallo', 'Pesce', 'Criceto', 'Altro']
};
function proposed(locale, index) {
  return '#Animoi #' + expected[locale][0] + ' #' + expected[locale][index + 1];
}

test('each of the five catalogues owns its life and eight species hashtag labels', () => {
  for (const [locale, values] of Object.entries(expected)) {
    let messages;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../v2-preview/locales/' + locale + '.js'), 'utf8'), {
      AniMoiI18n: {register(code, catalogue) {assert.equal(code, locale); messages = catalogue;}}
    });
    for (const [index, key] of ['hashtags.life', ...keys.map(key => 'hashtags.species.' + key)].entries()) {
      assert(Object.hasOwn(messages, key), locale + ' must define its own ' + key);
      assert.equal(typeof messages[key], 'string');
      assert.equal(messages[key].replace(/^#/, ''), values[index]);
    }
  }
});

for (const locale of Object.keys(expected)) {
  test(locale + ' proposes its own three hashtags for all eight species', () => {
    species.forEach((animalSpecies, index) => {
      const value = publications.defaultHashtags(animalSpecies, locale);
      assert.equal(value, proposed(locale, index));
      assert.deepEqual(value.split(' ').slice(0, 1), ['#Animoi']);
      assert.equal(new Set(value.toLowerCase().split(' ')).size, 3);
    });
    assert.equal(publications.defaultHashtags('ancienne espèce inconnue', locale), proposed(locale, 7));
  });
}

test('omitted locale follows the selected interface and explicit locale does not mutate it', () => {
  for (const locale of Object.keys(expected)) {
    i18n.setLocale(locale);
    assert.equal(publications.defaultHashtags('Chien'), proposed(locale, 0));
    assert.equal(publications.withDefaultHashtags('Anecdote conservée.', 'Chien'), 'Anecdote conservée.\n\n' + proposed(locale, 0));
  }
  i18n.setLocale('de');
  assert.equal(publications.defaultHashtags('Chat', 'en'), proposed('en', 1));
  assert.equal(publications.withDefaultHashtags('Text remains unchanged.', 'Chat', 'es'), 'Text remains unchanged.\n\n' + proposed('es', 1));
  assert.equal(i18n.locale, 'de');
});

test('regional locale uses its supported base and unsupported locale falls back to French', () => {
  i18n.setLocale('it');
  for (const [regional, base] of [['en-US', 'en'], ['de-DE', 'de'], ['es-ES', 'es'], ['it-IT', 'it'], ['fr-FR', 'fr']]) {
    assert.equal(publications.defaultHashtags('Cheval', regional), proposed(base, 4));
  }
  assert.equal(publications.defaultHashtags('Chat', 'pt-BR'), proposed('fr', 1));
  assert.equal(publications.defaultHashtags('Chat', 'invalid'), proposed('fr', 1));
  assert.equal(i18n.locale, 'it');
});

test('story language is independent from interface hashtag proposals and original anecdote is untouched', () => {
  const story = 'My human wanted to go for a walk but it was raining this morning.';
  assert.equal(publications.detectLanguage(story, 'fr'), 'en');
  assert.equal(publications.withDefaultHashtags(story, 'Chien', 'fr'), story + '\n\n' + proposed('fr', 0));
  const spanish = 'Mi humano queria continuar el paseo pero estaba lloviendo mucho hoy.';
  i18n.setLocale('de');
  assert.equal(publications.detectLanguage(spanish, i18n.locale), 'es');
  assert.equal(publications.withDefaultHashtags(spanish, 'Chat'), spanish + '\n\n' + proposed('de', 1));
});

test('browser language or country preferences cannot override the selected interface', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {language: 'en-US', languages: ['en-US', 'en'], country: 'US'}});
    i18n.setLocale('fr');
    assert.equal(publications.defaultHashtags('Poisson'), proposed('fr', 5));
    assert.equal(publications.withDefaultHashtags('Mon récit.', 'Poisson'), 'Mon récit.\n\n' + proposed('fr', 5));
    i18n.setLocale('es');
    assert.equal(publications.defaultHashtags('Poisson'), proposed('es', 5));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});

test('generation proposes each localized block once and retains user-added tags and prose', () => {
  for (const locale of Object.keys(expected)) {
    const initial = 'Mon anecdote reste identique.\n\n' + proposed(locale, 0) + ' #MaBalade';
    const once = publications.withDefaultHashtags(initial, 'Chien', locale);
    assert.equal(once, initial);
    assert.equal(publications.withDefaultHashtags(once, 'Chien', locale), once);
  }
});

test('changing the interface never translates, reinserts or replaces authored hashtags during editing or sharing', async () => {
  const historical = 'Je garde ma publication.\n\n#Animoi #VieDAnimal #Chien #MaBalade';
  const edited = 'Je garde seulement mes choix.\n\n#MaBalade #MarquePersonnelle';
  for (const locale of Object.keys(expected)) {
    i18n.setLocale(locale);
    assert.equal(publications.dedupeHashtags(historical), historical);
    assert.equal(publications.dedupeHashtags(edited), edited);
    let shared, copied;
    assert.equal(await publications.shareText(edited, {navigator: {share: async data => {shared = data.text;}}}), 'shared');
    assert.equal(shared, edited);
    assert.equal(await publications.copyText(historical, {navigator: {clipboard: {writeText: async text => {copied = text;}}}}), 'copied');
    assert.equal(copied, historical);
  }
});

test('draft ownership is limited to exact generated life/species tokens in a terminal hashtag block', () => {
  const text = 'Mon récit #Chien reste intact.\n\n#Animoi #VieDAnimal #Chien #MonClub';
  const draft = publications.createHashtagDraft(text, 'Chien', 'fr');
  assert.equal(draft.animalSpecies, 'Chien');
  assert.deepEqual(draft.owned, {life: '#VieDAnimal', species: '#Chien'});
  assert(!Object.hasOwn(draft.owned, 'brand'));
  assert.deepEqual(publications.createHashtagDraft('Texte #VieDAnimal #Chien.', 'Chien', 'fr').owned, {});
  assert.deepEqual(publications.createHashtagDraft('Texte.\n\n#Animoi #viedanimal #CHIEN', 'Chien', 'fr').owned, {});
  assert.deepEqual(publications.createHashtagDraft('Texte.\n\n#Animoi #VieDAnimal', 'Chien', 'fr').owned, {life: '#VieDAnimal'});
});

test('language changes update only the generated common hashtags and preserve prose, brand and custom tags', () => {
  const body = 'Texte à conserver mot pour mot.';
  const initial = body + '\n\n' + proposed('fr', 0) + ' #MonClub';
  const originalDraft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  let current = {text: initial, draft: originalDraft};
  for (const locale of ['en', 'es', 'de', 'it', 'fr']) {
    current = publications.updateHashtagDraft(current.text, current.draft, locale);
    assert.equal(current.text, body + '\n\n' + proposed(locale, 0) + ' #MonClub');
    assert.deepEqual(current.draft.owned, {life: '#' + expected[locale][0], species: '#' + expected[locale][1]});
  }
  assert.deepEqual(originalDraft.owned, {life: '#VieDAnimal', species: '#Chien'});
  assert.equal(initial, body + '\n\n' + proposed('fr', 0) + ' #MonClub');
});

test('deleting all proposed tags including the brand never reinserts them on later language changes', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0);
  const initialDraft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const edited = 'Mon récit conservé sans aucun hashtag.';
  let current = {text: edited, draft: publications.observeHashtagDraft(edited, initialDraft)};
  assert.deepEqual(current.draft.owned, {});
  for (const locale of ['en', 'es', 'de', 'it', 'fr']) {
    current = publications.updateHashtagDraft(current.text, current.draft, locale);
    assert.equal(current.text, edited);
    assert.deepEqual(current.draft.owned, {});
  }
});

test('renamed common hashtags and a renamed brand become permanent author choices', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const edited = 'Mon récit.\n\n#MaMarque #MonJournal #MonCompagnon';
  const observed = publications.observeHashtagDraft(edited, draft);
  assert.deepEqual(observed.owned, {});
  for (const locale of Object.keys(expected)) {
    assert.equal(publications.updateHashtagDraft(edited, observed, locale).text, edited);
  }
});

test('moving generated hashtags into prose relinquishes ownership even when their spelling is unchanged', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const moved = 'Mon #Chien vit sa #VieDAnimal chaque jour.\n\n#Animoi #MonClub';
  const observed = publications.observeHashtagDraft(moved, draft);
  assert.deepEqual(observed.owned, {});
  assert.equal(publications.updateHashtagDraft(moved, observed, 'en').text, moved);
  const withoutTerminalBlock = '#VieDAnimal #Chien\nMon récit se poursuit après mes hashtags.';
  assert.equal(publications.updateHashtagDraft(withoutTerminalBlock, draft, 'de').text, withoutTerminalBlock);
});

test('a deleted then manually re-added tag stays custom while remaining automatic tags follow the interface', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const withoutSpecies = 'Mon récit.\n\n#Animoi #VieDAnimal';
  const afterRemoval = publications.observeHashtagDraft(withoutSpecies, draft);
  assert.deepEqual(afterRemoval.owned, {life: '#VieDAnimal'});
  const readded = withoutSpecies + ' #Chien';
  const observed = publications.observeHashtagDraft(readded, afterRemoval);
  const updated = publications.updateHashtagDraft(readded, observed, 'en');
  assert.equal(updated.text, 'Mon récit.\n\n#Animoi #AnimalLife #Chien');
  assert.deepEqual(updated.draft.owned, {life: '#AnimalLife'});
});

test('an existing custom target wins a species collision, retains its case and never becomes automatic', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0) + ' #DOG';
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  let current = publications.updateHashtagDraft(initial, draft, 'en');
  assert.deepEqual(current.text.match(/#[\p{L}\p{N}_]+/gu), ['#Animoi', '#AnimalLife', '#DOG']);
  assert.deepEqual(current.draft.owned, {life: '#AnimalLife'});
  for (const locale of ['de', 'it', 'es', 'fr']) {
    current = publications.updateHashtagDraft(current.text, current.draft, locale);
    assert(current.text.includes('#DOG'));
    assert(!current.text.includes('#' + expected[locale][1]));
    assert(!Object.hasOwn(current.draft.owned, 'species'));
  }
});

test('a life-tag collision likewise preserves the custom target and relinquishes future translation', () => {
  const initial = 'Mon récit.\n\n' + proposed('fr', 0) + ' #ANIMALLIFE';
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const english = publications.updateHashtagDraft(initial, draft, 'en');
  assert.deepEqual(english.text.match(/#[\p{L}\p{N}_]+/gu), ['#Animoi', '#Dog', '#ANIMALLIFE']);
  assert.deepEqual(english.draft.owned, {species: '#Dog'});
  const italian = publications.updateHashtagDraft(english.text, english.draft, 'it');
  assert(italian.text.includes('#ANIMALLIFE')); assert(italian.text.includes('#Cane'));
  assert(!italian.text.includes('#VitaAnimale'));
});

test('an inline custom target is not removed or claimed when the generated target would collide', () => {
  const initial = 'Mon #DOG raconte son aventure.\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const current = publications.updateHashtagDraft(initial, draft, 'en');
  assert(current.text.startsWith('Mon #DOG raconte son aventure.'));
  assert.deepEqual(current.text.match(/#[\p{L}\p{N}_]+/gu), ['#DOG', '#Animoi', '#AnimalLife']);
  assert(!Object.hasOwn(current.draft.owned, 'species'));
});

test('URL fragments are neither translated nor mistaken for collisions with automatic hashtags', () => {
  const body = 'Lien https://exemple.test/#Dog ; récit conservé.';
  const initial = body + '\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const current = publications.updateHashtagDraft(initial, draft, 'en');
  assert.equal(current.text, body + '\n\n' + proposed('en', 0));
  assert.deepEqual(current.draft.owned, {life: '#AnimalLife', species: '#Dog'});
});

test('the next newly generated story uses the current interface independently of an earlier edited draft', () => {
  const initial = 'Ancien récit.\n\n' + proposed('fr', 0);
  const draft = publications.createHashtagDraft(initial, 'Chien', 'fr');
  const edited = 'Ancien récit.\n\n#MaMarque';
  const abandoned = publications.observeHashtagDraft(edited, draft);
  i18n.setLocale('de');
  assert.equal(publications.updateHashtagDraft(edited, abandoned).text, edited);
  const next = publications.withDefaultHashtags('Nouvelle histoire.', 'Chat');
  assert.equal(next, 'Nouvelle histoire.\n\n' + proposed('de', 1));
  assert.deepEqual(publications.createHashtagDraft(next, 'Chat').owned, {life: '#Tierleben', species: '#Katze'});
});
