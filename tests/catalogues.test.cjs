const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalogue = require('../v2-preview/catalogs/breeds.js');
const characteristics = require('../v2-preview/characteristics.js');

test('breed data records pinned source, licences and an offline attribution', () => {
  const source = catalogue.sources.find(item => item.id === 'vbo');
  assert.equal(source.license, 'CC-BY-4.0');
  assert.match(source.commit, /^[0-9a-f]{40}$/);
  assert.match(source.sha256, /^[0-9a-f]{64}$/);
  assert(source.download.includes(source.commit));
  assert.equal(catalogue.sources.find(item => item.id === 'wikidata').license, 'CC0-1.0');
  const credits = fs.readFileSync(path.join(__dirname, '../v2-preview/catalogs/SOURCES.txt'), 'utf8');
  assert(credits.includes(source.commit));
  assert(credits.includes('CC BY 4.0') || credits.includes('CC-BY-4.0'));
  assert(credits.includes('CC0'));
});

test('catalogue entries retain unique stable origins, names, aliases and explicit language fallback', () => {
  const ids = new Set();
  for (const species of ['Chien', 'Chat', 'Lapin', 'Cheval']) {
    const group = catalogue.species[species];
    assert.equal(group.kind, 'breed');
    assert(group.entries.length > 100, species + ' should include the broad imported catalogue');
    for (const entry of group.entries) {
      assert(!ids.has(entry.id), 'duplicate origin: ' + entry.id); ids.add(entry.id);
      assert.match(entry.id, /^(dog|cat|rabbit|horse):VBO_\d+$/);
      assert(entry.sourceIds.length && entry.sourceIds.every(id => /^VBO_\d+$/.test(id)));
      assert(entry.aliases.includes(entry.canonical));
      for (const language of ['fr', 'en', 'es', 'de', 'it']) assert.equal(typeof entry.labels[language], 'string');
      for (const language of entry.fallbackLocales) assert.equal(entry.labels[language], entry.canonical);
    }
  }
});

test('a common breed is found by its verified names in all five languages and without accents', () => {
  for (const [locale, query] of [['fr', 'berger allemand'], ['en', 'german shepherd'], ['es', 'pastor aleman'], ['de', 'deutscher schaferhund'], ['it', 'pastore tedesco']]) {
    assert(catalogue.search('Chien', query, locale).some(entry => entry.id === 'dog:VBO_0200577'), locale + ' search failed');
  }
  assert(catalogue.search('Chat', 'siamois', 'fr').length > 0);
  assert.equal(catalogue.search('Chien', 'race inexistante xyz123', 'fr').length, 0);
});

test('species without a relevant breed catalogue remain optional without invented choices', () => {
  for (const species of ['Oiseau', 'Poisson', 'Hamster', 'Autre']) {
    assert.equal(catalogue.species[species].kind, 'notApplicable');
    assert.deepEqual(catalogue.search(species, '', 'fr'), []);
  }
  assert.deepEqual(catalogue.search('Espèce historique inconnue', '', 'fr'), []);
});

test('wild taxa and generic colour or purpose concepts are not offered as domestic breeds', () => {
  const forbidden = ['African Wild Dog', 'Wolf', 'Jackal', 'Asian Leopard Cat', 'Bobcat', 'Caracal', 'Fishing Cat', 'Geoffroy’s Cat', 'Jungle Cat', 'Rusty Spotted Cat', 'Scottish Wildcat', 'Serval', 'Guard Dog', 'Calico'];
  const names = new Set(Object.values(catalogue.species).flatMap(group => group.entries).map(entry => catalogue.normalize(entry.canonical)));
  for (const name of forbidden) assert(!names.has(catalogue.normalize(name)), name + ' should be excluded');
  assert(catalogue.search('Chien', 'fox terrier', 'fr').length > 0, 'valid terriers must not be removed with wild fox taxa');
  assert(catalogue.search('Chien', 'wolfdog', 'fr').length > 0, 'named wolfdog origins must remain available');
});

test('catalogue data resolves selected origins and the primary origin in the future AI context', () => {
  globalThis.AniMoiBreeds = catalogue;
  const [first, second] = catalogue.species.Chat.entries;
  const pet = {species: 'Chat', breed: 'Ancien texte', traits: 'Ancien caractère', characteristics: {
    version: 1, breed: {status: 'selected', ids: [first.id, second.id], primaryId: second.id, custom: ['Origine personnalisée']},
    temperament: {ids: ['playful', 'curious'], custom: ['Trait personnalisé']}
  }};
  const context = characteristics.toAIContext(pet, 'de');
  assert.equal(context.breed.labels[0], second.labels.de);
  assert.equal(context.breed.labels[1], first.labels.de);
  assert.equal(context.breed.labels[2], 'Origine personnalisée');
  assert.deepEqual(context.temperament.ids, ['playful', 'curious']);
  assert(context.temperament.labels.includes('Verspielt'));
  assert.deepEqual(context.legacy, {breed: 'Ancien texte', traits: 'Ancien caractère'});
});
