const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fromProfile}=require('../v2-preview/reformulation-input.js');
const {createRepository}=require('../v2-preview/data.js');
const profile=()=>({id:'synthetic',name:'Animal fictif',species:'Chien',sex:'female',birthDate:'2023-04-23',photo:'private-photo-not-transmitted',owner:{email:'private-not-transmitted'},characteristics:{version:1,breed:{status:'selected',ids:[],primaryId:null,custom:['Fox-terrier']},temperament:{ids:['playful','curious','calm'],custom:['Très patient'],dominant:['id:curious','custom:Très patient','id:playful']}}});
const options={anecdote:'Mon animal est resté sur le canapé.',language:'fr',rubric:'pawbook',tone:'amusant',today:'2026-10-23'};
for(const language of ['fr','en','es','de','it'])for(const humorVariant of ['funny','cheeky','wacky'])test(language+'/'+humorVariant+': explicit server payload only, no mutation',()=>{
 const pet=profile(),before=structuredClone(pet),payload=fromProfile(pet,{...options,language,humorVariant});
 assert.deepEqual(Object.keys(payload).sort(),['animal','anecdote','language','rubric','tone','humorVariant'].sort());
 assert.deepEqual(Object.keys(payload.animal).sort(),['name','species','sex','traits','dominants','breed','age'].sort());
 assert.equal(payload.animal.name,pet.name);assert.equal(payload.animal.breed,'Fox-terrier');assert.equal(payload.animal.species,'Chien');assert.equal(payload.animal.sex,'female');
 assert.deepEqual(payload.animal.age,{years:3,months:6,estimated:false});assert.equal(payload.animal.traits.length,4);assert.equal(payload.animal.dominants.length,3);
 assert.equal(payload.animal.dominants[1],'Très patient');assert(payload.animal.dominants.every(v=>payload.animal.traits.includes(v)));assert.equal(payload.humorVariant,humorVariant);assert.equal(payload.language,language);
 assert(!JSON.stringify(payload).includes('private-'));assert(!JSON.stringify(payload).includes('birthDate'));assert.deepEqual(pet,before);
});
test('legacy tone defaults without changing the saved profile or publication',()=>{
 const pet={id:'old',name:'Animal historique',species:'Chat',breed:'Ancienne origine',traits:'calme, très doux',photo:''};
 const original=structuredClone(pet),value=fromProfile(pet,{...options,tone:'drôle'});
 assert.deepEqual(value.animal.traits,['calme, très doux']);assert.deepEqual(value.animal.dominants,[]);assert.equal(value.animal.breed,'Ancienne origine');assert.equal(value.humorVariant,'funny');assert(!('age' in value.animal));assert.deepEqual(pet,original);
 const values=new Map(),repository=createRepository({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});
 repository.write({pets:[pet],posts:[{id:'old-post',petId:'old',date:1,text:'Texte #Marque',tone:'drôle'}],settings:{language:'fr',learningConsent:false}});
 const before=repository.exportData();fromProfile(repository.read().pets[0],{...options,tone:'drôle'});
 const after=JSON.parse(repository.exportData()),prior=JSON.parse(before);assert.deepEqual(after.pets,prior.pets);assert.deepEqual(after.posts,prior.posts);
 repository.restore(before);assert.deepEqual(repository.read().pets,[pet]);assert(!Object.hasOwn(repository.read().posts[0],'humorVariant'));
});
test('all existing tones and categories are mapped without assigning a historical category',()=>{
 for(const tone of ['sérieux','triste','tendre','en colère','dramatique','philosophe','neutre','ironique','sarcastique'])for(const rubric of ['pawbook','sav','linkedin','potins']){
  const payload=fromProfile(profile(),{...options,tone,rubric});assert.equal(payload.tone,tone);assert.equal(payload.rubric,rubric);assert(!Object.hasOwn(payload,'humorVariant'));
 }
 assert.equal(fromProfile(profile(),{...options,tone:'amusing'}).tone,'amusant');
 assert.throws(()=>fromProfile(profile(),{...options,rubric:undefined}));
});
test('estimated ages stay estimates, missing ages stay unknown, dates are never invented',()=>{
 const pet=profile();delete pet.birthDate;pet.estimatedAge={years:2,months:4,recordedOn:'2026-01-01'};
 assert.deepEqual(fromProfile(pet,options).animal.age,{years:2,months:4,estimated:true});assert(!('birthDate' in pet));
 delete pet.estimatedAge;assert(!('age' in fromProfile(pet,options).animal));
 pet.birthDate='2026-11-01';assert.throws(()=>fromProfile(pet,options));pet.birthDate='bad-date';assert.throws(()=>fromProfile(pet,options));
});
test('precise species or variety replaces inapplicable breed without sending inactive origins',()=>{
 for(const species of ['Poisson','Oiseau','Hamster']){
  const pet=profile();pet.species=species;pet.characteristics.breed={status:'not-applicable',ids:[],primaryId:null,custom:[]};pet.characteristics.speciesDetail={species,text:'Variété fictive',kind:'variety'};
  const value=fromProfile(pet,options);assert.equal(value.animal.variety,'Variété fictive');assert(!('breed' in value.animal));
 }
 const pet=profile();pet.characteristics.breed={status:'unknown',ids:[],primaryId:null,custom:[]};assert(!('breed' in fromProfile(pet,options).animal));
});
test('oversized or incompatible profiles are rejected without silent truncation',()=>{
 const invalid=[p=>p.name='x'.repeat(81),p=>p.characteristics.breed.custom=['x'.repeat(161)],p=>p.characteristics.temperament.custom=['x'.repeat(101)],p=>p.characteristics.temperament.dominant=['id:missing'],p=>p.sex='injected',p=>p.species='Unknown'];
 for(const mutate of invalid){const pet=profile();mutate(pet);const before=structuredClone(pet);assert.throws(()=>fromProfile(pet,options));assert.deepEqual(pet,before);}
 for(const extra of [{language:'pt'},{humorVariant:'invalid'},{tone:'sérieux',humorVariant:'funny'},{anecdote:'x'.repeat(2001)}])assert.throws(()=>fromProfile(profile(),{...options,...extra}));
});
