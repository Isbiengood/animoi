'use strict';
// Isolated synthetic stories. Never opens hosting, Neon or real browser data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');

(async()=>{
 const root=path.resolve(__dirname,'..'),work=process.env.ANIMOI_RUBRICS_TEST_OUTPUT||'/workspace/work/animoi-rubrics';fs.mkdirSync(work,{recursive:true});
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data)});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin='http://127.0.0.1:'+server.address().port;let browser;
 const report={status:'running',checks:[],pageErrors:[],outsideRequests:[],physicalSafariTest:false};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Paris'});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.outsideRequests.push(url);return route.abort()});
  await context.addInitScript(()=>{
   window.__rubricShares=[];window.__rubricCopies=[];window.__rubricStorageWrites=[];
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.__rubricShares.push({text:data.text,title:data.title,url:data.url,files:data.files?.length||0})});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__rubricCopies.push(text)}});
   for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){if(this===localStorage)window.__rubricStorageWrites.push({method,key:args[0]});return original.apply(this,args)}}
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(origin+'/v2-preview/index.html',{waitUntil:'networkidle'});
  const state=()=>page.evaluate(()=>AniMoiData.read());
  const raw=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])));
  const content=()=>page.evaluate(()=>({pets:localStorage.getItem('animoi-pets-v1'),posts:localStorage.getItem('animoi-posts-v2')}));
  const home=()=>page.locator('#openHome').tap();
  const card=id=>page.locator('.v2-card[data-pet-id='+JSON.stringify(id)+']');
  const history=id=>page.locator('#petHistory .publication-card[data-post-id='+JSON.stringify(id)+']');
  const networkPost=id=>page.locator('#networkScreen .publication-card[data-post-id='+JSON.stringify(id)+']');
  const openAnimal=async id=>{await home();await card(id).locator('.pet-open').tap()};
  const network=async()=>{await page.locator('#openNetwork').tap();await page.locator('#networkAll').tap()};
  const universe=async id=>{await page.locator('#openNetwork').tap();await page.locator('.universe-button[data-rubric='+JSON.stringify(id)+']').tap()};
  const checkLayout=async label=>{
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,label+' horizontal overflow');
   for(const button of await page.locator('button:visible, summary:visible').all()){
    const box=await button.boundingBox();assert(box&&box.height>=43.5&&box.width>=43.5,label+' undersized target '+await button.textContent());
   }
  };
  const fixture=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=12;canvas.height=12;canvas.getContext('2d').fillStyle='#7042bb';canvas.getContext('2d').fillRect(0,0,12,12);const photo=canvas.toDataURL('image/png');
   const text='  Mon récit historique reste intact.\r\n\r\n#Animoi #VieDAnimal #Chat #Chat\r\n ';
   return {pets:[{id:'rubric-a',name:'Animal A fictif',species:'Chat',breed:'Origine libre',traits:'curieux',photo,futureProfile:{keep:true}},{id:'rubric-b',name:'Animal B fictif',species:'Chien',breed:'',traits:'calme',photo:''}],posts:[
    {id:'legacy',petId:'rubric-a',text,date:1000,originalLanguage:'pt-BR',photo,futurePost:{keep:['original']}},
    {id:'future-rubric',petId:'rubric-a',text:'Une rubrique future reste lisible. #MaMarque',date:1100,rubric:'future-universe',futurePost:{keep:true}},
    {id:'pawbook',petId:'rubric-a',text:'Je savoure une promenade. #Animoi #VieDAnimal #Chat',date:2000,rubric:'pawbook',tone:'tendre',title:'Une petite aventure',photo,originalLanguage:'fr'},
    {id:'sav',petId:'rubric-a',text:'Je réclame une friandise. #Animoi #VieDAnimal #Chat',date:3000,rubric:'sav',tone:'drôle',title:'Une réclamation',rubricData:{sav:{subject:'Gamelle insuffisante',status:'received',reply:'Votre demande sera examinée.',extension:'keep'}},originalLanguage:'fr'},
    {id:'linkedin',petId:'rubric-a',text:'I am promoted to head of naps. #Animoi #AnimalLife #Cat',date:4000,rubric:'linkedin',tone:'sérieux',title:'Une promotion imaginaire',rubricData:{linkedin:{kind:'promotion',role:'Responsable des siestes'}},originalLanguage:'en'},
    {id:'potins',petId:'rubric-a',text:'Je propose une enquête sur le coussin. #Animoi #VieDAnimal #Chat',date:5000,rubric:'potins',tone:'drôle',title:'Un potin volontaire',photo,editorial:{status:'draft'},originalLanguage:'fr'},
    {id:'imported-published',petId:'rubric-a',text:'Un statut importé ne constitue pas une validation réelle. #Ancien',date:6000,rubric:'potins',editorial:{status:'published',editionId:'synthetic-import'},originalLanguage:'fr'},
    {id:'other-animal',petId:'rubric-b',text:'Une autre histoire indépendante. #Chien',date:7000,originalLanguage:'fr'},
    {id:'orphan',petId:'missing-pet',text:'Une ancienne histoire orpheline. #Historique',date:8000,originalLanguage:'und',futurePost:{keep:true}}
   ],settings:{language:'fr',learningConsent:false,futureSetting:{keep:true}}};
  });
  await page.evaluate(value=>AniMoiData.write(value),fixture);await page.reload({waitUntil:'networkidle'});
  const beforeRead=await raw();
  await openAnimal('rubric-a');
  assert.equal(await history('legacy').getAttribute('data-rubric'),'historical');assert.equal(await history('future-rubric').getAttribute('data-rubric'),'historical');
  assert.equal(await history('legacy').locator('p.publication-text').textContent(),fixture.posts[0].text);
  for(const [id,style] of Object.entries({pawbook:'carnet',sav:'dossier',linkedin:'career',potins:'gazette'}))assert.equal(await history(id).getAttribute('data-style'),style);
  await network();await page.locator('#networkHistorical').tap();assert.equal(await networkPost('legacy').count(),1);assert.equal(await networkPost('pawbook').count(),0);
  assert.deepEqual(await raw(),beforeRead);assert.deepEqual(await page.evaluate(()=>__rubricStorageWrites),[]);
  report.checks.push('Historical and unknown-rubric posts remain byte-identical when opening animal history and network, with no startup or implicit migration writes; all four visual identities use the shared renderer.');

  await openAnimal('rubric-a');await history('legacy').locator('.post-edit').tap();
  assert.deepEqual(await page.locator('#postRubric option').evaluateAll(options=>options.map(option=>option.value)),['','pawbook','sav','linkedin']);
  assert.equal(await page.locator('#postTitle').inputValue(),'');assert.equal(await page.locator('#editPost').inputValue(),fixture.posts[0].text.replace(/\r\n/g,'\n'));
  await page.locator('#postRubric').selectOption('sav');assert.equal(await page.locator('#savFields').isVisible(),true);
  await page.locator('[data-i18n="preview.back"]').tap();assert.deepEqual(await raw(),beforeRead);
  await history('legacy').locator('.post-edit').tap();await page.locator('#postRubric').selectOption('linkedin');await page.locator('#savePost').tap();
  const classified=(await state()).posts.find(post=>post.id==='legacy');
  for(const field of ['id','petId','text','date','photo','originalLanguage','futurePost'])assert.deepEqual(classified[field],fixture.posts[0][field]);
  assert.equal(classified.rubric,'linkedin');assert.equal(Object.hasOwn(classified,'tone'),false);assert.equal((await state()).posts.length,fixture.posts.length);
  assert.deepEqual((await state()).posts.filter(post=>post.id!=='legacy'),fixture.posts.filter(post=>post.id!=='legacy'));
  report.checks.push('Manual classification offers only Pawbook/SAV/LinkedPaw, is cancellable, and preserves exact original text including CRLF line endings, whitespace and duplicate hashtags despite textarea LF normalization, plus photo, date, identity, language and extension metadata without inventing a tone.');

  const beforeQuota=await raw();await history('future-rubric').locator('.post-edit').tap();await page.locator('#postRubric').selectOption('sav');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='animoi-transaction-v1')throw Error('rubric-quota-test');return original.call(this,key,value)};window.__restoreRubricStorage=()=>Storage.prototype.setItem=original});
  const quotaDialog=page.waitForEvent('dialog').then(async dialog=>{const text=dialog.message();await dialog.accept();return text});await page.locator('#savePost').tap();assert.match(await quotaDialog,/rubric-quota-test/);assert.deepEqual(await raw(),beforeQuota);
  await page.evaluate(()=>__restoreRubricStorage());await page.locator('[data-i18n="preview.back"]').tap();assert.equal((await state()).posts.find(post=>post.id==='future-rubric').rubric,'future-universe');
  report.checks.push('A failed classification save leaves every stored byte intact and preserves the editable draft for retry or cancellation.');

  for(const rubric of ['pawbook','sav','linkedin','potins']){
   await openAnimal('rubric-b');await page.locator('#newStory').tap();await page.locator('#story').fill('Mon humain et moi découvrons une nouvelle petite aventure dans le jardin.');
   await page.locator('#rubric').selectOption(rubric);await page.locator('#tones label:has(input[value="tendre"])').tap();await page.locator('#generate').tap();
   assert.equal(await page.locator('#postRubric').inputValue(),rubric);await page.locator('#postTitle').fill('Un titre personnel '+rubric);
   if(rubric==='sav'){await page.locator('#savSubject').fill('Une demande de confort');await page.locator('#savStatus').selectOption('in-progress');await page.locator('#savReply').fill('Nous étudions le dossier.')}
   if(rubric==='linkedin'){await page.locator('#jobKind').selectOption('cv');await page.locator('#jobRole').fill('Directeur des coussins')}
   if(rubric==='potins')assert.equal(await page.locator('#gazetteDraftNotice').isVisible(),true);
   const text=await page.locator('#editPost').inputValue();await page.locator('#savePost').tap();
   const saved=(await state()).posts.at(-1);assert.equal(saved.petId,'rubric-b');assert.equal(saved.rubric,rubric);assert.equal(saved.tone,'tendre');assert.equal(saved.text,text);assert.equal(saved.title,'Un titre personnel '+rubric);
   if(rubric==='sav'){assert.equal(saved.rubricData.sav.subject,'Une demande de confort');assert.equal(saved.rubricData.sav.status,'in-progress')}
   if(rubric==='linkedin'){assert.equal(saved.rubricData.linkedin.kind,'cv');assert.equal(saved.rubricData.linkedin.role,'Directeur des coussins')}
   if(rubric==='potins')assert.equal(saved.editorial.status,'draft');
  }
  report.checks.push('New stories preserve their selected animal, explicit rubric and tone, optional title and specialised SAV/professional fields; a new Potins story remains a local draft proposal.');

  const stableContents=await content(),labels=[];
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   for(const locale of ['fr','en','es','de','it']){
    await page.locator('.language-button[data-language='+JSON.stringify(locale)+']').tap();
    await openAnimal('rubric-a');await checkLayout('history '+width+'/'+locale);
    for(const id of ['pawbook','sav','linkedin','potins']){
     const source=fixture.posts.find(post=>post.id===id);assert.equal(await history(id).locator('p.publication-text').textContent(),source.text);
     assert.equal(await history(id).locator('p.publication-text').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16),true);
    }
    await history('future-rubric').locator('.post-edit').tap();await checkLayout('metadata '+width+'/'+locale);
    assert.equal(await page.locator('#postRubric').inputValue(),'');
    const label=await page.locator('#postTitle').evaluate(node=>[...node.labels].map(label=>label.textContent).join(' '));assert(label&&!label.includes('rubrics.'));if(width===390)labels.push(label);
    await page.locator('[data-i18n="preview.back"]').tap();
    for(const rubric of ['pawbook','sav','linkedin','potins']){
     await universe(rubric);await checkLayout('network '+rubric+' '+width+'/'+locale);
     const universeLabels=await page.locator('.universe-button').evaluateAll(buttons=>buttons.map(button=>{const icon=button.querySelector('.universe-icon'),label=button.querySelector('span:last-child');return{id:button.dataset.rubric,label:label.textContent,iconBottom:icon.getBoundingClientRect().bottom,labelTop:label.getBoundingClientRect().top}}));
     for(const label of universeLabels){assert.equal(label.label,await page.evaluate(id=>AniMoiI18n.t('rubrics.short.'+id),label.id));assert(!label.label.includes('rubrics.'));assert(label.iconBottom<=label.labelTop+1,'small-screen universe icon must be above its compact name')}
     if(rubric!=='potins'){assert.equal(await networkPost(rubric).count(),1);assert.equal(await networkPost(rubric).locator('p.publication-text').textContent(),fixture.posts.find(post=>post.id===rubric).text)}
     else{assert.equal(await page.locator('#gazettePublished .publication-card').count(),0);assert.equal(await page.locator('#gazetteProposals').isVisible(),true);assert.equal(await networkPost('imported-published').locator('.publication-editorial-status').textContent(),await page.evaluate(()=>AniMoiI18n.t('rubrics.editorialUnverified')));assert.equal(await page.locator('#networkScreen button.proposal-approve:enabled,#networkScreen button.proposal-publish:enabled').count(),0)}
     if(width===390&&locale==='fr'){await page.screenshot({path:path.join(work,'rubric-'+rubric+'-390.png'),fullPage:true});if(rubric==='pawbook')await page.locator('.universe-grid').screenshot({path:path.join(work,'reseau-univers-390.png')})}
    }
    assert.deepEqual(await content(),stableContents);
   }
  }
  assert.equal(new Set(labels).size,5);report.checks.push('Shared history and network cards, metadata editor and all four identities are translated in five languages and remain readable with 44px touch targets at 320/390px; language changes do not rewrite saved stories or hashtags.');

  await page.locator('.language-button[data-language="fr"]').tap();await universe('potins');
  const proposal=page.locator('#gazetteProposals .publication-card[data-post-id="potins"]');
  await proposal.locator('.proposal-submit').tap();assert.equal((await state()).posts.find(post=>post.id==='potins').editorial.status,'pending');
  assert.equal(await page.locator('#gazettePublished .publication-card').count(),0);
  await proposal.locator('.proposal-return-draft').tap();assert.equal((await state()).posts.find(post=>post.id==='potins').editorial.status,'draft');
  await proposal.locator('.proposal-archive').tap();assert.equal((await state()).posts.find(post=>post.id==='potins').editorial.status,'archived');
  assert.equal(await page.locator('#gazettePublished .publication-card').count(),0);
  assert.equal(await page.locator('#networkScreen button.proposal-approve:enabled,#networkScreen button.proposal-publish:enabled').count(),0);
  report.checks.push('Explicit local submit, withdrawal to draft and archive transitions never approve or publish a proposal; imported published JSON does not create a verified Gazette edition and no active editor approval/publication control is exposed.');

  await network();await networkPost('sav').locator('.post-edit').tap();const beforeEdit=(await state()).posts.find(post=>post.id==='sav');
  await page.locator('#savReply').fill('Une nouvelle réponse personnelle.');await page.locator('#savePost').tap();
  const afterEdit=(await state()).posts.find(post=>post.id==='sav');assert.equal(afterEdit.rubricData.sav.reply,'Une nouvelle réponse personnelle.');assert.equal(afterEdit.rubricData.sav.extension,'keep');
  for(const field of ['id','petId','date','text','originalLanguage'])assert.equal(afterEdit[field],beforeEdit[field]);
  assert.equal((await state()).posts.filter(post=>post.id==='sav').length,1);
  await history('sav').locator('.post-share').tap();assert.equal((await page.evaluate(()=>__rubricShares.at(-1))).text,afterEdit.text);
  const beforeDelete=await raw();await history('sav').locator('.post-delete').tap();await page.locator('#cancelPostDelete').tap();assert.deepEqual(await raw(),beforeDelete);
  report.checks.push('Network editing reuses the same guarded owner action without duplication; original text/date/language and unknown metadata remain intact, sharing uses the original, and cancelling deletion writes nothing.');

  await page.locator('#openAccount').tap();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).tap();const backupText=fs.readFileSync(await(await download).path(),'utf8'),backup=JSON.parse(backupText);
  await page.evaluate(()=>{const current=AniMoiData.read();current.posts=[];AniMoiData.write(current)});
  const navigation=page.waitForNavigation({waitUntil:'domcontentloaded'}),preRestoreBackup=page.waitForEvent('download');page.once('dialog',dialog=>dialog.accept());
  await page.locator('#restoreFile').setInputFiles({name:'rubrics-backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await Promise.all([navigation,preRestoreBackup]);
  await page.waitForFunction(()=>window.AniMoiData&&AniMoiData.read().posts.some(post=>post.id==='sav'));
  assert.deepEqual((await state()).posts,backup.posts);assert.deepEqual((await state()).pets,backup.pets);assert.deepEqual((await state()).settings.futureSetting,fixture.settings.futureSetting);
  await page.reload({waitUntil:'networkidle'});assert.deepEqual((await state()).posts,backup.posts);await openAnimal('rubric-a');assert.equal(await history('sav').getAttribute('data-style'),'dossier');assert.equal(await history('legacy').getAttribute('data-style'),'career');
  assert.equal(await page.evaluate(()=>AniMoiCharacteristics.traits.length),52);assert.equal(await page.evaluate(()=>Object.values(AniMoiSpecies.species).reduce((sum,group)=>sum+group.entries.length,0)),63);
  report.checks.push('The real guarded JSON restore and subsequent reload retain all stories, photos, manual classifications, editorial states, unknown fields and profile catalogues using the historical storage keys.');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);report.status='passed';
 }catch(error){report.status='failed';report.error=error.stack||String(error);process.exitCode=1}
 finally{if(browser)await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(work,'rubrics-browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))}
})().catch(error=>{console.error(error);process.exitCode=1});
