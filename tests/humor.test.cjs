'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const humor=require('../v2-preview/humor.js');
const formatter=require('../v2-preview/story-formatter.js');
const {createRepository}=require('../v2-preview/data.js');
const pet={id:'a',name:'Animal fictif',species:'Chien',breed:'fox-terrier',traits:'joueur',photo:'',characteristics:{version:1,breed:{status:'unknown',ids:[],primaryId:null,custom:[]},temperament:{ids:['playful','curious','calm'],custom:[],dominant:['id:playful','id:curious']}}};
function memory(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),snapshot:()=>JSON.stringify([...data])};}
for(const language of ['fr','en','es','de','it']) {
  test(language+': three translated variants and an amusing main tone',()=>{
    let messages;vm.runInNewContext(fs.readFileSync(require.resolve('../v2-preview/locales/'+language+'.js'),'utf8'),{AniMoiI18n:{register:(code,data)=>messages=data}});
    for(const key of ['tone.funny','humor.title',...humor.variants.flatMap(id=>['humor.'+id,'humor.'+id+'Hint'])])assert(messages[key]?.trim(),key);
    assert.equal(new Set(humor.variants.map(id=>messages['humor.'+id])).size,3);
    if(language==='fr')assert.equal(messages['tone.funny'],'Amusant');
  });
  for(const variant of humor.variants)test(language+'/'+variant+': instruction context retains facts, species, dominant traits and category without mutating the profile',()=>{
    const before=JSON.stringify(pet),story='Mon animal reste sur le canapé.';
    for(const rubric of ['pawbook','sav','linkedin','potins']){
      const value=humor.context(pet,{tone:'drôle',humorVariant:variant,story,rubric,language});
      assert.equal(value.tone,'amusing');assert.equal(value.humorVariant,variant);assert.equal(value.rubric,rubric);assert.equal(value.story,story);
      assert.equal(value.animal.species,'Chien');assert.equal(value.animal.legacy.breed,'fox-terrier');
      assert.deepEqual(value.animal.temperament.dominant,pet.characteristics.temperament.dominant);
      assert.equal(value.animal.temperament.dominantLabels.length,2);
      assert.equal(value.instructions.inventEvents,false);assert.equal(value.instructions.dominantTraitsTakePriority,true);assert.equal(value.instructions.listPersonalityTraits,false);
    }
    assert.equal(JSON.stringify(pet),before);
  });
  test(language+': local closing styles are distinct and leave anecdote and hashtags intact',()=>{
    const base=language==='fr'?'COMMUNIQUÉ\n\nVoici les faits : « Le canapé. »\n\nFin.':formatter.format(pet,'Le canapé.','drôle','pawbook',language);
    const source=base+'\n\n#Animoi #Marque';
    const texts=humor.variants.map(variant=>humor.style(source,variant,language));
    assert.equal(new Set(texts).size,3);
    for(const text of texts){assert(text.startsWith(base.slice(0,base.lastIndexOf('\n\n'))));assert(text.endsWith('#Animoi #Marque'));assert(text.includes('Le canapé.'));assert(!text.includes('Mon caractère :'));}
  });
}
test('legacy amusing tone defaults to funny while all other tones have no humour instruction',()=>{
  assert.equal(humor.context(pet,{tone:'drôle'}).humorVariant,'funny');
  assert.equal(humor.context(pet,{tone:'amusant'}).tone,'amusing');
  for(const tone of ['sérieux','triste','tendre','en colère','dramatique','philosophe']){const value=humor.context(pet,{tone,humorVariant:'wacky'});assert.equal(value.tone,tone);assert.equal(value.humorVariant,null);assert.equal(value.instructions.humorousEnding,false);}
});
test('JSON restoration preserves all variants and exact historical originals without migration',()=>{
  const repository=createRepository(memory());
  const posts=[{id:'old',petId:'a',text:'  Ancien texte. #Marque\n ',date:1,tone:'drôle'},...humor.variants.map((humorVariant,index)=>({id:humorVariant,petId:'a',text:'Mon histoire. #Animoi #Marque',date:index+2,tone:'drôle',humorVariant,originalLanguage:'fr'}))];
  repository.write({pets:[pet],posts,settings:{language:'fr',learningConsent:false}});
  const backup=repository.exportData(), restored=createRepository(memory());
  restored.restore(backup);
  assert.deepEqual(restored.read().posts,posts);assert.deepEqual(restored.read().pets,[pet]);
  assert.equal(Object.hasOwn(restored.read().posts[0],'humorVariant'),false);
});
test('invalid variants are refused before any local write',()=>{
  const storage=memory(),repository=createRepository(storage),before=storage.snapshot();
  for(const humorVariant of [null,[],{},17,'unknown'])assert.throws(()=>repository.write({pets:[pet],posts:[{id:'a',petId:'a',text:'Texte',date:1,humorVariant}],settings:{language:'fr',learningConsent:false}}));
  assert.equal(storage.snapshot(),before);
});
