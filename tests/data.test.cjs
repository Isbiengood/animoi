const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRepository}=require('../v2-preview/data.js');
const pet={id:'a',name:'Mimi',species:'Chat',breed:'',traits:'curieuse',photo:''};
const post={id:'p',petId:'a',text:'Bonjour',date:123};
const defaults=state=>({...state,settings:state.settings||{language:'fr',learningConsent:false}});
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test('export/restore preserves photos, profiles, posts and legacy orphans',()=>{const r=createRepository(storage());const state={pets:[{...pet,photo:'data:image/jpeg;base64,AAAA'}],posts:[post,{...post,id:'orphan',petId:'missing'}]};r.write(state);const backup=r.exportData();r.deletePet('a');assert.deepEqual(r.read(),defaults({pets:[],posts:[state.posts[1]]}));r.restore(backup);assert.deepEqual(r.read(),defaults(state))});
test('invalid backup never changes existing data',()=>{const r=createRepository(storage());r.write({pets:[pet],posts:[post]});for(const text of ['{',JSON.stringify({app:'AniMoi',version:3,pets:[],posts:[]}),JSON.stringify({app:'AniMoi',version:1,pets:[pet,pet],posts:[]})])assert.throws(()=>r.restore(text));assert.equal(r.read().pets.length,1)});
test('failure on posts write rolls profiles back',()=>{const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});const write=s.setItem;let fail=true;s.setItem=(k,v)=>{if(k==='animoi-posts-v2'&&fail){fail=false;throw Error('quota')}write(k,v)};assert.throws(()=>r.deletePet('a'));assert.deepEqual(r.read(),defaults({pets:[pet],posts:[post]}))});
test('unfinished transaction recovered at next read',()=>{const s=storage();s.setItem('animoi-pets-v1','[]');s.setItem('animoi-transaction-v1',JSON.stringify({'animoi-pets-v1':JSON.stringify([pet]),'animoi-posts-v2':JSON.stringify([post])}));assert.deepEqual(createRepository(s).read(),defaults({pets:[pet],posts:[post]}))});
test('corrupt stored data is reported without replacement',()=>{const s=storage();s.setItem('animoi-pets-v1','oops');assert.throws(()=>createRepository(s).read());assert.equal(s.getItem('animoi-pets-v1'),'oops')});
test('failure to reserve journal leaves existing data intact',()=>{const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});const write=s.setItem;s.setItem=(k,v)=>{if(k==='animoi-transaction-v1')throw Error('quota');write(k,v)};assert.throws(()=>r.deletePet('a'));assert.deepEqual(r.read(),defaults({pets:[pet],posts:[post]}))});
test('failed recovery retains journal until storage is writable again',()=>{const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});const write=s.setItem;s.setItem=(k,v)=>{if(k==='animoi-posts-v2')throw Error('quota');write(k,v)};assert.throws(()=>r.deletePet('a'),/journal/);assert(s.getItem('animoi-transaction-v1'));s.setItem=write;assert.deepEqual(r.read(),defaults({pets:[pet],posts:[post]}));assert.equal(s.getItem('animoi-transaction-v1'),null)});
test('version 2 backup retains original text and language; consent is disabled on restore',()=>{const r=createRepository(storage());r.write({pets:[pet],posts:[{...post,text:'Soy un gato.',originalLanguage:'es'}],settings:{language:'it',learningConsent:true}});const text=r.exportData();assert.equal(JSON.parse(text).version,2);r.restore(text);assert.equal(r.read().posts[0].originalLanguage,'es');assert.equal(r.read().posts[0].text,'Soy un gato.');assert.deepEqual(r.read().settings,{language:'it',learningConsent:false})});
test('version 1 backups preserve current language and do not guess legacy post language',()=>{const r=createRepository(storage());r.write({pets:[],posts:[],settings:{language:'de',learningConsent:false}});r.restore(JSON.stringify({app:'AniMoi',version:1,pets:[pet],posts:[post]}));assert.equal(r.read().settings.language,'de');assert.equal(r.read().posts[0].originalLanguage,undefined)});
test('language metadata validation is extensible and rejects malformed tags',()=>{const r=createRepository(storage());r.write({pets:[pet],posts:[{...post,originalLanguage:'pt-BR'}]});assert.equal(r.read().posts[0].originalLanguage,'pt-BR');assert.throws(()=>r.write({pets:[pet],posts:[{...post,originalLanguage:'<script>'}]}));assert.equal(r.read().posts[0].originalLanguage,'pt-BR')});
test('settings quota failure rolls all three collections back',()=>{const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});const write=s.setItem;let once=true;s.setItem=(k,v)=>{if(k==='animoi-settings-v1'&&once){once=false;throw Error('quota')}write(k,v)};assert.throws(()=>r.write({pets:[],posts:[],settings:{language:'en',learningConsent:false}}));assert.deepEqual(r.read(),defaults({pets:[pet],posts:[post]}))});
test('optional local account information survives export and restore without changing posts',()=>{const r=createRepository(storage());r.write({pets:[pet],posts:[post],settings:{language:'fr',learningConsent:false,account:{displayName:'Pseudo test'}}});const backup=r.exportData();r.write({pets:[],posts:[]});r.restore(backup);assert.equal(r.read().settings.account.displayName,'Pseudo test');assert.deepEqual(r.read().posts,[post])});
test('invalid account information never replaces an existing dataset',()=>{const r=createRepository(storage());r.write({pets:[pet],posts:[post]});for(const account of [null,[],{displayName:12},{displayName:'x'.repeat(81)}])assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version:2,pets:[],posts:[],settings:{language:'fr',learningConsent:false,account}})));assert.deepEqual(r.read(),defaults({pets:[pet],posts:[post]}))});
const metadata=()=>({version:1,breed:{status:'selected',ids:['catalogue:origin-a','future:origin-b'],primaryId:'catalogue:origin-a',custom:['Une origine personnelle']},temperament:{ids:['playful','curious','future:trait'],custom:['Doux avec ses compagnons']}});
test('structured origins, multiple traits, legacy text and profile extensions survive backup round trips',()=>{
  const r=createRepository(storage()),profile={...pet,breed:'Ancien texte de race',traits:'Ancien caractère libre',characteristics:metadata(),futureProfileField:{important:'conservé'}};
  const original=defaults({pets:[profile],posts:[post]});r.write(original);
  const backup=r.exportData();assert.equal(JSON.parse(backup).version,2);
  r.deletePet(pet.id);r.restore(backup);assert.deepEqual(r.read(),original);
  for(const version of [1,2]){r.restore(JSON.stringify({app:'AniMoi',version,...original}));assert.deepEqual(r.read(),original)}
});
test('legacy-only reads perform no automatic migration or storage write',()=>{
  const s=storage();s.setItem('animoi-pets-v1',JSON.stringify([pet]));s.setItem('animoi-posts-v2',JSON.stringify([post]));
  let writes=0;const set=s.setItem,remove=s.removeItem;s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  const state=createRepository(s).read();assert.equal(writes,0);assert.equal(Object.hasOwn(state.pets[0],'characteristics'),false);assert.deepEqual(state.pets,[pet]);
});
test('editing structured choices keeps long or multiline historical text in version 1 and 2 backups',()=>{
  const characteristics=require('../v2-preview/characteristics.js');
  for(const text of ['Caractère historique '.repeat(30),'Une origine\nUne autre origine']) {
    const r=createRepository(storage()),legacy={...pet,breed:text,traits:text};
    r.write({pets:[legacy],posts:[post]});
    const value=characteristics.read(legacy);value.temperament.ids=['playful'];
    value.breed.status='selected';value.breed.ids=['future:origin'];
    const updated={...legacy,characteristics:value};r.write({pets:[updated],posts:[post]});
    for(const version of [1,2]){const backup=JSON.parse(r.exportData());backup.version=version;r.deletePet(pet.id);r.restore(JSON.stringify(backup));assert.deepEqual(r.read().pets,[updated]);assert.equal(r.read().pets[0].characteristics.temperament.legacyText,text)}
  }
});
test('malformed imported characteristic metadata cannot partially replace existing profiles or posts',()=>{
  const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});
  const snapshot=['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1'].map(key=>s.getItem(key));
  const invalid=[null,{},[]];
  for(const mutate of [value=>value.breed.primaryId='not-selected',value=>value.breed.status='none',value=>value.temperament.custom=['x'.repeat(201)],value=>value.temperament.ids=['bad id']]){const value=metadata();mutate(value);invalid.push(value)}
  for(const characteristics of invalid){assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version:2,pets:[{...pet,id:'replacement',characteristics}],posts:[]})));assert.deepEqual(['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1'].map(key=>s.getItem(key)),snapshot);assert.equal(s.getItem('animoi-transaction-v1'),null)}
});
test('archived origins, inactive species detail and dominant temperament choices round-trip in existing backups',()=>{
  const c=require('../v2-preview/characteristics.js'),r=createRepository(storage()),value=metadata();
  value.temperament.dominant=['id:future:trait','custom:Doux avec ses compagnons'];
  value.speciesDetail={species:'Oiseau',text:'Perruche ondulée'};
  value.breed.extension={origin:'À conserver'};
  const archived=c.setBreedChoice(value,'unknown'),profile={...pet,breed:'Texte historique',traits:'Caractère historique',characteristics:archived};
  r.write({pets:[profile],posts:[post]});
  for(const version of [1,2]) {
    const backup=JSON.parse(r.exportData());backup.version=version;r.deletePet(pet.id);r.restore(JSON.stringify(backup));
    assert.deepEqual(r.read().pets,[profile]);
    const restored=c.setBreedChoice(r.read().pets[0].characteristics,'selected');
    assert.deepEqual(restored,value);assert.equal(r.read().pets[0].breed,'Texte historique');
  }
});
test('malformed new optional profile fields refuse restoration without any storage mutation',()=>{
  const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});
  const keys=['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1','animoi-transaction-v1'],snapshot=keys.map(key=>s.getItem(key));
  for(const mutate of [value=>value.speciesDetail={species:'Oiseau',text:'x'.repeat(201)},value=>value.speciesDetail={species:'Oiseau',text:'avec\nretour'},value=>value.temperament.dominant=['id:missing'],value=>value.temperament.dominant=['id:playful','id:playful'],value=>value.breed.retainedSelection={...metadata().breed,retainedSelection:metadata().breed},value=>value.breed.retainedSelection={...metadata().breed,primaryId:'missing'}]) {
    const characteristics=metadata();mutate(characteristics);
    assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version:2,pets:[{...pet,characteristics}],posts:[]})));
    assert.deepEqual(keys.map(key=>s.getItem(key)),snapshot);
  }
});
test('species catalogue references and their free-text fallback survive version 1 and 2 backups without migration',()=>{
  const c=require('../v2-preview/characteristics.js'),r=createRepository(storage()),value=c.setBreedChoice(metadata(),'not-applicable');
  value.speciesDetail={species:'Oiseau',text:'Ancienne variété personnelle',catalogueId:'future:bird-variety',extension:{source:'conservée'}};
  const profile={...pet,species:'Oiseau',characteristics:value};r.write({pets:[profile],posts:[post]});
  for(const version of [1,2]) {
    const backup=JSON.parse(r.exportData());backup.version=version;r.deletePet(pet.id);r.restore(JSON.stringify(backup));
    assert.deepEqual(r.read().pets,[profile]);assert.equal(c.speciesDetail(r.read().pets[0],'en'),'Ancienne variété personnelle');
  }
  delete value.speciesDetail.catalogueId;
  r.write({pets:[{...profile,characteristics:value}],posts:[post]});
  assert.equal(Object.hasOwn(r.read().pets[0].characteristics.speciesDetail,'catalogueId'),false);
});
test('invalid species catalogue ids refuse backup restoration atomically',()=>{
  const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});
  const keys=['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1','animoi-transaction-v1'],snapshot=keys.map(key=>s.getItem(key));
  for(const catalogueId of [null,17,'','bad id','id'.repeat(61)]) {
    const value=metadata();value.speciesDetail={species:'Oiseau',text:'Variété ancienne',catalogueId};
    assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version:2,pets:[{...pet,characteristics:value}],posts:[]})));
    assert.deepEqual(keys.map(key=>s.getItem(key)),snapshot);
  }
});
test('birth dates and estimated ages remain optional and round-trip unchanged with unknown profile fields',()=>{
  const r=createRepository(storage());
  const profiles=[{...pet,birthDate:'2020-02-29',estimatedAge:null,futureLife:{keep:'yes'}},{...pet,id:'estimated',birthDate:null,estimatedAge:{years:1,months:7,recordedOn:'2026-01-01',futureExtension:'preserved'}},{...pet,id:'unknown'}];
  r.write({pets:profiles,posts:[post]});
  for(const version of [1,2]){const backup=JSON.parse(r.exportData());backup.version=version;r.deletePet(pet.id);r.restore(JSON.stringify(backup));assert.deepEqual(r.read().pets,profiles)}
  assert.equal(Object.hasOwn(r.read().pets[2],'birthDate'),false);
});
test('invalid and future birth dates or estimated ages refuse restoration atomically',()=>{
  const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});
  const keys=['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1','animoi-transaction-v1'],snapshot=keys.map(key=>s.getItem(key));
  for(const fields of [{birthDate:'9999-12-31'},{birthDate:'2025-02-29'},{birthDate:''},{birthDate:17},{estimatedAge:{years:1,months:12,recordedOn:'2026-01-01'}},{estimatedAge:{years:-1,months:0,recordedOn:'2026-01-01'}}]){
    assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version:2,pets:[{...pet,...fields}],posts:[]})));
    assert.deepEqual(keys.map(key=>s.getItem(key)),snapshot);
  }
});
test('age-aware reads never migrate profiles or rewrite storage and allow a clock-relative future birth date',()=>{
  const s=storage(),profiles=[pet,{...pet,id:'clock-relative',birthDate:'9999-12-31'}];
  s.setItem('animoi-pets-v1',JSON.stringify(profiles));s.setItem('animoi-posts-v2',JSON.stringify([post]));
  let writes=0;const set=s.setItem,remove=s.removeItem;s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  assert.deepEqual(createRepository(s).read().pets,profiles);assert.equal(writes,0);
});
const postDeletionState=()=>({pets:[{...pet,photo:'data:image/png;base64,AAAA',extraProfile:{keep:true}},{...pet,id:'other',name:'Autre animal'}],posts:[{...post,text:'Mon texte #Animoi #VieDAnimal #Chat',originalLanguage:'fr',extension:{keep:true}},{...post,id:'same-animal-second',text:'Un autre récit'}, {...post,id:'other-animal',petId:'other',text:'Other story #AnimalLife',originalLanguage:'en'},{...post,id:'legacy-orphan',petId:'absent',text:'Ancienne publication orpheline'}],settings:{language:'it',learningConsent:false,autoTranslate:true,futurePreference:{keep:true}}});
const storedKeys=['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1','animoi-transaction-v1'];
test('deleting a single identified post returns it and preserves profiles, photos, other posts and orphans',()=>{
  const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);
  const unchangedPets=s.getItem('animoi-pets-v1'),unchangedSettings=s.getItem('animoi-settings-v1');
  const deleted=r.deletePost(post.id,pet.id,JSON.stringify(state.posts[0]));
  assert.deepEqual(deleted,state.posts[0]);assert.deepEqual(r.read(),{...state,posts:state.posts.slice(1)});
  assert.equal(s.getItem('animoi-pets-v1'),unchangedPets);assert.equal(s.getItem('animoi-settings-v1'),unchangedSettings);assert.equal(s.getItem('animoi-transaction-v1'),null);
});
test('missing, already deleted and wrong-animal posts refuse deletion without storage changes',()=>{
  const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);
  let writes=0;const set=s.setItem,remove=s.removeItem;s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  const before=storedKeys.map(key=>s.getItem(key));
  for(const [id,petId] of [['missing',pet.id],[post.id,'other'],[post.id,'missing'],[null,pet.id],[post.id,null]]) {
    assert.throws(()=>r.deletePost(id,petId),error=>error.code==='post.missing');assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);
  }
  assert.equal(writes,0);
  r.deletePost(post.id,pet.id);const after=storedKeys.map(key=>s.getItem(key));writes=0;
  assert.throws(()=>r.deletePost(post.id,pet.id),error=>error.code==='post.missing');assert.deepEqual(storedKeys.map(key=>s.getItem(key)),after);assert.equal(writes,0);
});
test('a stale post snapshot cannot delete concurrently changed text or metadata',()=>{
  for(const mutate of [value=>value.text+=' #TexteModifié',value=>value.originalLanguage='de',value=>value.extension.keep=false,value=>value.editedAt=789]) {
    const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);const expected=JSON.stringify(state.posts[0]);
    const changed=r.read();mutate(changed.posts[0]);r.write(changed);const before=storedKeys.map(key=>s.getItem(key));
    assert.throws(()=>r.deletePost(post.id,pet.id,expected),error=>error.code==='post.changed');assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);
  }
});
test('post deletion preserves unrelated changes made after the confirmation snapshot',()=>{
  const r=createRepository(storage()),state=postDeletionState();r.write(state);const expected=JSON.stringify(state.posts[0]);
  const changed=r.read();changed.pets[1].traits='Curieux';changed.posts[2].text+=' #MonNouveauTag';changed.settings.autoTranslate=false;r.write(changed);
  r.deletePost(post.id,pet.id,expected);assert.deepEqual(r.read(),{...changed,posts:changed.posts.slice(1)});
});
test('failed journal reservation during post deletion leaves all storage intact',()=>{
  const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);const before=storedKeys.map(key=>s.getItem(key));
  const set=s.setItem;s.setItem=(key,value)=>{if(key==='animoi-transaction-v1')throw Error('journal quota');set(key,value)};
  assert.throws(()=>r.deletePost(post.id,pet.id),/journal quota/);assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);
});
test('quota failures at each collection write roll a post deletion back',()=>{
  for(const failureKey of ['animoi-pets-v1','animoi-posts-v2','animoi-settings-v1']) {
    const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);const before=storedKeys.map(key=>s.getItem(key));
    const set=s.setItem;let once=true;s.setItem=(key,value)=>{if(key===failureKey&&once){once=false;throw Error('quota')}set(key,value)};
    assert.throws(()=>r.deletePost(post.id,pet.id),/quota/);assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);assert.deepEqual(r.read(),state);
  }
});
test('interrupted post deletion recovery retains its journal until storage works again',()=>{
  const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);const set=s.setItem;
  s.setItem=(key,value)=>{if(key==='animoi-posts-v2')throw Error('quota');set(key,value)};
  assert.throws(()=>r.deletePost(post.id,pet.id),/journal/);assert(s.getItem('animoi-transaction-v1'));
  s.setItem=set;assert.deepEqual(r.read(),state);assert.equal(s.getItem('animoi-transaction-v1'),null);
});
test('a backup before individual post deletion restores it and a backup after retains the deletion',()=>{
  const r=createRepository(storage()),state=postDeletionState();r.write(state);const before=r.exportData();r.deletePost(post.id,pet.id);const after=r.exportData();
  const remaining={...state,posts:state.posts.slice(1)};
  for(const version of [1,2]){
    const oldBackup=JSON.parse(before);oldBackup.version=version;r.restore(JSON.stringify(oldBackup));assert.deepEqual(r.read(),state);
    const newBackup=JSON.parse(after);newBackup.version=version;r.restore(JSON.stringify(newBackup));assert.deepEqual(r.read(),remaining);
  }
});
test('optional automatic-translation preference round-trips true and false without changing publication originals',()=>{
  const r=createRepository(storage());
  for(const autoTranslate of [true,false])for(const version of [1,2]) {
    const state=postDeletionState();state.settings.autoTranslate=autoTranslate;r.write(state);
    const backup=JSON.parse(r.exportData());backup.version=version;r.write({pets:[],posts:[]});r.restore(JSON.stringify(backup));assert.deepEqual(r.read(),state);
  }
});
test('old profiles and version 1 or 2 backups keep the auto-translation preference absent without migration',()=>{
  const s=storage(),r=createRepository(s);r.write({pets:[pet],posts:[post]});
  assert.equal(Object.hasOwn(r.read().settings,'autoTranslate'),false);
  let writes=0;const set=s.setItem,remove=s.removeItem;s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  r.read();r.exportData();assert.equal(writes,0);
  for(const version of [1,2]) {
    r.restore(JSON.stringify({app:'AniMoi',version,pets:[pet],posts:[post]}));assert.equal(Object.hasOwn(r.read().settings,'autoTranslate'),false);
    r.restore(JSON.stringify({app:'AniMoi',version,pets:[pet],posts:[post],settings:{language:'fr',learningConsent:false}}));assert.equal(Object.hasOwn(r.read().settings,'autoTranslate'),false);
  }
});
test('invalid automatic-translation preferences refuse writes and restorations atomically',()=>{
  const s=storage(),r=createRepository(s),state=postDeletionState();r.write(state);const before=storedKeys.map(key=>s.getItem(key));
  for(const autoTranslate of [null,0,1,'true','false',{},[]]) {
    const invalid={...state,settings:{...state.settings,autoTranslate}};
    assert.throws(()=>r.write(invalid),error=>error.code==='settings.autoTranslate');
    for(const version of [1,2])assert.throws(()=>r.restore(JSON.stringify({app:'AniMoi',version,...invalid})),error=>error.code==='settings.autoTranslate');
    assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);
  }
});

const publicationPhoto=label=>'data:image/jpeg;base64,'+Buffer.from('synthetic-photo:'+label).toString('base64');
const photoPublicationState=()=>{
  const state=postDeletionState();
  state.posts[0].photo=publicationPhoto('story-one');
  state.posts[1].photo=publicationPhoto('story-two');
  state.posts[0].futureMediaMetadata={keep:['original',1]};
  return state;
};
test('post photos and profile photos remain independent across version 1 and 2 JSON round trips',()=>{
  const r=createRepository(storage()),state=photoPublicationState();r.write(state);
  assert.notEqual(state.posts[0].photo,state.pets[0].photo);
  for(const version of [1,2]) {
    const backup=JSON.parse(r.exportData());backup.version=version;
    r.write({pets:[],posts:[]});r.restore(JSON.stringify(backup));
    assert.deepEqual(r.read(),state);
    assert.equal(Object.hasOwn(r.read().posts[2],'photo'),false);
    assert.equal(Object.hasOwn(r.read().posts[3],'photo'),false);
    assert.equal(r.read().posts[0].text,'Mon texte #Animoi #VieDAnimal #Chat');
    assert.equal(r.read().posts[0].originalLanguage,'fr');
  }
});
test('replacing or removing one publication photo keeps identity, original text, metadata and other stories',()=>{
  const r=createRepository(storage()),original=photoPublicationState();r.write(original);
  const backup=r.exportData(),edited=r.read();edited.posts[0].photo=publicationPhoto('replacement');r.write(edited);
  assert.equal(r.read().posts.length,original.posts.length);
  assert.deepEqual(r.read().posts[0],{...original.posts[0],photo:publicationPhoto('replacement')});
  assert.deepEqual(r.read().pets,original.pets);assert.deepEqual(r.read().posts.slice(1),original.posts.slice(1));
  const removed=r.read();delete removed.posts[0].photo;r.write(removed);
  const {photo,...withoutPhoto}=original.posts[0];assert(photo);
  assert.deepEqual(r.read().posts[0],withoutPhoto);assert.deepEqual(r.read().posts.slice(1),original.posts.slice(1));
  r.restore(backup);assert.deepEqual(r.read(),original);
});
test('quota failure while saving a replacement publication photo preserves all previous bytes',()=>{
  for(const failureKey of storedKeys) {
    const s=storage(),r=createRepository(s),original=photoPublicationState();r.write(original);
    const before=storedKeys.map(key=>s.getItem(key)),changed=r.read();changed.posts[0].photo=publicationPhoto('replacement');
    const set=s.setItem;let once=true;
    s.setItem=(key,value)=>{if(key===failureKey&&once){once=false;throw Error('photo quota')}set(key,value)};
    assert.throws(()=>r.write(changed),/photo quota/);
    assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);assert.deepEqual(r.read(),original);
  }
});
test('deleting a photo publication leaves its animal and other photos intact and its backup restores it',()=>{
  const r=createRepository(storage()),state=photoPublicationState();r.write(state);const backup=r.exportData();
  r.deletePost(state.posts[0].id,state.posts[0].petId,JSON.stringify(state.posts[0]));
  assert.deepEqual(r.read().pets,state.pets);assert.deepEqual(r.read().posts,state.posts.slice(1));
  assert.equal(r.read().posts[0].photo,state.posts[1].photo);
  r.restore(backup);assert.deepEqual(r.read(),state);
});
test('reading or exporting mixed photo and legacy text-only publications performs no migration or implicit write',()=>{
  const s=storage(),r=createRepository(s),state=photoPublicationState();r.write(state);
  const before=storedKeys.map(key=>s.getItem(key));let writes=0;
  const set=s.setItem,remove=s.removeItem;s.setItem=(...args)=>{writes++;set(...args)};s.removeItem=(...args)=>{writes++;remove(...args)};
  assert.deepEqual(r.read(),state);
  const backup=JSON.parse(r.exportData());assert.equal(backup.version,2);assert.deepEqual(backup.posts,state.posts);
  assert.equal(Object.hasOwn(backup.posts[2],'photo'),false);
  assert.deepEqual(storedKeys.map(key=>s.getItem(key)),before);assert.equal(writes,0);
});
