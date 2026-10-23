const {test} = require('node:test');
const assert = require('node:assert/strict');
const {format} = require('../v2-preview/story-formatter.js');

const pet = {name:'Malicia',species:'Chien',breed:'',traits:'',photo:''};
const stories = {
  en:'My human wanted to go for a walk, but it was raining.',
  es:'Mi humano quería salir de paseo, pero estaba lloviendo.',
  de:'Mein Mensch wollte spazieren gehen, aber es hat geregnet.',
  it:'Il mio umano voleva fare una passeggiata, ma pioveva.'
};
const firstPerson = {en:'I am Malicia, a dog.',es:'Soy Malicia, un perro.',de:'Ich bin Malicia, ein Hund.',it:'Sono Malicia, un cane.'};
const moods = ['drôle','sérieux','triste','tendre','en colère','dramatique','philosophe'];
const rubrics = ['pawbook','sav','linkedin','potins'];

test('four local language frames preserve the original anecdote and give the animal a first-person voice', () => {
  for (const [language, story] of Object.entries(stories)) {
    const text = format(pet,story,'drôle','pawbook',language);
    assert(text.includes(`« ${story} »`));
    assert(text.includes(firstPerson[language]));
    assert(!text.includes('Voici les faits selon mon humain'));
    assert(!text.includes('#Animoi'));
  }
});

test('all seven tones and four rubrics have distinct authored local phrases in each language', () => {
  for (const [language, story] of Object.entries(stories)) {
    const versions = moods.map(mood=>format(pet,story,mood,'pawbook',language));
    assert.equal(new Set(versions.map(text=>text.split('\n\n')[0])).size,moods.length);
    assert.equal(new Set(versions.map(text=>text.split('\n\n').at(-1))).size,moods.length);
    assert.equal(new Set(rubrics.map(rubric=>format(pet,story,'drôle',rubric,language).split('\n\n')[1])).size,rubrics.length);
    for (const mood of moods) for (const rubric of rubrics) {
      const text = format(pet,story,mood,rubric,language);
      assert(text.includes(firstPerson[language]));
      assert(text.includes(story));
      assert(!text.includes('undefined'));
    }
  }
});

test('structured breed labels remain visible while personality lists stay in the profile', () => {
  const profile = {...pet,characteristics:{version:1,breed:{status:'selected',ids:[],primaryId:null,custom:['Labrador']},temperament:{ids:['playful','curious'],custom:['Trait personnel']}}};
  const before = JSON.stringify(profile);
  const expected = {en:'Playful, Curious, Trait personnel',es:'Juguetón, Curioso, Trait personnel',de:'Verspielt, Neugierig, Trait personnel',it:'Giocherellone, Curioso, Trait personnel'};
  for (const [language, story] of Object.entries(stories)) {
    const text = format(profile,story,'tendre','pawbook',language);
    assert(!text.includes(expected[language]));
    assert(!text.includes('Trait personnel'));
    assert(text.includes('(Labrador)'));
  }
  assert.equal(JSON.stringify(profile),before);
});

test('legacy free text, names, markup-like text and multiline anecdotes stay literal plain text', () => {
  const profile = {...pet,name:'<img src=x onerror=alert(1)> & "🐾"',traits:'Mon trait ancien <b>exact</b>',breed:'Origine personnelle'};
  const original = '  My original words: <script>literal</script> & "quotes".\n\n#OwnTag  ';
  const before = JSON.stringify(profile);
  for (const language of Object.keys(stories)) {
    const text = format(profile,original,'sérieux','sav',language);
    assert(text.includes(`« ${original} »`));
    assert(text.includes(profile.name));
    assert(!text.includes(profile.traits));
    assert(text.includes('(Origine personnelle)'));
    assert(!text.includes('&lt;'));
  }
  assert.equal(JSON.stringify(profile),before);
});

test('regional language tags and future species have predictable safe fallbacks', () => {
  assert(format({...pet,species:'Ancienne espèce'},stories.en,'future','future','en-GB').includes('I am Malicia, an animal.'));
  assert.equal(format(pet,stories.en,'future','future','unknown'),format(pet,stories.en,'drôle','pawbook','en'));
  assert(!format(null,null,null,null,null).includes('undefined'));
});
