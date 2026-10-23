'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createRepository} = require('../v2-preview/data.js');

const keys = ['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1','animoi-transaction-v1'];
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';
function memory() {
  const values = new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),snapshot:()=>Object.fromEntries(keys.map(key=>[key,values.get(key)??null]))};
}
function fixture() {
  return {
    pets:[{id:'a',name:'Animal fictif A',species:'Chat',breed:'Origine historique',traits:'calme',photo,futureProfile:{keep:['yes']}},{id:'b',name:'Animal fictif B',species:'Chien',breed:'',traits:'curieux',photo:''}],
    posts:[
      {id:'legacy',petId:'a',text:'  Je conserve mon texte.\n\n#Animoi #VieDAnimal #Chat #Chat\n ',date:123,photo,originalLanguage:'pt-BR',futureMetadata:{keep:true}},
      {id:'future',petId:'a',text:'Une future rubrique reste inconnue. #Marque',date:234,rubric:'future-universe',tone:'future-tone',futureMetadata:[1,2]},
      {id:'orphan',petId:'missing',text:'Un récit ancien orphelin. #Historique',date:345,originalLanguage:'und',futureMetadata:{keep:true}}
    ],
    settings:{language:'fr',learningConsent:false,futureSetting:{keep:'unchanged'}}
  };
}

test('legacy reads and exports preserve raw stored bytes and never infer rubric or tone',()=>{
  const s=memory(),value=fixture();
  s.setItem(keys[0],JSON.stringify(value.pets,null,1));s.setItem(keys[1],JSON.stringify(value.posts,null,2));s.setItem(keys[2],JSON.stringify(value.settings,null,3));
  const before=s.snapshot();let writes=0;const set=s.setItem,remove=s.removeItem;
  s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  const repository=createRepository(s);
  assert.deepEqual(repository.read(),value);assert.deepEqual(s.snapshot(),before);assert.equal(writes,0);
  const backup=JSON.parse(repository.exportData());assert.deepEqual(backup.posts,value.posts);assert.deepEqual(backup.pets,value.pets);
  assert.equal(Object.hasOwn(backup.posts[0],'rubric'),false);assert.equal(Object.hasOwn(backup.posts[0],'tone'),false);
  assert.deepEqual(s.snapshot(),before);assert.equal(writes,0);
});

test('version 1 and 2 backups round-trip historical text, photos, dates, orphan stories and future rubric extensions',()=>{
  const value=fixture(),repository=createRepository(memory());repository.write(value);
  for(const version of [1,2]) {
    const backup=JSON.parse(repository.exportData());backup.version=version;
    repository.write({pets:[],posts:[],settings:value.settings});repository.restore(JSON.stringify(backup));
    assert.deepEqual(repository.read(),value);
  }
});

test('an explicit classification changes only metadata and preserves original story identity, date, language and hashtags',()=>{
  for(const rubric of ['pawbook','sav','linkedin']) {
    const value=fixture(),repository=createRepository(memory());repository.write(value);
    const state=repository.read(),original=structuredClone(state.posts[0]);
    state.posts[0]={...state.posts[0],rubric};repository.write(state);
    const classified=repository.read().posts[0];assert.deepEqual(classified,{...original,rubric});
    assert.equal(Object.hasOwn(classified,'tone'),false);assert.equal(repository.read().posts.length,value.posts.length);
    assert.deepEqual(repository.read().posts.slice(1),value.posts.slice(1));
    const backup=repository.exportData();repository.restore(backup);assert.deepEqual(repository.read().posts[0],classified);
  }
});

test('new SAV, LinkedPaw and Gazette metadata survive JSON backups with their unknown extensions',()=>{
  const value=fixture();
  value.posts.push(
    {id:'sav',petId:'a',text:'Je réclame un autre coussin. #Animoi #MaMarque',date:456,rubric:'sav',tone:'tendre',title:'Une réclamation',rubricData:{sav:{subject:'Confort du canapé',status:'in-progress',reply:'La demande sera examinée.',futureSav:{keep:true}},futureData:[1,2]},photo,originalLanguage:'fr'},
    {id:'job',petId:'b',text:'I am the head of naps. #Animoi #AnimalLife #Dog',date:567,rubric:'linkedin',tone:'sérieux',title:'A promotion',rubricData:{linkedin:{kind:'promotion',role:'Responsable des siestes',futureCareer:'keep'}},originalLanguage:'en'},
    {id:'proposal',petId:'a',text:'Je propose ce potin. #Animoi',date:678,rubric:'potins',tone:'drôle',editorial:{status:'pending',futureEditorial:{keep:true}},photo,originalLanguage:'fr'}
  );
  const repository=createRepository(memory());repository.write(value);
  for(const version of [1,2]) {
    const backup=JSON.parse(repository.exportData());backup.version=version;
    repository.write({pets:[],posts:[],settings:value.settings});repository.restore(JSON.stringify(backup));
    assert.deepEqual(repository.read(),value);
  }
});

test('malformed rubric metadata or editorial states refuse restore before changing any stored byte',()=>{
  const s=memory(),repository=createRepository(s),original=fixture();repository.write(original);const before=s.snapshot();
  const invalid=[{rubric:17},{rubric:'bad rubric'},{tone:null},{title:'x'.repeat(161)},{rubricData:null},{rubricData:{sav:{status:'approved-by-editor'}}},{rubricData:{sav:{subject:'x'.repeat(201)}}},{rubricData:{linkedin:{kind:'real-job'}}},{rubricData:{linkedin:{role:17}}},{rubric:'potins',editorial:{status:'automatically-published'}},{rubric:'potins',editorial:{status:'pending',editionId:''}}];
  for(const fields of invalid) {
    const backup={app:'AniMoi',version:2,...structuredClone(original)};backup.posts[0]={...backup.posts[0],...fields};
    assert.throws(()=>repository.restore(JSON.stringify(backup)),JSON.stringify(fields));assert.deepEqual(s.snapshot(),before);
  }
});

test('quota failures roll back metadata classification and photo-rich publications at every write boundary',()=>{
  for(const failedKey of keys) {
    const s=memory(),repository=createRepository(s),value=fixture();repository.write(value);const before=s.snapshot();
    const write=s.setItem;let once=true;s.setItem=(key,text)=>{if(once&&key===failedKey){once=false;throw Error('quota-rubric-test')}write(key,text)};
    const changed=structuredClone(value);changed.posts[0]={...changed.posts[0],rubric:'sav',title:'Nouveau titre',rubricData:{sav:{subject:'Une plainte',status:'received'}}};
    assert.throws(()=>repository.write(changed),/quota/);assert.deepEqual(s.snapshot(),before);assert.deepEqual(repository.read(),value);
  }
});

test('reading imported Gazette states never approves or publishes other proposals',()=>{
  const value=fixture();
  for(const status of ['draft','pending','revision','approved','published','rejected','archived'])value.posts.push({id:'proposal-'+status,petId:'a',text:'Source conservée #Animoi #Marque',date:789,rubric:'potins',editorial:{status,reviewExtension:{keep:true}},photo});
  value.posts.push({id:'old-potins',petId:'a',text:'Ancien potin sans circuit éditorial.',date:790,rubric:'potins',editorialExtension:'keep'});
  const s=memory(),repository=createRepository(s);repository.write(value);const before=s.snapshot();
  assert.deepEqual(repository.read(),value);assert.deepEqual(JSON.parse(repository.exportData()).posts,value.posts);assert.deepEqual(s.snapshot(),before);
  assert.equal(Object.hasOwn(repository.read().posts.at(-1),'editorial'),false);
});
