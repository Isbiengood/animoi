const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fixture = require('./fixtures/legacy-personality-publications.json');
const formatter = require('../v2-preview/story-formatter.js');
const model = require('../v2-preview/characteristics.js');
const publications = require('../v2-preview/caption.js');
const i18n = require('../v2-preview/i18n.js');
const {createRepository} = require('../v2-preview/data.js');
const labels = {fr:'Mon caractère : ', en:'My personality: ', es:'Mi carácter: ', de:'Mein Charakter: ', it:'Il mio carattere: '};

test('the current French generator gives recognised dominant traits priority in all four rubrics without printing their names', () => {
  const profile=JSON.parse(JSON.stringify(fixture.profile));
  profile.characteristics.temperament.dominant=['id:curious','id:playful','id:calm'];
  const before=JSON.stringify(profile);
  const context={AniMoiCharacteristics:model,AniMoiPublications:publications,AniMoiStoryFormatter:formatter,AniMoiI18n:i18n};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../v2-preview/index.html'),'utf8').split('\n').filter(line=>/^function (?:personality|formulate)\(/.test(line)).join('\n'),context);
  i18n.setLocale('fr');
  for(const rubric of ['pawbook','sav','linkedin','potins']) {
    const text=context.formulate(profile,fixture.stories.fr,'tendre',rubric);
    const curious=text.indexOf('Il faut absolument que j’explore cette affaire.');
    const playful=text.indexOf('Moi, je transforme chaque imprévu en terrain de jeu.');
    const calm=text.indexOf('Je prends le temps de savourer les petits moments.');
    assert(curious>=0&&curious<playful&&playful<calm,rubric+': dominant priorities govern natural reaction order');
    assert(!text.includes('Mon caractère : '));assert(!text.includes('Trait personnel fictif'));
  }
  assert.equal(JSON.stringify(profile),before);
});

test('recognised custom dominant traits influence the French voice naturally and duplicate reactions are avoided', () => {
  const profile={...fixture.profile,characteristics:{...fixture.profile.characteristics,temperament:{ids:['curious'],custom:['Actif','Espiègle'],dominant:['custom:Espiègle','id:curious']}}};
  const before=JSON.stringify(profile),context={AniMoiCharacteristics:model};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../v2-preview/index.html'),'utf8').split('\n').find(line=>line.startsWith('function personality(')),context);
  const text=context.personality(profile);
  assert(text.indexOf('terrain de jeu')<text.indexOf('j’explore'));
  assert.equal(text.split('terrain de jeu').length-1,1);
  assert(!text.includes('Actif')&&!text.includes('Espiègle')&&!text.includes('Mon caractère'));
  assert.equal(JSON.stringify(profile),before);
  assert.deepEqual(model.toAIContext(profile,'fr').temperament.dominant,['custom:Espiègle','id:curious']);
});

for (const locale of Object.keys(labels)) test(locale + ': all four legacy frames and seven tones hide only the generated list without mutating originals', () => {
  for (const item of fixture.cases.filter(item => item.locale === locale)) {
    const frozen = Object.freeze({...item});
    const before = JSON.stringify(frozen);
    assert(item.text.includes(labels[locale]), 'fixture must reproduce V9 enumeration');
    const visible = formatter.publicationText(item.text);
    assert(!visible.includes(labels[locale]), item.rubric + '/' + item.tone);
    assert(!visible.includes('Trait personnel fictif'));
    assert(visible.includes(fixture.stories[locale]), 'author words/hashtags remain literal');
    assert(visible.includes('Animal fictif'));
    assert(visible.includes('Origine fictive'));
    assert.equal(visible.split('\n\n').at(-1), item.text.split('\n\n').at(-1));
    assert.equal(formatter.publicationText(visible), visible, 'projection is idempotent');
    assert.equal(JSON.stringify(frozen), before);
  }
});

test('new generation keeps traits private in every tone, rubric and language while retaining their AI context', () => {
  const context = {AniMoiCharacteristics:model, AniMoiPublications:publications, AniMoiStoryFormatter:formatter, AniMoiI18n:i18n};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../v2-preview/index.html'),'utf8').split('\n').filter(line => /^function (?:personality|formulate)\(/.test(line)).join('\n'), context);
  const before = JSON.stringify(fixture.profile), aiBefore = model.toAIContext(fixture.profile, 'fr');
  for (const item of fixture.cases) {
    i18n.setLocale(item.locale);
    const text = context.formulate(fixture.profile, fixture.stories[item.locale], item.tone, item.rubric);
    assert(!Object.values(labels).some(label => text.includes(label)));
    assert(!text.includes('Trait personnel fictif'));
    assert(text.includes('Animal fictif') && text.includes('Origine fictive'));
    assert(text.includes(fixture.stories[item.locale]));
  }
  assert.equal(JSON.stringify(fixture.profile), before);
  assert.deepEqual(model.toAIContext(fixture.profile,'fr'), aiBefore);
  assert.deepEqual(aiBefore.temperament.dominant, ['id:playful','id:calm','id:curious']);
  assert.equal(model.traits.length, 52);
  i18n.setLocale('fr');
});

test('CRLF, surrounding whitespace and multiline historical traits are preserved outside the hidden list', () => {
  for (const locale of Object.keys(labels)) {
    const item=fixture.cases.find(item=>item.locale===locale);
    const traits=model.display(fixture.profile,locale).traits;
    const text='  '+item.text.replace(traits,'Trait ancien. Mot conservé\n\nAutre trait ancien').replace(/\n/g,'\r\n')+'  \r\n';
    const visible=formatter.publicationText(text);
    assert(!visible.includes(labels[locale]));
    assert(!visible.includes('Autre trait ancien'));
    assert(visible.startsWith('  ')); assert(visible.endsWith('  \r\n'));
    assert(visible.includes(fixture.stories[locale]));
    assert.equal(visible.split('\r\n\r\n').at(-1), text.split('\r\n\r\n').at(-1));
  }
});

test('ordinary authored prose, trait words and labels outside a recognised generated frame are never redacted', () => {
  for (const text of ['Je suis curieux et calme. #Curieux', 'Mon caractère : curieux. Je raconte cette aventure avec ma personnalité bien à moi.', 'My personality: Curious. I tell this adventure in my own way.', '<script>Mon caractère : calme</script>']) assert.equal(formatter.publicationText(text),text);
  for (const item of fixture.cases.filter(item=>item.tone==='drôle'&&item.rubric==='pawbook')) {
    const original=item.text.replace(fixture.stories[item.locale], fixture.stories[item.locale]+'\n\n'+labels[item.locale]+'Mes propres mots.');
    const visible=formatter.publicationText(original);
    assert(visible.includes(labels[item.locale]+'Mes propres mots.'), 'quoted owner anecdote remains exact');
    assert(!visible.includes('Trait personnel fictif'));
    assert.equal(formatter.publicationText('Titre personnel\n\n'+original), 'Titre personnel\n\n'+original, 'unrecognised edited frames are not guessed');
  }
});

test('an anecdote quoting a complete older communiqué remains intact in all five languages', () => {
  for (const locale of Object.keys(labels)) {
    const item=fixture.cases.find(item=>item.locale===locale&&item.rubric==='pawbook'&&item.tone==='drôle');
    const nested=item.text.replace(fixture.stories[locale],'ANECDOTE INTÉRIEURE À CONSERVER');
    const source=item.text.replace(fixture.stories[locale],nested);
    const projected=formatter.publicationText(source);
    assert(projected.includes(nested),locale+': never truncate a quoted story');
    assert.equal(source.split('Trait personnel fictif').length-projected.split('Trait personnel fictif').length,1,'hide only the outer profile list');
    assert.equal(formatter.publicationText(projected),projected,'quoted complete stories remain unchanged on repeated projection');
  }
});

test('all 31 French reaction combinations remain complete when only the profile enumeration is hidden', () => {
  const item=fixture.cases.find(item=>item.locale==='fr'&&item.rubric==='pawbook'&&item.tone==='drôle');
  const reactions=['Moi, je transforme chaque imprévu en terrain de jeu.','Changer d’avis ? Je préfère défendre mon idée jusqu’au bout.','Je préfère observer à l’abri avant de me lancer.','Je prends le temps de savourer les petits moments.','Il faut absolument que j’explore cette affaire.'];
  const traits=model.display(fixture.profile,'fr').traits;
  const oldReaction=[reactions[0],reactions[3],reactions[4]].join(' ');
  for(let mask=1;mask<32;mask++) {
    const expected=reactions.filter((_,index)=>mask&(1<<index)).join(' ');
    const source=item.text.replace(traits+'. '+oldReaction,traits+'. '+expected);
    assert(source.includes(traits+'. '+expected),'test has the intended historical reaction sequence');
    const visible=formatter.publicationText(source);
    assert(!visible.includes('Mon caractère : '));
    assert(visible.includes(expected),'keep every narrative reaction, mask '+mask);
  }
});

test('copy and native sharing use the visible presentation without changing the stored original', async () => {
  for (const locale of Object.keys(labels)) {
    const post=fixture.cases.find(item=>item.locale===locale), original=post.text;
    let shared,copied;
    await publications.shareText(post.text,{navigator:{share:async value=>shared=value.text}});
    await publications.copyText(post.text,{navigator:{clipboard:{writeText:async value=>copied=value}}});
    assert.equal(shared,publications.dedupeHashtags(formatter.publicationText(original)));
    assert.equal(copied,shared); assert(!shared.includes(labels[locale]));
    assert.equal(post.text,original);
  }
});

test('JSON export/restore keeps every character and dominant trait and every historical source text exactly', () => {
  const memory=new Map(), storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  const repo=createRepository(storage), posts=fixture.cases.map((item,index)=>({id:'legacy-'+index,petId:fixture.profile.id,text:item.text,date:index,originalLanguage:item.locale,rubric:item.rubric,...(item.rubric==='potins'?{editorial:{status:'draft'}}:{})}));
  repo.write({pets:[fixture.profile],posts,settings:{language:'fr',learningConsent:false}});
  const raw=Object.fromEntries(memory), before=repo.read(), backup=repo.exportData();
  for (const post of repo.read().posts) formatter.publicationText(post.text);
  assert.deepEqual(Object.fromEntries(memory),raw,'reading performs no storage writes');
  repo.restore(backup); assert.deepEqual(repo.read(),before);
  assert.deepEqual(repo.read().pets[0].characteristics.temperament.dominant, fixture.profile.characteristics.temperament.dominant);
});
