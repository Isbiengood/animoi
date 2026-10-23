'use strict';
// Synthetic profiles only. Block every request outside this local test server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),out='/workspace/work/animoi-humor';fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;let browser;
 const errors=[],external=[];let cases=0;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push(route.request().url());return route.abort()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/v2-preview/index.html');
  const old={id:'old',petId:'a',text:'  Texte original #Marque\n ',tone:'drôle',date:123,originalLanguage:'fr',futureField:{keep:true}};
  await page.evaluate(old=>AniMoiData.write({pets:[{id:'a',name:'Animal fictif A',species:'Chien',breed:'',traits:'joueur',photo:''},{id:'b',name:'Animal fictif B',species:'Chat',breed:'',traits:'calme',photo:''}],posts:[old],settings:{language:'fr',learningConsent:false}}),old);
  await page.reload();
  const state=()=>page.evaluate(()=>AniMoiData.read());
  const openAnimal=async()=>{await page.locator('#openHome').tap();await page.locator('.v2-card[data-pet-id="a"] .pet-open').tap()};
  const choose=async(value)=>page.locator('#composerHumor input[value="'+value+'"]').check();
  const assertLayout=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   for(const language of ['fr','en','es','de','it']){
    await page.locator('.language-button[data-language="'+language+'"]').tap();await openAnimal();await page.locator('#newStory').tap();
    assert.equal(await page.locator('#tones input').count(),7,'retain all seven main tones');
    assert.equal(await page.locator('#composerHumor input:checked').inputValue(),'funny');
    if(language==='fr')assert.equal(await page.locator('#tones label').first().innerText(),'Amusant');
    for(const variant of ['funny','cheeky','wacky']){
     await choose(variant);assert.equal(await page.locator('#composerHumor input:checked').count(),1);
     assert.equal(await page.locator('#composerHumor input:checked').inputValue(),variant);
     assert(await page.locator('#composerHumor label').last().evaluate(node=>node.getBoundingClientRect().height>=44));
    }
    await page.locator('#tones label').filter({has:page.locator('input[value="sérieux"]')}).tap();
    assert.equal(await page.locator('#composerHumor').isVisible(),false);
    await page.locator('#tones label').filter({has:page.locator('input[value="drôle"]')}).tap();
    assert.equal(await page.locator('#composerHumor').isVisible(),true);
    assert.equal(await page.locator('#composerHumor input:checked').inputValue(),'funny');
    await assertLayout();
    for(const variant of ['funny','cheeky','wacky']){
     await choose(variant);
     await page.locator('#story').fill('Mon animal est resté sur le canapé malgré ma demande.');await page.locator('#generate').tap();
     assert.equal(await page.locator('#postHumor input:checked').inputValue(),variant);
     assert((await page.locator('#editPost').inputValue()).includes('Mon animal est resté sur le canapé malgré ma demande.'));
     await assertLayout();await page.locator('#savePost').tap();
     const saved=(await state()).posts.at(-1);assert.equal(saved.humorVariant,variant);assert.equal(saved.tone,'drôle');assert.equal(saved.petId,'a');
     await page.locator('.v2-post[data-post-id="'+saved.id+'"] .post-edit').tap();
     assert.equal(await page.locator('#postHumor input:checked').inputValue(),variant);
     await page.locator('#editPost').fill(saved.text+'\n#Personnel');await page.locator('#savePost').tap();
     const changed=(await state()).posts.find(post=>post.id===saved.id);assert.equal(changed.humorVariant,variant);assert.equal(changed.date,saved.date);assert.equal(changed.petId,'a');
     assert.equal((await state()).posts.filter(post=>post.id===saved.id).length,1);
     await page.locator('#newStory').tap();cases++;
    }
    if(width===320&&language==='de')await page.screenshot({path:path.join(out,'humor-de-320.png'),fullPage:true});
   }
  }
  // An old tone is compatible and remains byte-for-byte unchanged on a no-op save.
  await openAnimal();await page.locator('.v2-post[data-post-id="old"] .post-edit').tap();
  assert.equal(await page.locator('#postHumor input:checked').inputValue(),'funny');await page.locator('#savePost').tap();assert.deepEqual((await state()).posts.find(p=>p.id==='old'),old);
  // Explicit variant editing changes metadata only and never creates a second publication.
  const existing=(await state()).posts.find(p=>p.humorVariant==='wacky'),before=(await state()).posts.length;
  await page.locator('.v2-post[data-post-id="'+existing.id+'"] .post-edit').tap();await page.locator('#postHumor input[value="cheeky"]').check();await page.locator('#savePost').tap();
  const updated=(await state()).posts.find(p=>p.id===existing.id);assert.equal(updated.humorVariant,'cheeky');assert.equal(updated.text,existing.text);assert.equal((await state()).posts.length,before);
  await page.reload();assert.deepEqual((await state()).posts.find(p=>p.id===existing.id),updated);
  // Exercise the real JSON restoration adapter in the browser; unrelated profiles stay exact.
  const snapshot=await state();await page.evaluate(()=>{const backup=AniMoiData.exportData();AniMoiData.restore(backup)});assert.deepEqual(await state(),snapshot);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const report={status:'passed',cases,languages:['fr','en','es','de','it'],widths:[320,390],checks:['exclusive choices/default/hide','creation and editing without duplicates','legacy no-op preservation','metadata-only variant edit','reload and JSON restore','touch sizes and overflow','no external requests'],physicalSafariTest:false};
  fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
