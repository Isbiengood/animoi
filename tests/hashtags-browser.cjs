'use strict';
// Synthetic mobile browser coverage only. Never contacts private hosting or a database.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const species=['Chien','Chat','Oiseau','Lapin','Cheval','Poisson','Hamster','Autre'];
const expected={
 fr:['VieDAnimal','Chien','Chat','Oiseau','Lapin','Cheval','Poisson','Hamster','Autre'],
 en:['AnimalLife','Dog','Cat','Bird','Rabbit','Horse','Fish','Hamster','Other'],
 es:['VidaAnimal','Perro','Gato','Pajaro','Conejo','Caballo','Pez','Hamster','Otro'],
 de:['Tierleben','Hund','Katze','Vogel','Kaninchen','Pferd','Fisch','Hamster','Andere'],
 it:['VitaAnimale','Cane','Gatto','Uccello','Coniglio','Cavallo','Pesce','Criceto','Altro']
};
const tags=(locale,index)=>['#Animoi','#'+expected[locale][0],'#'+expected[locale][index+1]];
const frenchStory='Mon humain et moi avons voulu sortir mais nous avons attendu parce que la pluie tombait dans le jardin.';
(async()=>{
 const root=path.resolve(__dirname,'..'),work=process.env.ANIMOI_HASHTAG_TEST_OUTPUT||'/workspace/work/animoi-international-hashtags';fs.mkdirSync(work,{recursive:true});
 const server=http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(request.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return}response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');response.end(data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 const errors=[],external=[],checks=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,locale:'en-US',timezoneId:'America/Los_Angeles',geolocation:{latitude:37.7749,longitude:-122.4194}});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);return route.abort()});
  await context.addInitScript(()=>{
   window.__hashtagShared=[];window.__hashtagCopied=[];
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.__hashtagShared.push(data)});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__hashtagCopied.push(text)}});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/v2-preview/index.html',{waitUntil:'networkidle'});
  const home=()=>page.locator('#openHome').tap();
  const flag=locale=>page.locator('.language-button[data-language='+JSON.stringify(locale)+']').tap();
  const card=index=>page.locator('.v2-card[data-pet-id='+JSON.stringify('hashtag-'+index)+']');
  const editor=page.locator('#editPost');
  const state=()=>page.evaluate(()=>AniMoiData.read());
  const rawContent=()=>page.evaluate(()=>({pets:localStorage.getItem('animoi-pets-v1'),posts:localStorage.getItem('animoi-posts-v2')}));
  const start=async(index,locale,story=frenchStory)=>{await home();if(locale)await flag(locale);await card(index).locator('.pet-open').tap();await page.locator('#newStory').tap();await page.locator('#story').fill(story);await page.locator('#generate').tap()};
  const count=(text,tag)=>{const folded=text.toLowerCase(),needle=tag.toLowerCase();return [...folded.matchAll(/#[\p{L}\p{M}\p{N}_]+/gu)].filter(match=>match[0]===needle).length};
  const assertTags=(text,locale,index)=>{for(const tag of tags(locale,index))assert.equal(count(text,tag),1,locale+' '+species[index]+' needs one '+tag)};
  const oldPosts=[{id:'legacy-french',petId:'hashtag-0',text:'Je conserve mon histoire et mes mots.\n\n#Animoi #VieDAnimal #Chien #MarqueAmie',date:1000,originalLanguage:'fr',futureMetadata:{keep:true}},{id:'legacy-foreign',petId:'hashtag-1',text:'Keep my own original words.\n\n#AnimalLife #Dog #PersonalBrand',date:2000,originalLanguage:'en',futureMetadata:{preserve:['old',1]}},{id:'orphan-post',petId:'missing-historical-animal',text:'Texto histórico. #VieDAnimal',date:3000,originalLanguage:'es'}];
  await page.evaluate(({species,posts})=>AniMoiData.write({pets:species.map((name,index)=>({id:'hashtag-'+index,name:'Animal fictif '+name,species:name,breed:'',traits:'',photo:'',futureProfileField:{keep:index}})),posts,settings:{language:'fr',learningConsent:false}}),{species,posts:oldPosts});await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>navigator.language),'en-US');assert.equal(await page.locator('html').getAttribute('lang'),'fr');const originalContent=await rawContent();const originalExport=await page.evaluate(()=>JSON.parse(AniMoiData.exportData()));
  assert.equal(await page.evaluate(story=>AniMoiPublications.detectLanguage(story,'en'),frenchStory),'fr');
  // The browser location/locale and narrative language cannot substitute for the explicitly selected UI language.
  for(const locale of Object.keys(expected)){
   for(let index=0;index<species.length;index++){
    await start(index,locale);const text=await editor.inputValue();assertTags(text,locale,index);assert(text.includes(frenchStory),'the original anecdote must not be translated');
    assert.deepEqual((text.match(/#[\p{L}\p{M}\p{N}_]+/gu)||[]),tags(locale,index),'exact default family for '+locale+'/'+species[index]);
    assert.equal(await editor.getAttribute('lang'),'fr','narrative metadata is independent from interface hashtag language');
    if(index===species.length-1){await page.locator('#share').tap();const sent=await page.evaluate(()=>window.__hashtagShared.at(-1));assert.equal(sent.text,text);assert.deepEqual(Object.keys(sent).sort(),['text','title']);}
    assert.deepEqual(await rawContent(),originalContent,'generating and sharing a draft must not rewrite existing profiles/posts');
   }
  }
  checks.push('All 40 combinations of eight species and five interface languages propose the expected unique hashtags; French anecdotes, US browser locale and simulated location do not determine hashtag language.');
  // Existing texts and international language metadata do not change when opening or changing flags.
  await home();await card(0).locator('.pet-open').tap();await page.locator('.v2-post[data-post-id="legacy-french"] .post-edit').tap();const oldEditor=await editor.inputValue();
  for(const locale of Object.keys(expected)){await flag(locale);assert.equal(await editor.inputValue(),oldEditor);assert.deepEqual(await rawContent(),originalContent);const exported=await page.evaluate(()=>JSON.parse(AniMoiData.exportData()));assert.deepEqual(exported.pets,originalExport.pets);assert.deepEqual(exported.posts,originalExport.posts)}
  await page.locator('#share').tap();assert.equal((await page.evaluate(()=>window.__hashtagShared.at(-1))).text,oldEditor);await page.locator('#savePost').tap();assert.deepEqual((await state()).posts,oldPosts);assert.equal((await state()).posts.length,oldPosts.length);
  checks.push('Opening existing publications, changing all five flags, sharing and an unchanged explicit save preserve original text, hashtags, ID/date/animal, language and unknown metadata; exported profile/post data remains identical.');
  // Newly generated tags can follow an interface switch; private prose/custom tags must stay owned by the author.
  await start(0,'fr');let generated=await editor.inputValue();const prose=generated.slice(0,generated.lastIndexOf('\n\n'));
  await editor.fill(generated+' #MarqueAmie #VieDAnimalFan');await flag('en');let changed=await editor.inputValue();assertTags(changed,'en',0);assert(changed.startsWith(prose),'flag changes may update suggestions, not rewrite the story');assert(changed.includes('#MarqueAmie')&&changed.includes('#VieDAnimalFan'));assert.equal(count(changed,'#VieDAnimal'),0);assert.equal(count(changed,'#Chien'),0);
  await page.locator('#savePost').tap();const international=(await state()).posts.at(-1);assert.equal(international.originalLanguage,'fr');assert.equal(international.petId,'hashtag-0');assert.equal(international.text,changed);
  checks.push('An unsaved new draft updates its generated suggestions with the chosen interface while retaining its prose/custom hashtags and original narrative language.');
  // A deliberately removed suggestion must remain removed, even through further switches, sharing and save.
  await start(0,'fr');await editor.fill((await editor.inputValue()).replace('#VieDAnimal',''));await flag('en');changed=await editor.inputValue();assert.equal(count(changed,'#AnimalLife'),0);assert.equal(count(changed,'#VieDAnimal'),0);assert.equal(count(changed,'#Animoi'),1);assert.equal(count(changed,'#Dog'),1);
  await editor.fill(changed.replace('#Animoi','')+' #MaMarque');await flag('es');changed=await editor.inputValue();assert.equal(count(changed,'#Animoi'),0);assert.equal(count(changed,'#VidaAnimal'),0);assert.equal(count(changed,'#Perro'),1);assert.equal(count(changed,'#MaMarque'),1);
  await page.locator('#share').tap();assert.equal((await page.evaluate(()=>window.__hashtagShared.at(-1))).text,changed.trim());await page.locator('#savePost').tap();const removed=(await state()).posts.at(-1);assert.equal(removed.text,changed.trim());assert(!removed.text.includes('#Animoi')&&!removed.text.includes('#VidaAnimal'));
  await start(0,'fr');await editor.fill('Mon texte corrigé sans aucun hashtag.');await flag('de');assert.equal(await editor.inputValue(),'Mon texte corrigé sans aucun hashtag.');await page.locator('#share').tap();assert.equal((await page.evaluate(()=>window.__hashtagShared.at(-1))).text,'Mon texte corrigé sans aucun hashtag.');
  checks.push('Deleted life/brand/species suggestions remain removed across flag changes, sharing and saving; replacing a draft with hashtag-free text never forces suggestions back.');
  // Literal hashtags typed inside the anecdote belong to the author, even when they match a former default.
  const literalStory=frenchStory+' Mon mot personnel reste #Chien et ma marque #VieDAnimalFan.';await start(0,'fr',literalStory);
  const consolidated=await editor.inputValue();assert(consolidated.endsWith('#Animoi #VieDAnimal #Chien'),'generation groups matching default tokens under the text, instead of deleting the species from the footer');assert.equal(count(consolidated,'#Chien'),1);
  await flag('en');changed=await editor.inputValue();assert(changed.includes(frenchStory));assert(changed.includes('Mon mot personnel reste Chien et ma marque #VieDAnimalFan.'));assert(changed.endsWith('#Animoi #AnimalLife #Chien'),'a hashtag originating in the anecdote remains author-owned even when consolidated in the footer');assert.equal(count(changed,'#Dog'),0);assert.equal(count(changed,'#VieDAnimalFan'),1);assert.deepEqual((await state()).posts.filter(post=>oldPosts.some(old=>old.id===post.id)),oldPosts);
  // Target-language collisions transfer no ownership to the application.
  await start(0,'fr');await editor.fill((await editor.inputValue())+' #DOG');await flag('en');changed=await editor.inputValue();assert.equal(count(changed,'#Dog'),1);assert(changed.includes('#DOG'),'keep the exact spelling of a preexisting custom target hashtag');assert.equal(count(changed,'#Chien'),0);await flag('es');changed=await editor.inputValue();assert(changed.includes('#DOG'));assert.equal(count(changed,'#Perro'),0,'a collided author-owned target must not be translated on a later switch');
  await start(0,'fr');await editor.fill((await editor.inputValue()).replace('#Chien','#MonChien'));await flag('en');changed=await editor.inputValue();assert.equal(count(changed,'#MonChien'),1);assert.equal(count(changed,'#Dog'),0);assert.equal(count(changed,'#AnimalLife'),1);
  checks.push('Literal hashtags in the original anecdote, custom brands, renamed suggestions, target-language collisions and historical mixed-language tags remain unmodified.');
  // Existing publication edits keep their own author choices instead of adopting new suggestions.
  await home();await card(0).locator('.pet-open').tap();await page.locator('.v2-post[data-post-id="legacy-french"] .post-edit').tap();const customEdit='Je corrige mon ancien texte.\n\n#MaMarque #Chien';await editor.fill(customEdit);for(const locale of ['de','it','en']){await flag(locale);assert.equal(await editor.inputValue(),customEdit)}await page.locator('#savePost').tap();const edited=(await state()).posts.find(post=>post.id==='legacy-french');assert.equal(edited.text,customEdit);assert.equal(edited.petId,'hashtag-0');assert.equal(edited.date,1000);assert.deepEqual(edited.futureMetadata,{keep:true});assert.equal((await state()).posts.filter(post=>post.id==='legacy-french').length,1);assert.deepEqual((await state()).posts.find(post=>post.id==='legacy-foreign'),oldPosts[1]);assert.deepEqual((await state()).posts.find(post=>post.id==='orphan-post'),oldPosts[2]);
  await start(2,'es');const copiedText=await editor.inputValue();assertTags(copiedText,'es',2);await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined})});await page.locator('#share').tap();assert.equal(await page.evaluate(()=>window.__hashtagCopied.at(-1)),copiedText);
  checks.push('Historical manual edits update the same publication without changing other animals or orphan records; fallback copy includes the complete localized text and hashtags.');
  // Export/restore round trip includes exact stored custom/translated tag text, never a regenerated representation.
  await home();await page.locator('#openAccount').tap();await flag('fr');const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).tap();const backupText=fs.readFileSync(await(await downloading).path(),'utf8'),backup=JSON.parse(backupText);assert.deepEqual(backup.posts,(await state()).posts);await page.evaluate(()=>{const s=AniMoiData.read();s.posts=s.posts.filter(post=>post.id!=='legacy-french');AniMoiData.write(s)});page.once('dialog',dialog=>dialog.accept());const preRestore=page.waitForEvent('download');const restoreNavigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.locator('#restoreFile').setInputFiles({name:'international-hashtags.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await Promise.all([preRestore,restoreNavigation]);await page.waitForFunction(()=>window.AniMoiData&&Array.isArray(window.AniMoiData.read().posts)&&window.AniMoiData.read().posts.some(post=>post.id==='legacy-french'));assert.equal(await page.locator('#homeScreen').isVisible(),true);assert.deepEqual((await state()).posts,backup.posts);assert.deepEqual((await state()).pets,backup.pets);
  checks.push('JSON backup and explicit restore preserve exact localized/manual hashtags, historical posts, metadata and all eight animals.');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);const report={status:'passed',matrixCombinations:40,languages:Object.keys(expected),species,browserLocale:'en-US',simulatedLocation:'US',viewport:{width:390,height:844},checks,pageErrors:errors,outsideRequests:external,physicalSafariTest:false};fs.writeFileSync(path.join(work,'hashtags-browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
