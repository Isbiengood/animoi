const {test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../v2-preview/i18n.js');
for (const locale of ['fr', 'en', 'es', 'de', 'it']) require('../v2-preview/locales/' + locale + '.js');
const publications = require('../v2-preview/caption.js');
beforeEach(() => i18n.setLocale('fr'));
afterEach(() => i18n.setLocale('fr'));

test('French initial hashtags contain the canonical brand, animal life and one of eight species', () => {
  for (const species of ['Chien','Chat','Oiseau','Lapin','Cheval','Poisson','Hamster','Autre']) {
    assert.equal(publications.defaultHashtags(species, 'fr'), '#Animoi #VieDAnimal #' + species);
  }
  assert.equal(publications.defaultHashtags('reptile historique', 'fr'), '#Animoi #VieDAnimal #Autre');
  assert.equal(publications.defaultHashtags(' oiseaux ', 'fr'), '#Animoi #VieDAnimal #Oiseau');
});

test('generation proposes defaults once and preserves additional tags and story paragraphs', () => {
  const initial = 'Mon aventure\n\nJe garde mon texte.\n\n#AniMoi #VieDAnimal #MonAventure';
  const expected = 'Mon aventure\n\nJe garde mon texte.\n\n#Animoi #VieDAnimal #Chat #MonAventure';
  assert.equal(publications.withDefaultHashtags(initial, 'Chat'), expected);
  assert.equal(publications.withDefaultHashtags(expected, 'Chat'), expected);
  assert.equal(publications.withDefaultHashtags('', 'Lapin'), '#Animoi #VieDAnimal #Lapin');
});

test('final text can freely omit every proposed tag without reintroducing defaults', () => {
  const final = 'Mon texte corrigé.\n\n#MonChoix';
  assert.equal(publications.dedupeHashtags(final), final);
  assert.equal(publications.dedupeHashtags('Texte sans hashtag.'), 'Texte sans hashtag.');
  assert.equal(publications.dedupeHashtags(''), '');
});

test('duplicate hashtags are removed case/accent-insensitively without deleting surrounding prose', () => {
  assert.equal(publications.dedupeHashtags('Je suis #Curieux et calme.\n\n#Animoi #VieDAnimal #Chat #animoi #CHAT'), 'Je suis #Curieux et calme.\n\n#Animoi #VieDAnimal #Chat');
  assert.equal(publications.dedupeHashtags('Un #Été puis #ete et ma promenade.'), 'Un #Été puis et ma promenade.');
  assert.equal(publications.dedupeHashtags('Texte  avec  espaces.\n\n#犬 #犬 #Chat'), 'Texte  avec  espaces.\n\n#犬 #Chat');
});

test('duplicate detection preserves URL fragments, word fragments and decomposed accents', () => {
  const body = 'Lien https://exemple.test/#Chat puis https://autre.test/#Chat ; mot#Chat.';
  assert.equal(publications.dedupeHashtags(body + '\n\n#Chat #chat'), body + '\n\n#Chat');
  assert.equal(publications.dedupeHashtags('#Été #E\u0301te #été'), '#Été');
});

test('confident offline language clues identify five supported languages independently of UI', () => {
  const stories = {
    fr: 'Mon humain voulait continuer la promenade mais il pleuvait très fort ce matin.',
    en: 'My human wanted to go for a walk but it was raining this morning.',
    es: 'Mi humano queria continuar el paseo pero estaba lloviendo mucho hoy.',
    de: 'Mein Mensch wollte weiter spazieren gehen aber es hat heute geregnet.',
    it: 'Il mio umano voleva continuare la passeggiata ma pioveva molto questa mattina.'
  };
  for (const [locale, story] of Object.entries(stories)) {
    assert.equal(publications.detectLanguage(story, locale === 'fr' ? 'en' : 'fr'), locale, locale);
  }
});

test('short, ambiguous, unknown and mixed anecdotes fall back without changing the original text', () => {
  for (const text of ['', 'Malicia', 'Bonjour Malicia !', 'Chat chien lapin hamster poisson cheval', '123 456 🐾', 'Rocket enjoys exploring strange planets beyond distant galaxies.']) {
    assert.equal(publications.detectLanguage(text, 'it'), 'it');
  }
  const mixed = 'My human wanted to walk but mon humain voulait marcher dans la promenade.';
  assert.equal(publications.detectLanguage(mixed, 'es'), 'es');
  assert.equal(publications.detectLanguage('Malicia', 'unsupported'), 'fr');
});

test('ambiguous edits preserve valid historical language tags, including und and languages outside UI catalogues', () => {
  for (const fallback of ['pt-BR', 'und', 'en-US', 'zh-Hant']) {
    assert.equal(publications.detectLanguage('Obrigado, humano!', fallback), fallback);
    assert.equal(publications.detectLanguage('#Animoi #VieDAnimal #Chien #Personnel', fallback), fallback);
  }
  for (const invalid of [null, '', 'unsupported', '<script>', 'pt BR', 'FR', 'pt-', 42]) {
    assert.equal(publications.detectLanguage('Coucou !', invalid), 'fr');
  }
  assert.equal(publications.detectLanguage('My human wanted to go for a walk but it was raining this morning.', 'pt-BR'), 'en');
});

test('native text sharing is immediate and includes exact final text and hashtags, never a private URL or image', async () => {
  let call, invoked = false;
  const task = publications.shareText('Mon aventure.\n\n#Animoi #VieDAnimal #Chien', {
    navigator: {share: data => { invoked = true; call = data; return Promise.resolve(); }, clipboard: {writeText: () => assert.fail('No clipboard on successful native share')}}
  });
  assert.equal(invoked, true);
  assert.equal(await task, 'shared');
  assert.deepEqual(call, {title:'Ani’Moi', text:'Mon aventure.\n\n#Animoi #VieDAnimal #Chien'});
});

test('no Web Share uses clipboard with the edited text and does not restore deleted hashtags', async () => {
  let copied;
  const feedback = {textContent:'', setAttribute(){}, removeAttribute(){}};
  assert.equal(await publications.shareText('Texte retouché.\n\n#Personnel', {
    navigator: {clipboard: {writeText: async text => {copied = text;}}}, feedback
  }), 'copied');
  assert.equal(copied, 'Texte retouché.\n\n#Personnel');
  assert.equal(feedback.textContent, 'Texte et hashtags copiés.');
});

test('native cancellation remains silent and never copies or modifies the publication', async () => {
  const feedback = {textContent:'Avant'};
  assert.equal(await publications.shareText('Texte #Chat', {
    navigator: {share: async () => {throw Object.assign(new Error('cancelled'), {name:'AbortError'});}, clipboard: {writeText: () => assert.fail('No clipboard after cancellation')}}, feedback
  }), 'cancelled');
  assert.equal(feedback.textContent, 'Avant');
});

test('native denial or other failure falls back to clipboard, preserving text plus hashtags', async () => {
  let copied;
  assert.equal(await publications.shareText('Mon texte #Chat #chat', {
    navigator: {share: async () => {throw Object.assign(new Error('denied'), {name:'NotAllowedError'});}, clipboard: {writeText: async text => {copied = text;}}}
  }), 'copied');
  assert.equal(copied, 'Mon texte #Chat');
});

test('clipboard denial selects the existing editor for manual copy and provides accessible feedback', async () => {
  const calls = [];
  const feedback = {textContent:'', setAttribute:(...args) => calls.push(args), removeAttribute(){}};
  assert.equal(await publications.copyText('Texte #Chat', {
    navigator: {clipboard: {writeText: async () => {throw new Error('clipboard denied');}}},
    editor: {focus:() => calls.push('focus'), select:() => calls.push('select')}, feedback
  }), 'manual');
  assert(calls.includes('focus')); assert(calls.includes('select'));
  assert(calls.some(call => Array.isArray(call) && call[0] === 'aria-live' && call[1] === 'polite'));
  assert.equal(feedback.textContent, 'Sélectionnez puis copiez le texte et ses hashtags.');
});

test('empty text triggers neither native share nor clipboard', async () => {
  const navigator = {share:() => assert.fail('no empty share'), clipboard:{writeText:() => assert.fail('no empty clipboard')}};
  assert.equal(await publications.shareText(' \n ', {navigator}), 'empty');
  assert.equal(await publications.copyText('', {navigator}), 'empty');
});
