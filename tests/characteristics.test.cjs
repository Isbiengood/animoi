const {test} = require('node:test');
const assert = require('node:assert/strict');
const characteristics = require('../v2-preview/characteristics.js');
const legacy = {id:'test',name:'Animal test',species:'Chien',breed:'Origine familiale inconnue',traits:'curieux, très doux',photo:''};
const selected = () => ({
  version:1,
  breed:{status:'selected',ids:['dog:first','dog:second'],primaryId:'dog:second',custom:['Une origine locale']},
  temperament:{ids:['playful','affectionate'],custom:['Patient avec les oiseaux']}
});

test('all authored temperament choices have unique stable ids and five translated labels', () => {
  assert.equal(characteristics.traits.length,52);
  assert.equal(new Set(characteristics.traits.map(trait=>trait.id)).size, characteristics.traits.length);
  for(const trait of characteristics.traits) {
    for(const code of ['fr','en','es','de','it']) assert.equal(typeof trait.labels[code], 'string');
    assert(Object.values(trait.labels).every(text=>text.trim()));
  }
});
test('legacy profiles are read without mutating, inferring or splitting their original texts', () => {
  const before=JSON.stringify(legacy), value=characteristics.read(legacy);
  assert.deepEqual(value.breed,{status:'other',ids:[],primaryId:null,custom:[legacy.breed]});
  assert.deepEqual(value.temperament,{ids:[],custom:[legacy.traits]});
  value.breed.custom[0]='Changed';
  assert.equal(JSON.stringify(legacy),before);
  assert.deepEqual(characteristics.display(legacy,'en'),{breed:legacy.breed,traits:legacy.traits});
  assert.equal(Object.hasOwn(legacy,'characteristics'),false);
});
test('structured reads preserve future compatible extension data and clone nested arrays', () => {
  const pet={...legacy,characteristics:{...selected(),future:{notes:['preserve']}}};
  const copy=characteristics.read(pet);
  copy.breed.ids.push('future:new'); copy.future.notes[0]='changed';
  assert.deepEqual(pet.characteristics.breed.ids,['dog:first','dog:second']);
  assert.equal(pet.characteristics.future.notes[0],'preserve');
  assert.equal(characteristics.read(pet).future.notes[0],'preserve');
});
test('historical long and multiline text can coexist with explicit catalogue edits without truncation', () => {
  for(const text of ['Origine ou caractère '.repeat(30),'Première ligne\nDeuxième ligne','Texte\tavec tabulation']) {
    const pet={...legacy,breed:text,traits:text}, before=JSON.stringify(pet);
    const value=characteristics.read(pet);
    assert.equal(value.breed.legacyText,text);assert.deepEqual(value.breed.custom,[]);
    assert.equal(value.temperament.legacyText,text);assert.deepEqual(value.temperament.custom,[]);
    value.breed.status='selected';value.breed.ids=['future:origin'];value.breed.primaryId='future:origin';
    value.temperament.ids=['curious'];value.temperament.custom=['Nouveau trait'];
    assert(characteristics.validate(value));
    const updated={...pet,characteristics:value};
    assert(characteristics.breedLabels(updated,'fr').includes(text));
    assert(characteristics.traitLabels(updated,'en').includes(text));
    const context=characteristics.toAIContext(updated,'it');
    assert.equal(context.breed.legacyText,text);assert.equal(context.temperament.legacyText,text);
    assert.equal(context.legacy.breed,text);assert.equal(context.legacy.traits,text);
    assert.equal(JSON.stringify(pet),before);
  }
});
test('trait labels follow the chosen language and fall back to French for another locale', () => {
  assert.equal(characteristics.label('playful','en-GB'),'Playful');
  assert.equal(characteristics.label('playful','pt-BR'),'Joueur');
  assert.equal(characteristics.label({id:'custom',labels:{fr:'Libellé libre'}},'de'),'Libellé libre');
  assert.equal(characteristics.label('future:unknown','it'),'future:unknown');
  assert.equal(characteristics.statusLabel('none','it'),'Senza razza definita');
});
test('breed display resolves catalogues lazily, puts the primary origin first and keeps unknown ids', () => {
  const previous=global.AniMoiBreeds;
  try {
    global.AniMoiBreeds={species:{Chien:{entries:[{id:'dog:first',labels:{fr:'Première',en:'First'}},{id:'dog:second',labels:{fr:'Deuxième',en:'Second'}}]}}};
    const pet={...legacy,characteristics:selected()};
    assert.deepEqual(characteristics.breedLabels(pet,'en'),['Second','First','Une origine locale']);
    pet.species='Chat';
    assert.deepEqual(characteristics.breedLabels(pet,'en'),['Second','First','Une origine locale']);
    pet.characteristics.breed.ids.push('future:breed');
    assert(characteristics.breedLabels(pet,'en').includes('future:breed'));
  } finally { if(previous===undefined)delete global.AniMoiBreeds;else global.AniMoiBreeds=previous; }
});
test('AI context keeps original legacy texts alongside stable ids and localized labels', () => {
  const pet={...legacy,characteristics:selected()}, before=JSON.stringify(pet);
  const context=characteristics.toAIContext(pet,'es');
  assert.equal(context.locale,'es');
  assert.deepEqual(context.temperament.ids,['playful','affectionate']);
  assert.deepEqual(context.temperament.labels,['Juguetón','Cariñoso','Patient avec les oiseaux']);
  assert.deepEqual(context.legacy,{breed:legacy.breed,traits:legacy.traits});
  context.temperament.ids.length=0;
  assert.equal(JSON.stringify(pet),before);
});
test('AI context excludes inactive origins and canonicalizes historical breed choices without changing stored profiles',()=>{
  for(const choice of ['unknown','not-applicable']) {
    const value=characteristics.setBreedChoice(selected(),choice),pet={...legacy,characteristics:value},before=JSON.stringify(pet);
    const context=characteristics.toAIContext(pet,'en');
    assert.equal(context.breed.status,choice);
    assert.equal(Object.hasOwn(context.breed,'retainedSelection'),false);
    assert.deepEqual(context.breed.ids,[]);assert.deepEqual(context.breed.custom,[]);
    assert.equal(context.legacy.breed,legacy.breed);assert.equal(context.legacy.traits,legacy.traits);
    assert.deepEqual(characteristics.read(pet).breed.retainedSelection,selected().breed);
    assert.equal(JSON.stringify(pet),before);
  }
  for(const [status,canonical] of [['other','selected'],['none','unknown']]) {
    const value=selected();value.breed={status,ids:[],primaryId:null,custom:status==='other'?['Origine familiale']:[]};
    const pet={...legacy,characteristics:value};
    assert.equal(characteristics.toAIContext(pet,'fr').breed.status,canonical);
    assert.deepEqual(characteristics.toAIContext(pet,'fr').breed.custom,value.breed.custom);
    assert.equal(characteristics.read(pet).breed.status,status);
  }
});
test('optional empty selection and non-breed statuses are valid without inventing an origin', () => {
  const value=selected(); value.breed={status:'selected',ids:[],primaryId:null,custom:[]};
  assert(characteristics.validate(value));
  for(const status of ['other','unknown','none','not-applicable']) {
    value.breed.status=status;
    assert(characteristics.validate(value));
    assert(characteristics.display({...legacy,characteristics:value},'fr').breed);
  }
});
test('malformed structured choices are rejected, including conflicting statuses and invalid primary origins', () => {
  const modifications=[
    value=>value.version=2,
    value=>value.breed=null,
    value=>value.temperament=[],
    value=>value.breed.status='unrecognized',
    value=>value.breed.status='unknown',
    value=>value.breed.primaryId='dog:not-selected',
    value=>delete value.breed.primaryId,
    value=>value.breed.ids.push(value.breed.ids[0]),
    value=>value.breed.ids.push('bad id'),
    value=>value.breed.ids=Array.from({length:21},(_,i)=>'dog:'+i),
    value=>value.temperament.ids=['playful','playful'],
    value=>value.temperament.custom=[''],
    value=>value.temperament.custom=['x'.repeat(201)],
    value=>value.temperament.custom=['line\nbreak'],
    value=>value.temperament.custom=Array(41).fill('too many'),
    value=>value.temperament.ids=Array.from({length:81},(_,i)=>'trait:'+i),
    value=>value.breed.legacyText=15,
    value=>value.temperament.legacyText=null,
    value=>{value.breed={status:'unknown',ids:[],primaryId:null,custom:[],legacyText:'Ancien texte'}}
  ];
  for(const change of modifications){const value=selected();change(value);assert.throws(()=>characteristics.validate(value));}
  for(const value of [null,[],{},'text'])assert.throws(()=>characteristics.validate(value));
});
test('future stable ids and all built-in temperament selections are accepted without catalogue membership checks', () => {
  const value=selected();
  value.breed.ids=['partner:breed-v9'];value.breed.primaryId='partner:breed-v9';
  value.temperament.ids=characteristics.traits.map(trait=>trait.id).concat('future:trait');
  assert(characteristics.validate(value));
});
test('three breed choices map historical statuses without rewriting saved metadata',()=>{
  for(const [status,choice] of [['other','selected'],['none','unknown'],['selected','selected'],['unknown','unknown'],['not-applicable','not-applicable']]) {
    const value=selected();value.breed={status,ids:[],primaryId:null,custom:status==='other'?['Origine libre']:[]};
    const pet={...legacy,characteristics:value},before=JSON.stringify(pet);
    assert.equal(characteristics.breedChoice(value.breed),choice);
    assert.equal(characteristics.read(pet).breed.status,status);
    assert.equal(characteristics.setBreedChoice(value,choice).breed.status,status);
    assert.equal(JSON.stringify(pet),before);
  }
});
test('switching breed choices archives and restores all origins, primary choice and compatible extensions',()=>{
  const value=selected();value.breed.legacyText='Une origine\nhistorique';value.breed.extension={notes:['À conserver']};
  value.speciesDetail={species:'Chien',text:'Type de chien'};
  const before=JSON.stringify(value),unknown=characteristics.setBreedChoice(value,'unknown');
  assert.deepEqual(unknown.breed.retainedSelection,value.breed);
  assert.deepEqual(unknown.breed.ids,[]);assert.deepEqual(unknown.breed.custom,[]);assert.equal(unknown.breed.primaryId,null);
  assert.equal(Object.hasOwn(unknown.breed,'legacyText'),false);
  const notApplicable=characteristics.setBreedChoice(unknown,'not-applicable');
  assert.deepEqual(notApplicable.breed.retainedSelection,value.breed);
  assert.deepEqual(notApplicable.speciesDetail,value.speciesDetail);
  const restored=characteristics.setBreedChoice(notApplicable,'selected');
  assert.deepEqual(restored,value);
  restored.breed.extension.notes[0]='Modification';
  assert.equal(JSON.stringify(value),before);
  assert.throws(()=>characteristics.setBreedChoice(value,'other'));
});
test('historical free-text origins survive known to unknown to known choices',()=>{
  for(const breed of ['Origine familiale', 'Très long texte '.repeat(30), 'Première origine\nDeuxième origine']) {
    const pet={...legacy,breed},value=characteristics.read(pet);
    const unknown=characteristics.setBreedChoice(value,'unknown');
    const restored=characteristics.setBreedChoice(unknown,'selected');
    assert.equal(characteristics.display({...pet,characteristics:restored},'fr').breed,breed);
    assert.equal(pet.breed,breed);assert.equal(pet.name,legacy.name);
    assert.equal(Object.hasOwn(pet,'characteristics'),false);
  }
});
test('species detail is only displayed or sent to the local AI context for its matching non-breed species',()=>{
  const value=characteristics.setBreedChoice(selected(),'not-applicable');
  value.speciesDetail={species:'Oiseau',text:'Perruche ondulée'};
  const pet={...legacy,species:'Oiseau',characteristics:value};
  assert(characteristics.validate(value));
  assert.equal(characteristics.speciesDetail(pet),'Perruche ondulée');
  assert.equal(characteristics.display(pet,'en').breed,'Perruche ondulée');
  assert.equal(characteristics.toAIContext(pet,'en').speciesDetail,'Perruche ondulée');
  for(const changed of [{...pet,species:'Poisson'},{...pet,characteristics:characteristics.setBreedChoice(value,'unknown')},{...pet,characteristics:characteristics.setBreedChoice(value,'selected')}]) {
    assert.equal(characteristics.speciesDetail(changed),'');
    assert.equal(characteristics.toAIContext(changed,'en').speciesDetail,'');
    assert.equal(characteristics.toAIContext(changed,'en').speciesDetailSelection,null);
    assert.equal(characteristics.speciesEntry(changed),null);
    assert(!characteristics.display(changed,'en').breed.includes('Perruche'));
    assert.deepEqual(changed.characteristics.speciesDetail,value.speciesDetail);
  }
  value.speciesDetail.species='Une espèce future';assert(characteristics.validate(value));
});
test('catalogue species references resolve in five languages and include stable scientific context',()=>{
  const previous=global.AniMoiSpecies;
  try {
    const entry={id:'bird:budgerigar',kind:'species',scientificName:'Melopsittacus undulatus',labels:{fr:'Perruche ondulée',en:'Budgerigar',es:'Periquito australiano',de:'Wellensittich',it:'Pappagallino ondulato'},aliases:['Perruche']};
    global.AniMoiSpecies={species:{Oiseau:{entries:[entry]}}};
    const value=characteristics.setBreedChoice(selected(),'not-applicable');
    value.speciesDetail={species:'Oiseau',text:'Mon ancien libellé',catalogueId:entry.id,extension:{keep:true}};
    const pet={...legacy,species:'Oiseau',characteristics:value},before=JSON.stringify(pet);
    assert(characteristics.validate(value));assert.equal(characteristics.speciesEntry(pet),entry);
    for(const code of ['fr','en','es','de','it']) {
      assert.equal(characteristics.speciesDetail(pet,code),entry.labels[code]);
      assert.equal(characteristics.display(pet,code).breed,entry.labels[code]);
      const context=characteristics.toAIContext(pet,code);
      assert.equal(context.speciesDetail,entry.labels[code]);
      assert.deepEqual(context.speciesDetailSelection,{species:'Oiseau',catalogueId:entry.id,label:entry.labels[code],text:'Mon ancien libellé',kind:'species',scientificName:entry.scientificName});
    }
    assert.equal(characteristics.speciesDetail(pet,'pt-BR'),entry.labels.fr);
    assert.equal(JSON.stringify(pet),before);
    assert.deepEqual(characteristics.read(pet).speciesDetail.extension,{keep:true});
  } finally {if(previous===undefined)delete global.AniMoiSpecies;else global.AniMoiSpecies=previous;}
});
test('missing or future species catalogue references preserve the stored fallback and never resolve another species group',()=>{
  const previous=global.AniMoiSpecies;
  try {
    const value=characteristics.setBreedChoice(selected(),'not-applicable');
    value.speciesDetail={species:'Poisson',text:'Variété conservée exactement',catalogueId:'future:variety-v7'};
    const pet={...legacy,species:'Poisson',characteristics:value};
    assert(characteristics.validate(value));
    for(const catalogue of [undefined,{species:{Oiseau:{entries:[{id:'future:variety-v7',kind:'species',labels:{fr:'Autre espèce'}}]}}}]) {
      global.AniMoiSpecies=catalogue;
      assert.equal(characteristics.speciesEntry(pet),null);
      assert.equal(characteristics.speciesDetail(pet,'en'),'Variété conservée exactement');
      assert.equal(characteristics.display(pet,'de').breed,'Variété conservée exactement');
      assert.deepEqual(characteristics.toAIContext(pet,'en').speciesDetailSelection,{species:'Poisson',catalogueId:'future:variety-v7',label:'Variété conservée exactement',text:'Variété conservée exactement',kind:null,scientificName:null});
    }
    delete value.speciesDetail.catalogueId;
    assert.equal(characteristics.speciesDetail(pet,'it'),'Variété conservée exactement');
    assert.equal(characteristics.toAIContext(pet,'it').speciesDetailSelection.catalogueId,null);
    assert.equal(Object.hasOwn(characteristics.read(pet).speciesDetail,'catalogueId'),false);
  } finally {if(previous===undefined)delete global.AniMoiSpecies;else global.AniMoiSpecies=previous;}
});
test('species catalogue ids validate structurally while allowing future catalogue entries',()=>{
  const value=selected();value.speciesDetail={species:'Une espèce future',text:'Description conservée',catalogueId:'partner:variety-v4.2'};
  assert(characteristics.validate(value));
  for(const catalogueId of [null,1,'','bad id','invalid\nref','id'.repeat(61),'étiquette']) {
    value.speciesDetail.catalogueId=catalogueId;
    assert.throws(()=>characteristics.validate(value));
  }
});
test('selected temperament choices expose stable reference keys for catalogue, custom and historical text',()=>{
  const value=selected();value.temperament.ids.push('future:trait');value.temperament.legacyText='Un caractère\nhistorique';
  const choices=characteristics.traitChoices({...legacy,characteristics:value},'en');
  assert.deepEqual(choices,[{key:'id:playful',label:'Playful'},{key:'id:affectionate',label:'Affectionate'},{key:'id:future:trait',label:'future:trait'},{key:'custom:Patient avec les oiseaux',label:'Patient avec les oiseaux'},{key:'legacy',label:'Un caractère\nhistorique'}]);
});
test('up to three dominant traits prioritize the AI context while preserving every selected characteristic',()=>{
  const value=selected();value.temperament.ids.push('future:trait');value.temperament.legacyText='Caractère historique';
  value.temperament.dominant=['custom:Patient avec les oiseaux','id:future:trait','legacy'];
  const pet={...legacy,characteristics:value},before=JSON.stringify(pet);
  assert(characteristics.validate(value));
  assert.deepEqual(characteristics.dominantLabels(pet,'en'),['Patient avec les oiseaux','future:trait','Caractère historique']);
  const context=characteristics.toAIContext(pet,'en');
  assert.deepEqual(context.temperament.dominant,value.temperament.dominant);
  assert.deepEqual(context.temperament.prioritizedLabels,['Patient avec les oiseaux','future:trait','Caractère historique','Playful','Affectionate']);
  assert.deepEqual(context.temperament.labels,['Playful','Affectionate','future:trait','Patient avec les oiseaux','Caractère historique']);
  assert.equal(JSON.stringify(pet),before);
});
test('distinct selected traits with the same translated label remain represented after prioritization',()=>{
  const value=selected();value.temperament.ids=['calm'];value.temperament.custom=['Calme'];value.temperament.dominant=['custom:Calme'];
  assert.deepEqual(characteristics.prioritizedLabels({...legacy,characteristics:value},'fr'),['Calme','Calme']);
  delete value.temperament.dominant;
  assert.deepEqual(characteristics.dominantLabels({...legacy,characteristics:value},'fr'),[]);
  assert.deepEqual(characteristics.traitLabels({...legacy,characteristics:value},'fr'),['Calme','Calme']);
});
test('archived selections, species details and dominant references are validated before use',()=>{
  const invalid=[];
  for(const archive of [null,[],{...selected().breed,primaryId:'missing'},{...selected().breed,retainedSelection:selected().breed}]){const value=selected();value.breed={status:'unknown',ids:[],primaryId:null,custom:[],retainedSelection:archive};invalid.push(value)}
  const contradictory=selected();contradictory.breed.retainedSelection=selected().breed;invalid.push(contradictory);
  for(const detail of [null,[],{species:1,text:'Type'},{species:'Oiseau',text:1},{species:'Oiseau',text:'x'.repeat(201)},{species:'Oiseau',text:'ligne\nsuivante'}]){const value=selected();value.speciesDetail=detail;invalid.push(value)}
  for(const dominant of [null,'id:playful',['id:playful','id:playful'],['id:playful','id:affectionate','custom:Patient avec les oiseaux','id:future'],['id:missing'],['custom:Texte absent'],['legacy'],[1]]){const value=selected();value.temperament.dominant=dominant;invalid.push(value)}
  for(const value of invalid)assert.throws(()=>characteristics.validate(value));
  const stale=selected();stale.temperament.dominant=['id:playful'];stale.temperament.ids=stale.temperament.ids.filter(id=>id!=='playful');
  assert.throws(()=>characteristics.validate(stale));
  stale.temperament.dominant=[];assert(characteristics.validate(stale));
  const tooMany=selected();tooMany.temperament.ids=['playful','calm','curious','gentle'];tooMany.temperament.dominant=tooMany.temperament.ids.map(id=>'id:'+id);
  assert.throws(()=>characteristics.validate(tooMany));
  tooMany.temperament.dominant.pop();assert(characteristics.validate(tooMany));
});
