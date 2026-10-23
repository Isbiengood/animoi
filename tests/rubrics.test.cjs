const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const i18n = require('../v2-preview/i18n.js');
for (const locale of ['fr','en','es','de','it']) require('../v2-preview/locales/' + locale + '.js');
const rubrics = require('../v2-preview/rubrics.js');
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
const legacy = () => ({id:'post-historical',petId:'animal-a',text:'Réclamation, promotion et potins : mon anecdote libre. #Animoi #MaMarque',date:123,photo:'data:image/jpeg;base64,AAAA',originalLanguage:'pt-BR',futureField:{preserve:['everything']}});
const full = () => ({...legacy(),rubric:'sav',tone:'sérieux',title:'Une demande très importante',rubricData:{sav:{subject:'La durée de ma promenade',status:'in-progress',reply:'Je réponds sans effacer le récit original.',futureCase:{keep:true}},linkedin:{kind:'promotion',role:'Inspecteur des coussins',futureCareer:['keep']},futureRubric:{text:'Une extension conservée'}},editorial:{futureWorkflow:'untouched'}});
function rejects(value, field) {
  const before = JSON.stringify(value);
  assert.throws(() => rubrics.validate(value), error => error.code === 'rubrics.invalid' && error.field === field);
  assert.equal(JSON.stringify(value), before);
}

test('the four immutable rubric descriptors keep historical ids and the approved A/B/B/C styles', () => {
  assert.deepEqual(rubrics.list.map(({id,style}) => [id,style]), [['pawbook','carnet'],['sav','dossier'],['linkedin','career'],['potins','gazette']]);
  assert(Object.isFrozen(rubrics.list)); assert(rubrics.list.every(Object.isFrozen));
  assert.equal(rubrics.get('linkedin'),rubrics.list[2]);
  for (const id of ['linkedpaw','toString','constructor',null,undefined,{}]) assert.equal(rubrics.get(id),null);
});

test('known rubric labels use the five existing language catalogues without changing interface language', () => {
  i18n.setLocale('fr');
  for (const locale of ['fr','en','es','de','it']) for (const rubric of rubrics.list) {
    assert.equal(rubrics.label(rubric.id,locale),i18n.tFor(locale,'rubric.'+rubric.id));
    assert.notEqual(rubrics.label(rubric.id,locale),'rubric.'+rubric.id);
    assert.equal(i18n.locale,'fr');
  }
});

test('historical labels request their own translation key, never a guessed text classification', () => {
  const calls=[],context={AniMoiI18n:{locale:'it',tFor:(locale,key)=>{calls.push([locale,key]);return key;}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../v2-preview/rubrics.js'),'utf8'),context);
  assert.equal(context.AniMoiRubrics.label('unknown','de'),'classify.unknownRubric');
  assert.equal(context.AniMoiRubrics.label(undefined),'rubrics.historical');
  assert.deepEqual(calls,[['de','classify.unknownRubric'],['it','rubrics.historical']]);
});

test('historical detection depends only on the stored rubric and never infers rubric or tone from content', () => {
  for (const rubric of [undefined,'','future-universe','linkedpaw']) {
    const post=legacy(); if(rubric!==undefined)post.rubric=rubric;
    const before=JSON.stringify(post);deepFreeze(post);
    assert.equal(rubrics.isHistorical(post),true);
    rubrics.validate(post);
    assert.equal(JSON.stringify(post),before);
    assert.equal(Object.hasOwn(post,'tone'),false);
  }
  for (const rubric of rubrics.list) assert.equal(rubrics.isHistorical({...legacy(),rubric:rubric.id}),false);
  assert.equal(rubrics.isHistorical(null),true);
});

test('manual historical classification offers three ordinary rubrics and cannot publish into the Gazette', () => {
  assert.deepEqual(rubrics.historicalChoices().map(value=>value.id),['pawbook','sav','linkedin']);
  const own= rubrics.historicalChoices(); own.pop();
  assert.equal(rubrics.historicalChoices().length,3);
  assert.equal(rubrics.list.length,4);
});

test('fictitious SAV references are stable across wording, language, state and reloading', () => {
  const post={id:'post-12345678-abcd-efgh-9012'};
  const reference=rubrics.ticket(post);
  assert.equal(reference,'SAV-ABCDEFGH9012');
  assert.equal(rubrics.ticket({...post,text:'A different account',date:999,rubric:'sav',tone:'triste'}),reference);
  assert.equal(rubrics.ticket(JSON.parse(JSON.stringify(post))),reference);
  assert.notEqual(rubrics.ticket({id:'post-12345678-abcd-efgh-9013'}),reference);
  assert.match(rubrics.ticket({id:'post-é-ABC'}),/^SAV-[A-Z0-9]+$/);
  assert.equal(rubrics.ticket(null),'SAV-LOCAL');
});

test('validation accepts frozen old stories without adding any metadata or changing text, dates, images and tags', () => {
  const post=legacy(),before=JSON.stringify(post);deepFreeze(post);
  rubrics.validate(post);rubrics.label(post.rubric,'fr');rubrics.ticket(post);
  assert.equal(JSON.stringify(post),before);
  for(const field of ['rubric','tone','title','rubricData'])assert.equal(Object.hasOwn(post,field),false);
});

test('new metadata and inactive rubric extension values remain byte-identical through validation', () => {
  const post=full(),before=JSON.stringify(post);deepFreeze(post);
  rubrics.validate(post);
  assert.equal(JSON.stringify(post),before);
  for (const rubric of ['future-universe','future_universe']) {
    const future={...full(),rubric};rubrics.validate(future);assert.equal(future.rubric,rubric);assert.equal(rubrics.isHistorical(future),true);
  }
});

test('malformed common metadata is rejected without changing the publication', () => {
  for(const rubric of [null,17,[],{},'bad slug','<script>','a'.repeat(61)])rejects({...legacy(),rubric},'rubric');
  for(const tone of [null,9,{},'x'.repeat(81)])rejects({...legacy(),tone},'tone');
  for(const title of [null,4,[],'x'.repeat(161)])rejects({...legacy(),title},'title');
  for(const rubricData of [null,5,'free text',[]])rejects({...legacy(),rubricData},'rubricData');
});

test('SAV fields enforce bounds and allowed fictitious statuses without assigning defaults', () => {
  for(const status of rubrics.savStatuses)rubrics.validate({...legacy(),rubricData:{sav:{status}}});
  rubrics.validate({...legacy(),rubricData:{sav:{subject:'x'.repeat(200),reply:'x'.repeat(2000)}}});
  for(const sav of [null,[],4])rejects({...legacy(),rubricData:{sav}},'rubricData.sav');
  for(const [field,value] of [['subject','x'.repeat(201)],['subject',null],['reply','x'.repeat(2001)],['reply',4],['status','published'],['status',null]])rejects({...legacy(),rubricData:{sav:{[field]:value}}},'rubricData.sav.'+field);
  const empty={...legacy(),rubricData:{sav:{}}};rubrics.validate(empty);assert.deepEqual(empty.rubricData.sav,{});
});

test('LinkedPaw fields support career formats without rewriting free original text or accepting invalid kinds', () => {
  for(const kind of rubrics.careerKinds)rubrics.validate({...legacy(),rubricData:{linkedin:{kind}}});
  rubrics.validate({...legacy(),rubricData:{linkedin:{role:'x'.repeat(160)}}});
  for(const linkedin of [null,[],9])rejects({...legacy(),rubricData:{linkedin}},'rubricData.linkedin');
  for(const [field,value] of [['kind','real-recruitment'],['kind',null],['role',true],['role','x'.repeat(161)]])rejects({...legacy(),rubricData:{linkedin:{[field]:value}}},'rubricData.linkedin.'+field);
});

test('unknown editorial and future metadata are preserved for their own domain validators', () => {
  const post={...legacy(),editorial:{futureState:'keep'},rubricData:{futureType:{nested:[1,2,3]}}},before=JSON.stringify(post);
  deepFreeze(post);rubrics.validate(post);assert.equal(JSON.stringify(post),before);
});
