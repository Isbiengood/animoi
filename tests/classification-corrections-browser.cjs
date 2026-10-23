'use strict';
// Isolated synthetic localStorage only: no hosting, accounts or database access.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');

(async()=>{
 const root=path.resolve(__dirname,'..');
 const work=process.env.ANIMOI_CLASSIFICATION_TEST_OUTPUT||'/workspace/work/animoi-hashtags-classification';fs.mkdirSync(work,{recursive:true});
 const server=http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(request.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return}response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');response.end(data)});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin='http://127.0.0.1:'+server.address().port;let browser;
 const report={status:'running',checks:[],languages:['fr','en','es','de','it'],widths:[320,390],matrixCases:0,pageErrors:[],outsideRequests:[],physicalSafariTest:false};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.outsideRequests.push(url);return route.abort()});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(origin+'/v2-preview/index.html',{waitUntil:'networkidle'});
  const fixture=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;const photo=canvas.toDataURL('image/png');
   return {pets:[{id:'class-a',name:'Fictif A',species:'Chat',breed:'Origine libre',traits:'curieux',photo,birthDate:'2020-04-12',futureProfile:{keep:true}},{id:'class-b',name:'Fictif B',species:'Chien',breed:'',traits:'calme',photo:''}],posts:[
    {id:'legacy',petId:'class-a',ownerId:'synthetic-owner',text:'  Mon texte original\r\n\r\n#MaMarque #Chat #Chat\r\n ',date:100,originalLanguage:'pt-BR',photo,futurePost:{keep:['yes']}},
    {id:'restore',petId:'class-a',text:'Une histoire avec mes choix.\n\n#MaMarque',date:200,originalLanguage:'fr'},
    {id:'future',petId:'class-a',rubric:'future-universe',text:'Une future rubrique préservée. #Personnel',date:300,originalLanguage:'fr'},
    {id:'pawbook',petId:'class-a',rubric:'pawbook',text:'Une histoire classée. #Animoi #VieDAnimal #Chat',date:400,originalLanguage:'fr'},
    {id:'proposal',petId:'class-a',rubric:'potins',editorial:{status:'pending'},text:'Une proposition privée #Chat',date:500,originalLanguage:'fr'},
    {id:'imported-published',petId:'class-a',rubric:'potins',editorial:{status:'published',editionId:'imported-synthetic'},text:'Un état importé ne valide pas la Gazette #Chat',date:600,originalLanguage:'fr'},
    {id:'other',petId:'class-b',rubric:'sav',text:'Une autre histoire #Chien',date:700,originalLanguage:'fr'},
    {id:'orphan',petId:'missing',text:'Un récit orphelin conservé #Marque',date:800,originalLanguage:'und'}
   ],settings:{language:'fr',learningConsent:false,autoTranslate:true,futureSettings:{keep:true}}};
  });
  const state=()=>page.evaluate(()=>AniMoiData.read());
  const raw=()=>page.evaluate(()=>({pets:localStorage.getItem('animoi-pets-v1'),posts:localStorage.getItem('animoi-posts-v2')}));
  const networkCard=id=>page.locator('#networkFeed .publication-card[data-post-id='+JSON.stringify(id)+']');
  const historyCard=id=>page.locator('#petHistory .publication-card[data-post-id='+JSON.stringify(id)+']');
  const network=async()=>{await page.locator('#openNetwork').tap();await page.locator('#networkAll').tap()};
  const back=()=>page.locator('[data-i18n="preview.back"]').tap();
  const snapshotInvariant=(post,original)=>{
   for(const key of ['id','petId','ownerId','date','text','photo','originalLanguage','futurePost'])assert.deepEqual(post[key],original[key],key+' preserved');
   assert.equal(Object.hasOwn(post,'tone'),false,'classification never guesses tone');
  };
  const layout=async label=>{
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,label+' horizontal overflow');
   for(const target of await page.locator('button:visible').all()){
    const box=await target.boundingBox();assert(box&&box.width>=43.5&&box.height>=43.5,label+' touch target '+await target.textContent());
   }
  };
  for(const width of report.widths){
   await page.setViewportSize({width,height:844});
   for(const locale of report.languages){
    await page.evaluate(({fixture,locale})=>AniMoiData.write({...fixture,settings:{...fixture.settings,language:locale}}),{fixture,locale});await page.reload({waitUntil:'networkidle'});
    const before=await raw();await network();await layout('all '+width+'/'+locale);
    assert.equal(await page.locator('#networkFeed .publication-card').count(),fixture.posts.length-1,'all accessible local stories including own proposals');
    assert.equal(await networkCard('proposal').count(),1);assert.equal(await networkCard('imported-published').count(),1);
    await page.locator('.universe-button[data-rubric="potins"]').tap();assert.equal(await page.locator('#gazettePublished .publication-card').count(),0);assert.equal(await networkCard('proposal').count(),1);
    await page.locator('#networkHistorical').tap();assert.equal(await page.locator('#networkHistorical').textContent(),await page.evaluate(()=>AniMoiI18n.t('rubrics.historical')));
    assert.equal(await networkCard('legacy').count(),1);assert.equal(await networkCard('restore').count(),1);assert.equal(await networkCard('future').count(),0);assert.equal(await networkCard('pawbook').count(),0);assert.equal(await networkCard('proposal').count(),0);
    assert.deepEqual(await raw(),before,'viewing never migrates saved hashtags or rubrics');
    await networkCard('legacy').locator('.post-classify').tap();
    assert.deepEqual(await page.locator('#postRubric option').evaluateAll(options=>options.map(option=>option.value)),['','pawbook','sav','linkedin']);
    assert.equal(await page.locator('#postRubric').evaluate(node=>node===document.activeElement),true,'classification focus');
    await layout('classify '+width+'/'+locale);await page.locator('#postRubric').selectOption('sav');await back();assert.deepEqual(await raw(),before,'abandoned classification never writes');
    await network();await page.locator('#networkHistorical').tap();await networkCard('legacy').locator('.post-classify').tap();await page.locator('#postRubric').selectOption('sav');await page.locator('#savePost').tap();
    const classified=(await state()).posts.find(post=>post.id==='legacy');snapshotInvariant(classified,fixture.posts[0]);assert.equal(classified.rubric,'sav');assert.equal((await state()).posts.length,fixture.posts.length);
    assert.deepEqual((await state()).pets,fixture.pets);await network();assert.equal(await networkCard('legacy').count(),1);await page.locator('#networkHistorical').tap();assert.equal(await networkCard('legacy').count(),0);
    await page.locator('.universe-button[data-rubric="sav"]').tap();assert.equal(await networkCard('legacy').count(),1);
    assert.equal(await networkCard('legacy').locator('.post-classify').textContent(),await page.evaluate(()=>AniMoiI18n.t('classify.change')));
    await networkCard('legacy').locator('.post-classify').tap();await page.locator('#postRubric').selectOption('linkedin');await page.locator('#savePost').tap();
    snapshotInvariant((await state()).posts.find(post=>post.id==='legacy'),fixture.posts[0]);assert.equal((await state()).posts.find(post=>post.id==='legacy').rubric,'linkedin');assert.equal((await state()).posts.filter(post=>post.id==='legacy').length,1);
    // Explicit recovery affects only the unsaved draft until an explicit save.
    await network();await networkCard('restore').locator('.post-edit').tap();const preRecovery=await raw();const original=await page.locator('#editPost').inputValue();
    await page.locator('#restoreHashtags').tap();const recovered=await page.locator('#editPost').inputValue();const defaults=await page.evaluate(()=>AniMoiPublications.defaultHashtags('Chat'));
    assert(recovered.startsWith(original),'recovery preserves the exact original prefix');assert.equal(recovered.slice(original.length).trim(),defaults);await page.locator('#restoreHashtags').tap();assert.equal(await page.locator('#editPost').inputValue(),recovered,'recovery never duplicates tags');assert.deepEqual(await raw(),preRecovery);
    await back();assert.deepEqual(await raw(),preRecovery,'abandoning recovery preserves historical data');
    await historyCard('restore').locator('.post-edit').tap();await page.locator('#restoreHashtags').tap();await page.locator('#savePost').tap();
    const saved=(await state()).posts.find(post=>post.id==='restore');assert.equal(saved.text,recovered);assert.equal(saved.id,'restore');assert.equal(saved.date,200);assert.equal((await state()).posts.length,fixture.posts.length);
    const preLocale=(await state()).posts;await page.locator('.language-button[data-language="'+(locale==='en'?'fr':'en')+'"]').tap();await page.reload({waitUntil:'networkidle'});assert.deepEqual((await state()).posts,preLocale,'saved recovery never follows later flags');
    report.matrixCases++;
   }
  }
  report.checks.push('Five languages ×320/390px: only unassigned legacy stories appear in À classer; all accessible local stories include own proposals without publishing them; all touch targets are at least44px and no horizontal overflow.');
  report.checks.push('Voluntary classification, cancellation and later category changes preserve exact historical CRLF text, duplicate/custom hashtags, owner, animal, ID, photo, date, language and extensions without duplication or guessed tone.');
  report.checks.push('Explicit suggested-hashtag recovery is append-only, idempotent, draft-only until save and cancellable; saved tags survive flags and reload.');
  // A real write error must preserve the old classification and every profile.
  await page.evaluate(value=>AniMoiData.write(value),fixture);await page.reload({waitUntil:'networkidle'});await network();await page.locator('#networkHistorical').tap();const beforeFailure=await raw();
  await networkCard('legacy').locator('.post-classify').tap();await page.locator('#postRubric').selectOption('pawbook');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='animoi-transaction-v1')throw Error('classification-test-quota');return original.call(this,key,value)};window.__restoreStorage=()=>Storage.prototype.setItem=original});
  const alert=page.waitForEvent('dialog').then(async dialog=>{const message=dialog.message();await dialog.accept();return message});await page.locator('#savePost').tap();assert.match(await alert,/classification-test-quota/);assert.deepEqual(await raw(),beforeFailure);
  await page.evaluate(()=>__restoreStorage());await back();await network();await page.locator('#networkHistorical').tap();assert.equal(await networkCard('legacy').count(),1);
  report.checks.push('A failed transaction leaves classification, original hashtags and all profile/post bytes unchanged; the story remains in À classer.');
  // Individual deletion is explicitly confirmed and leaves all other stories/pets intact.
  const beforeDelete=await state();await networkCard('restore').locator('.post-delete').tap();await page.locator('#cancelPostDelete').tap();assert.deepEqual(await state(),beforeDelete);
  await networkCard('restore').locator('.post-delete').tap();await page.locator('#confirmPostDelete').tap();const afterDelete=await state();assert.deepEqual(afterDelete.pets,beforeDelete.pets);assert.deepEqual(afterDelete.posts,beforeDelete.posts.filter(post=>post.id!=='restore'));assert.equal(await networkCard('restore').count(),0);
  // When the last unclassified story is assigned, keep a clear friendly empty state.
  await networkCard('legacy').locator('.post-classify').tap();await page.locator('#postRubric').selectOption('pawbook');await page.locator('#savePost').tap();await network();await page.locator('#networkHistorical').tap();
  assert.equal(await page.locator('#networkFeed .publication-card').count(),0);assert.equal(await page.locator('#networkFeed').textContent(),await page.evaluate(()=>AniMoiI18n.t('classify.empty')));
  report.checks.push('Cancelling individual deletion changes nothing; confirming removes exactly one story and refreshes its list. After the last classification, À classer displays the translated all-classified message.');
  // Use real export and restore UI, arming navigation before choosing the file.
  await page.locator('#openAccount').tap();const downloading=page.waitForEvent('download');await page.locator('[data-i18n="nav.export"]').tap();const backupText=fs.readFileSync(await(await downloading).path(),'utf8');const backup=JSON.parse(backupText);
  await page.evaluate(()=>{const value=AniMoiData.read();value.posts=[];AniMoiData.write(value)});
  const navigation=page.waitForNavigation({waitUntil:'domcontentloaded'}),backupBeforeRestore=page.waitForEvent('download');page.once('dialog',dialog=>dialog.accept());
  await page.locator('#restoreFile').setInputFiles({name:'classification-corrections.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await Promise.all([navigation,backupBeforeRestore]);
  await page.waitForFunction(()=>window.AniMoiData&&AniMoiData.read().posts.some(post=>post.id==='legacy'));
  assert.deepEqual((await state()).posts,backup.posts);assert.deepEqual((await state()).pets,backup.pets);await page.reload({waitUntil:'networkidle'});assert.deepEqual((await state()).posts,backup.posts);
  report.checks.push('Real JSON export/restore and reload preserve every profile, photo, owner, historical text, selected tags, orphan record, unknown future rubric and explicit classification.');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);report.status='passed';
 }catch(error){report.status='failed';report.error=error.stack||String(error);process.exitCode=1}
 finally{if(browser)await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(work,'classification-corrections-browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))}
})().catch(error=>{console.error(error);process.exitCode=1});
