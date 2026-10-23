const {test} = require('node:test');
const assert = require('node:assert/strict');
const publications = require('../v2-preview/caption.js');

const species = ['Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'];
const expected = {
  fr: ['VieDAnimal', 'Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'],
  en: ['AnimalLife', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Horse', 'Fish', 'Hamster', 'Other'],
  es: ['VidaAnimal', 'Perro', 'Gato', 'Pajaro', 'Conejo', 'Caballo', 'Pez', 'Hamster', 'Otro'],
  de: ['Tierleben', 'Hund', 'Katze', 'Vogel', 'Kaninchen', 'Pferd', 'Fisch', 'Hamster', 'Andere'],
  it: ['VitaAnimale', 'Cane', 'Gatto', 'Uccello', 'Coniglio', 'Cavallo', 'Pesce', 'Criceto', 'Altro']
};
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tags = value => [...value.matchAll(/(^|[^\p{L}\p{M}\p{N}_/:#])(#[\p{L}\p{M}\p{N}_]+)/gu)].map(match => match[2]);
const defaults = (locale, index) => ['#Animoi', '#' + expected[locale][0], '#' + expected[locale][index + 1]];

for (const locale of Object.keys(expected)) {
  species.forEach((animalSpecies, index) => {
    test(`${locale}/${animalSpecies}: generation consolidates an inline species tag below the statement without duplicates`, () => {
      const proposed = defaults(locale, index);
      const source = `Mon humain raconte ${proposed[2]} dans le jardin, avec #MonClub.`;
      const input = source + '\n\n' + proposed.join(' ') + ' #MonAutreTag';
      const result = publications.withDefaultHashtags(input, animalSpecies, locale);
      assert.equal(result.split('\n').at(-1), proposed.join(' ') + ' #MonAutreTag');
      assert(result.startsWith(source.replace(proposed[2], proposed[2].slice(1))), 'the source paragraph must retain every word when its hashtag moves below the statement');
      assert(result.includes('#MonClub.'));
      for (const tag of proposed) assert.equal(tags(result).filter(value => normalize(value) === normalize(tag)).length, 1);
      assert.equal(publications.withDefaultHashtags(result, animalSpecies, locale), result, 'generation is idempotent');
    });

    test(`${locale}/${animalSpecies}: voluntary recovery only appends missing suggestions and preserves the historical prefix`, () => {
      const proposed = defaults(locale, index);
      const original = 'Histoire originale.  \r\n\r\n' + proposed[0] + ' #MonClub  \r\n';
      const result = publications.restoreSuggestedHashtags(original, animalSpecies, locale);
      assert(result.startsWith(original), 'recovery must retain every original character, including CRLF and trailing spaces');
      assert.deepEqual(tags(result.slice(original.length)), proposed.slice(1));
      assert.deepEqual(tags(result), [proposed[0], '#MonClub', ...proposed.slice(1)]);
      assert.equal(publications.restoreSuggestedHashtags(result, animalSpecies, locale), result, 'recovery is idempotent');
    });
  });
}

test('generation keeps the first personal spelling when moving duplicate defaults to the terminal block', () => {
  const source = 'Mon #CHIEN joue avec #MonClub. Voir https://exemple.test/#Chien et mot#Chien.';
  const input = source + '\n\n#Animoi #VieDAnimal #Chien #MonAutreTag';
  const result = publications.withDefaultHashtags(input, 'Chien', 'fr');
  assert.equal(result.split('\n').at(-1), '#Animoi #VieDAnimal #CHIEN #MonAutreTag');
  assert(result.startsWith(source.replace('#CHIEN', 'CHIEN')));
  assert(result.includes('https://exemple.test/#Chien'));
  assert(result.includes('mot#Chien'));
  assert.deepEqual(tags(result), ['#MonClub', '#Animoi', '#VieDAnimal', '#CHIEN', '#MonAutreTag']);
});

test('generation consolidates all three default roles without rewriting unrelated prose or hashtags', () => {
  const source = 'Mon #ANIMOI vit sa #VIEDANIMAL avec #CHIEN. #MaMarque reste ici.';
  const input = source + '\n\n#Animoi #VieDAnimal #Chien #MonClub';
  const result = publications.withDefaultHashtags(input, 'Chien', 'fr');
  assert(result.startsWith(source.replace('#ANIMOI', 'ANIMOI').replace('#VIEDANIMAL', 'VIEDANIMAL').replace('#CHIEN', 'CHIEN')));
  assert.equal(result.split('\n').at(-1), '#ANIMOI #VIEDANIMAL #CHIEN #MonClub');
  assert.deepEqual(tags(result), ['#MaMarque', '#ANIMOI', '#VIEDANIMAL', '#CHIEN', '#MonClub']);
});

test('a source-story species hashtag remains the author choice after consolidation and language changes', () => {
  const source = 'Mon #Chien raconte sa promenade.';
  const text = publications.withDefaultHashtags(source + '\n\n#Animoi #VieDAnimal #Chien', 'Chien', 'fr');
  const draft = publications.createHashtagDraft(text, 'Chien', 'fr', source);
  assert.deepEqual(draft.owned, {life: '#VieDAnimal'});
  const english = publications.updateHashtagDraft(text, draft, 'en');
  assert.equal(english.text.split('\n').at(-1), '#Animoi #AnimalLife #Chien');
  assert.deepEqual(english.draft.owned, {life: '#AnimalLife'});
});

test('two generation passes preserve personal terminal spellings and all words from the source story', () => {
  const source = 'Mon #CHIEN raconte sa #VIEDANIMAL avec mon humain.';
  const once = publications.withDefaultHashtags(source + '\n\n#Animoi #VieDAnimal #Chien', 'Chien', 'fr');
  const twice = publications.withDefaultHashtags(once, 'Chien', 'fr');
  assert.equal(once, 'Mon CHIEN raconte sa VIEDANIMAL avec mon humain.\n\n#Animoi #VIEDANIMAL #CHIEN');
  assert.equal(twice, once);
  const draft = publications.createHashtagDraft(twice, 'Chien', 'fr', source);
  assert.deepEqual(draft.owned, {});
  assert.equal(publications.updateHashtagDraft(twice, draft, 'en').text, twice);
});

test('case-insensitive source-story life and species choices are never claimed or translated', () => {
  const source = 'Ma #VIEDANIMAL avec #CHIEN et #MaMarquePerso.';
  const text = publications.withDefaultHashtags(source + '\n\n#Animoi #VieDAnimal #Chien', 'Chien', 'fr');
  const draft = publications.createHashtagDraft(text, 'Chien', 'fr', source);
  assert.deepEqual(draft.owned, {});
  for (const locale of ['en', 'es', 'de', 'it']) {
    assert.equal(publications.updateHashtagDraft(text, draft, locale).text, text);
  }
  assert(text.includes('#MaMarquePerso'));
});

test('URL and word fragments in a source story do not prevent automatic translation of genuine suggestions', () => {
  const source = 'Lien https://exemple.test/#Chien ; mot#VieDAnimal ; vraie #MaMarque.';
  const text = publications.withDefaultHashtags(source, 'Chien', 'fr');
  const draft = publications.createHashtagDraft(text, 'Chien', 'fr', source);
  assert.deepEqual(draft.owned, {life: '#VieDAnimal', species: '#Chien'});
  const english = publications.updateHashtagDraft(text, draft, 'en');
  assert.equal(english.text, source + '\n\n#Animoi #AnimalLife #Dog');
});

test('omitting sourceStory keeps the existing draft-ownership contract', () => {
  const text = 'Texte.\n\n#Animoi #VieDAnimal #Chien #MaMarque';
  assert.deepEqual(publications.createHashtagDraft(text, 'Chien', 'fr').owned, {life: '#VieDAnimal', species: '#Chien'});
});

test('recovery returns the exact original value when all suggestions already exist with personal spelling', () => {
  const original = 'Mon #CHIEN reste dans le récit. \r\n\r\n#ANIMOI #VIEDANIMAL #MaMarque  \r\n ';
  assert.equal(publications.restoreSuggestedHashtags(original, 'Chien', 'fr'), original);
});

test('recovery does not translate existing tags when another interface language supplies missing defaults', () => {
  const original = 'Histoire.\n\n#Animoi #VieDAnimal #Chien #MaMarque';
  const result = publications.restoreSuggestedHashtags(original, 'Chien', 'en');
  assert(result.startsWith(original));
  assert.deepEqual(tags(result.slice(original.length)), ['#AnimalLife', '#Dog']);
  assert.equal(publications.restoreSuggestedHashtags(result, 'Chien', 'en'), result);
});

test('recovery recognizes real hashtags while preserving URL and word fragments unchanged', () => {
  const original = 'Liens https://exemple.test/#Animoi et https://exemple.test/#Chien ; mot#VieDAnimal.\r\n#MaMarque  ';
  const result = publications.restoreSuggestedHashtags(original, 'Chien', 'fr');
  assert(result.startsWith(original));
  assert.deepEqual(tags(result.slice(original.length)), ['#Animoi', '#VieDAnimal', '#Chien']);
  assert.deepEqual(tags(result), ['#MaMarque', '#Animoi', '#VieDAnimal', '#Chien']);
});

test('recovery leaves pre-existing duplicate and custom hashtags intact and creates no additional duplicates', () => {
  const original = 'Texte.\r\n#Animoi #ANIMOI #MonClub #MonClub #Chien';
  const result = publications.restoreSuggestedHashtags(original, 'Chien', 'fr');
  assert(result.startsWith(original));
  assert.deepEqual(tags(result.slice(original.length)), ['#VieDAnimal']);
  assert.deepEqual(tags(result), ['#Animoi', '#ANIMOI', '#MonClub', '#MonClub', '#Chien', '#VieDAnimal']);
});
