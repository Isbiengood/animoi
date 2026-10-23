'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const rubrics = require('../v2-preview/rubrics.js');
const i18n = require('../v2-preview/i18n.js');
const {createRepository} = require('../v2-preview/data.js');
for (const locale of ['fr','en','es','de','it']) require('../v2-preview/locales/' + locale + '.js');

test('À classer means no recorded rubric, never an unknown future rubric', () => {
  for (const post of [{text:'Keep me'}, {rubric:undefined}, {rubric:''}]) assert.equal(rubrics.isUnclassified(post), true);
  for (const rubric of ['pawbook','sav','linkedin','potins','future-universe','linkedpaw']) {
    assert.equal(rubrics.isUnclassified({rubric}), false, rubric);
  }
});

test('checking the missing-rubric predicate never mutates old or future publications', () => {
  const values=[{id:'old',text:'Original #MonClub',date:10},{id:'future',rubric:'future-universe',tone:'future',text:'Original',date:20}];
  const before=JSON.stringify(values);
  for (const post of values) { Object.freeze(post); rubrics.isUnclassified(post); rubrics.isHistorical(post); rubrics.validate(post); }
  assert.equal(JSON.stringify(values),before);
});

test('the five catalogues naturally name unassigned stories and offer explicit classification feedback', () => {
  const expected={fr:'À classer',en:'To categorize',es:'Por clasificar',de:'Noch zuzuordnen',it:'Da classificare'};
  const keys=['classify.empty','classify.action','classify.change','classify.saved','classify.error','classify.unknownRubric','hashtags.restore','hashtags.restoreHint','hashtags.restored'];
  for (const [locale,label] of Object.entries(expected)) {
    assert.equal(i18n.tFor(locale,'rubrics.historical'),label);
    for (const key of keys) { const text=i18n.tFor(locale,key,{error:'synthetic-error'}); assert(text&&text!==key,locale+'/'+key); }
    assert(i18n.tFor(locale,'classify.error',{error:'synthetic-error'}).includes('synthetic-error'));
  }
});

test('ordinary classification choices stay separate from the Gazette editorial workflow', () => {
  assert.deepEqual(rubrics.historicalChoices().map(value=>value.id),['pawbook','sav','linkedin']);
  assert.equal(rubrics.historicalChoices().some(value=>value.id==='potins'),false);
  assert.deepEqual(rubrics.list.map(value=>value.style),['carnet','dossier','career','gazette']);
});

test('manual reclassification retains owner, exact historical text, identity and JSON backups', () => {
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const repository=createRepository(storage);
  const original={id:'story',petId:'pet',ownerId:'synthetic-owner',text:'  Original\r\n\r\n#MaMarque #Chat #Chat\r\n ',date:10,originalLanguage:'pt-BR',photo:'data:image/png;base64,aA==',future:{keep:true}};
  const pet={id:'pet',name:'Fictif',species:'Chat',breed:'',traits:'curieux',photo:'',futureProfile:{keep:true}};
  repository.write({pets:[pet],posts:[original],settings:{language:'fr',learningConsent:false}});
  for (const rubric of ['pawbook','sav','linkedin','pawbook']) {
    const state=repository.read();state.posts[0]={...state.posts[0],rubric};repository.write(state);
    assert.deepEqual(repository.read().posts,[{...original,rubric}]);
    assert.equal(rubrics.isUnclassified(repository.read().posts[0]),false);
    const backup=repository.exportData();repository.restore(backup);
    assert.deepEqual(repository.read().posts,[{...original,rubric}]);assert.deepEqual(repository.read().pets,[pet]);
  }
});
