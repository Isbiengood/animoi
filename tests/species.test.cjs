const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalogue = require('../v2-preview/catalogs/species.js');
const breeds = require('../v2-preview/catalogs/breeds.js');
const characteristics = require('../v2-preview/characteristics.js');

test('the seven animal groups have actual offline catalogues of the appropriate kind', () => {
  for (const species of ['Chien', 'Chat', 'Lapin', 'Cheval']) {
    assert.equal(breeds.species[species].kind, 'breed');
    assert(breeds.species[species].entries.length > 100);
  }
  for (const species of ['Poisson', 'Oiseau', 'Hamster']) {
    assert(catalogue.species[species].entries.length >= 5);
    assert(catalogue.species[species].entries.every(entry => ['species', 'variety'].includes(entry.kind)));
  }
});

test('species entries have safe stable references, five bounded labels and source attribution', () => {
  const ids = new Set();
  for (const group of Object.values(catalogue.species)) for (const entry of group.entries) {
    assert(!ids.has(entry.id), 'duplicate reference ' + entry.id); ids.add(entry.id);
    assert.match(entry.id, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/);
    assert.match(entry.wikidataId, /^Q[1-9][0-9]*$/);
    assert.equal(entry.sourceUrl, 'https://www.wikidata.org/wiki/' + entry.wikidataId);
    assert(entry.scientificName.trim());
    for (const locale of ['fr', 'en', 'es', 'de', 'it']) {
      assert(entry.labels[locale].trim()); assert(entry.labels[locale].length <= 200);
      assert(!/[\u0000-\u001f\u007f]/.test(entry.labels[locale]));
    }
    assert(entry.aliases.includes(entry.scientificName));
  }
  assert(catalogue.sources.some(source => source.id === 'wikidata-species' && source.license === 'CC0-1.0'));
  const attribution = fs.readFileSync(path.join(__dirname, '../v2-preview/catalogs/SOURCES.txt'), 'utf8');
  assert(attribution.includes('Wikidata')); assert(attribution.includes('Commons'));
});

test('common companion animals belong to their verified taxon and group', () => {
  for (const [group, id, scientificName] of [
    ['Poisson', 'fish:Q123141', 'Carassius auratus'],
    ['Poisson', 'fish:Q549', 'Betta splendens'],
    ['Oiseau', 'bird:Q121221', 'Melopsittacus undulatus'],
    ['Hamster', 'hamster:Q204175', 'Mesocricetus auratus']
  ]) {
    const entry = catalogue.species[group].entries.find(entry => entry.id === id);
    assert(entry, id + ' is missing'); assert.equal(entry.kind, 'species');
    assert.equal(entry.scientificName, scientificName);
  }
});

test('common names and scientific names are searchable in each of the five languages', () => {
  for (const group of ['Poisson', 'Oiseau', 'Hamster']) {
    const entry = catalogue.species[group].entries[0];
    for (const locale of ['fr', 'en', 'es', 'de', 'it']) {
      for (const query of [entry.scientificName, catalogue.normalize(entry.labels[locale])]) {
        assert(catalogue.search(group, query, locale).some(found => found.id === entry.id), group + ': ' + query);
      }
    }
    assert.deepEqual(catalogue.search(group, 'aucun taxon xyz123', 'fr'), []);
  }
});

test('domestic varieties remain distinct from their parent species', () => {
  const varieties = catalogue.species.Poisson.entries.filter(entry => entry.kind === 'variety');
  assert(varieties.length >= 3);
  for (const variety of varieties) {
    const parent = catalogue.species.Poisson.entries.find(entry => entry.id === variety.varietyOf);
    assert(parent); assert.equal(parent.kind, 'species');
    assert.notEqual(variety.id, parent.id); assert.equal(variety.scientificName, parent.scientificName);
  }
});

test('real catalogue selections localize the AI context without modifying stored text or identifiers', () => {
  const previous = globalThis.AniMoiSpecies;
  globalThis.AniMoiSpecies = catalogue;
  try {
    for (const species of ['Poisson', 'Oiseau', 'Hamster']) {
      const entry = catalogue.species[species].entries.find(entry => entry.kind === 'variety') || catalogue.species[species].entries[0];
      const pet = {species, breed: 'Ancien texte', traits: 'Ancien caractère', characteristics: {
        version: 1, breed: {status: 'not-applicable', ids: [], custom: [], primaryId: null},
        temperament: {ids: ['playful'], custom: [], dominant: ['id:playful']},
        speciesDetail: {species, catalogueId: entry.id, text: 'Libellé original conservé'}
      }};
      const before = JSON.stringify(pet);
      for (const locale of ['fr', 'en', 'es', 'de', 'it']) {
        const context = characteristics.toAIContext(pet, locale);
        assert.equal(context.speciesDetail, entry.labels[locale]);
        assert.equal(context.speciesDetailSelection.catalogueId, entry.id);
        assert.equal(context.speciesDetailSelection.kind, entry.kind);
        assert.equal(context.speciesDetailSelection.text, 'Libellé original conservé');
        assert.equal(context.speciesDetailSelection.scientificName, entry.scientificName);
      }
      assert.equal(JSON.stringify(pet), before);
    }
  } finally { if (previous === undefined) delete globalThis.AniMoiSpecies; else globalThis.AniMoiSpecies = previous; }
});

test('the species catalogue works as a standalone browser script without CommonJS or network access', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../v2-preview/catalogs/species.js'), 'utf8'), context);
  assert(context.AniMoiSpecies);
  for (const species of ['Poisson', 'Oiseau', 'Hamster']) {
    assert.equal(context.AniMoiSpecies.species[species].entries.length, catalogue.species[species].entries.length);
  }
});
