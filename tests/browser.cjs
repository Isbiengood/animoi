const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error)res.writeHead(404).end();else{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(data)}})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser:',e.message)});page.setDefaultTimeout(8000);
 const url=`http://127.0.0.1:${server.address().port}/v2-preview/index.html`;
 await page.goto(url);
 const pet=(id,name,species,traits)=>({id,name,species,traits,breed:'',photo:''});
 await page.evaluate(pets=>{localStorage.setItem('animoi-pets-v1',JSON.stringify(pets));localStorage.setItem('animoi-posts-v2','[]')},[pet('a','Mimi','Chat','calme'),pet('b','Bobby','Chien','joueur, têtu')]);await page.reload();
 await page.locator('.v2-card').filter({hasText:'Mimi'}).click();
 await page.getByRole('button',{name:'Modifier le profil',exact:true}).click();
 await page.locator('#animalSelect').selectOption('b');
 await page.locator('#savePet').click();
 await page.getByRole('button',{name:'✍️ Nouvelle histoire'}).click();
 await page.locator('#story').fill('Mon humain cache une balle.');
 await page.locator('#generate').click();
 assert.match(await page.locator('#editPost').inputValue(),/terrain de jeu/);
 assert.match(await page.locator('#editPost').inputValue(),/défendre mon idée/);
 assert.equal(await page.locator('#postName').textContent(),'Bobby');
 await page.getByRole('button',{name:'✅ Valider et enregistrer',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-posts-v2'))[0].petId),'b');
 console.log('OK sélection, attribution et personnalité');
 await page.getByRole('button',{name:'💬 Communautés'}).click();assert.equal(await page.locator('.community-entry').count(),1);
 await page.getByRole('button',{name:'🐴 Chevaux'}).click();assert.equal(await page.locator('.community-entry').count(),0);
 await page.getByRole('button',{name:'✏️ Gérer les profils'}).click();
 const species=await page.locator('#species option').allTextContents();assert(species.includes('Cheval')&&species.includes('Poisson'));
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#deletePet').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length),2);
 const backupPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();const backup=await backupPromise;const backupText=fs.readFileSync(await backup.path(),'utf8');
 page.once('dialog',dialog=>dialog.accept());const deletedBackup=page.waitForEvent('download');await page.locator('#deletePet').click();await deletedBackup;await page.waitForLoadState('load');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length===1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-posts-v2')).length),0);console.log('OK annulation, sauvegarde et suppression liée');
 page.once('dialog',dialog=>dialog.accept());const restoreBackup=page.waitForEvent('download');await page.locator('input[type=file][hidden]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await restoreBackup;await page.waitForFunction(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length===2);await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-posts-v2')).length),1);
 console.log('OK restauration');
 await page.locator('.v2-card').filter({hasText:'Bobby'}).click();await page.getByRole('button',{name:'Réutiliser',exact:true}).click();await page.locator('#makeImage').click();assert.equal(await page.locator('#cardCanvas').isVisible(),true);const imagePromise=page.waitForEvent('download');await page.locator('#download').click();assert.match((await imagePromise).suggestedFilename(),/\.png$/);console.log('OK historique, image et téléchargement');
 await page.getByRole('button',{name:'← Corriger mon histoire'}).click();await page.locator('#story').fill('Mon humain cache une balle.');
 for(const tone of ['drôle','sérieux','triste','tendre','en colère','dramatique','philosophe']) {
   await page.locator(`input[name=mood][value="${tone}"]`).evaluate(radio=>{radio.checked=true;radio.dispatchEvent(new Event('change'))});
   for(const rubric of ['pawbook','sav','linkedin','potins']) {
     await page.locator('#rubric').selectOption(rubric);await page.locator('#generate').click();
     assert((await page.locator('#editPost').inputValue()).includes('Bobby'));
     await page.getByRole('button',{name:'← Corriger mon histoire'}).click();
   }
 }
 console.log('OK sept tons et quatre rubriques');
 await page.getByRole('button',{name:'🏠 Mes animaux'}).click();
 await page.getByRole('button',{name:'+ Ajouter un animal',exact:true}).click();
 await page.locator('#petName').fill('Nemo');await page.locator('#species').selectOption('Poisson');await page.locator('#traits').fill('curieux');await page.locator('#savePet').click();
 assert.equal(await page.locator('#animalSelect').inputValue(),await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).find(p=>p.name==='Nemo').id));
 await page.getByRole('button',{name:'✍️ Nouvelle histoire'}).click();await page.locator('#story').fill('Une bulle apparaît.');await page.locator('#generate').click();
 await page.locator('#optionalTags').fill('aquarium');await page.getByRole('button',{name:'✅ Valider les hashtags dans ma publication'}).click();assert.match(await page.locator('#editPost').inputValue(),/#Poisson/);assert.match(await page.locator('#editPost').inputValue(),/#aquarium/);
 await page.getByRole('button',{name:'✅ Valider et enregistrer',exact:true}).click();
 console.log('OK création et hashtags');
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).originalLanguage),'fr');
 const originalPosts=await page.evaluate(()=>JSON.stringify(AniMoiData.read().posts));
 for(const code of ['en','es','de','it']){
   await page.locator('#interfaceLanguage').selectOption(code);
   assert.equal(await page.locator('html').getAttribute('lang'),code);
   assert.equal(await page.evaluate(()=>JSON.stringify(AniMoiData.read().posts)),originalPosts);
 }
 await page.reload();assert.equal(await page.locator('#interfaceLanguage').inputValue(),'it');
 await page.locator('#interfaceLanguage').selectOption('en');assert.equal(await page.getByRole('button',{name:'Export my data',exact:true}).count(),1);
 await page.locator('.v2-card').filter({hasText:'Nemo'}).click();await page.getByRole('button',{name:'Reuse',exact:true}).click();
 await page.locator('#editPost').fill('Soy un pez curioso.');await page.locator('#postLanguage').selectOption('es');await page.locator('#savePost').click();
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).originalLanguage),'es');
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).text),'Soy un pez curioso.');
 await page.evaluate(()=>{const state=AniMoiData.read();const pet=state.pets.find(p=>p.name==='Nemo');state.posts.push({id:'legacy-language',petId:pet.id,text:'Réutiliser',date:Date.now()});AniMoiData.write(state)});
 await page.reload();await page.locator('.v2-card').filter({hasText:'Nemo'}).click();
 assert.equal(await page.locator('.v2-post p').filter({hasText:/^Réutiliser$/}).textContent(),'Réutiliser');
 assert.equal(await page.locator('.v2-post p').filter({hasText:/^Réutiliser$/}).getAttribute('lang'),'und');
 await page.locator('.v2-post').filter({has:page.locator('p').filter({hasText:/^Réutiliser$/})}).getByRole('button',{name:'Reuse',exact:true}).click();
 assert.equal(await page.locator('#postLanguage').inputValue(),'und');
 await page.locator('#interfaceLanguage').selectOption('fr');
 console.log('OK choix de langue persistant, langues originales indépendantes et anciens textes préservés');
 // A draft remains owned by its original animal, even if another profile is selected.
 await page.evaluate(()=>{const select=document.getElementById('animalSelect');select.value='a';select.dispatchEvent(new Event('change'))});
 const draftAlert=page.waitForEvent('dialog').then(async blocked=>{assert.match(blocked.message(),/autre animal/);await blocked.accept()});await Promise.all([draftAlert,page.locator('#savePost').click()]);
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).id),'legacy-language');
 console.log('OK brouillon protégé contre une attribution à un autre animal');
 const languageBefore=await page.locator('#interfaceLanguage').inputValue();
 await page.evaluate(()=>{const write=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(key,value){if(key==='animoi-settings-v1'&&once){once=false;throw new DOMException('Test quota','QuotaExceededError')}return write.call(this,key,value)};window.restoreStorage=()=>Storage.prototype.setItem=write});
 const quotaAlert=page.waitForEvent('dialog').then(dialog=>dialog.accept());await Promise.all([quotaAlert,page.locator('#interfaceLanguage').selectOption('de')]);
 assert.equal(await page.locator('#interfaceLanguage').inputValue(),languageBefore);assert.equal(await page.evaluate(()=>AniMoiData.read().settings.language),languageBefore);await page.evaluate(()=>restoreStorage());
 console.log('OK échec de sauvegarde de la préférence de langue');
 await page.getByRole('button',{name:'✏️ Gérer les profils'}).click();await page.locator('#animalSelect').selectOption('b');
 await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return new Promise(resolve=>window.completePhoto=resolve)};window.restoreDecode=()=>HTMLImageElement.prototype.decode=decode});
 await page.locator('#photo').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=','base64')});
 await page.locator('#animalSelect').selectOption('a');await page.evaluate(async()=>{completePhoto();await Promise.resolve();restoreDecode()});
 assert.equal(await page.locator('#profilePic').isVisible(),false);
 assert.equal(await page.evaluate(()=>AniMoiData.read().pets.find(p=>p.id==='a').photo),'');
 // A failed profile save must not navigate away or change persisted profile data.
 await page.locator('#petName').fill('Unwritten name');
 await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='animoi-transaction-v1')throw new DOMException('Test quota','QuotaExceededError');return write.call(this,key,value)};window.restoreStorage=()=>Storage.prototype.setItem=write});
 const profileQuota=page.waitForEvent('dialog').then(dialog=>dialog.accept());await Promise.all([profileQuota,page.locator('#savePet').click()]);
 assert.equal(await page.locator('#petName').isVisible(),true);assert.equal(await page.evaluate(()=>AniMoiData.read().pets.find(p=>p.id==='a').name),'Mimi');await page.evaluate(()=>restoreStorage());
 console.log('OK photo en cours de chargement et échec d’enregistrement du profil');
 const beforeInvalid=await page.evaluate(()=>localStorage.getItem('animoi-pets-v1'));
 const invalidAlert=page.waitForEvent('dialog');await page.locator('input[type=file][hidden]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await (await invalidAlert).accept();
 assert.equal(await page.evaluate(()=>localStorage.getItem('animoi-pets-v1')),beforeInvalid);
 await page.evaluate(()=>AniMoiData.write({pets:[],posts:[]}));await page.reload();assert.equal(await page.locator('.v2-card').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length),0);
 console.log('OK sauvegarde invalide et données vides conservées');
 assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
