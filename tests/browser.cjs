const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error)res.writeHead(404).end();else{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data)}})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser:',e.message)});page.setDefaultTimeout(8000);
 const url=`http://127.0.0.1:${server.address().port}/v2-preview/index.html`;
 await page.goto(url);
 assert.equal(await page.evaluate(()=>AniMoiCharacteristics.traits.length),52);
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(AniMoiSpecies.species).map(([key,group])=>[key,group.entries.length]))),{Poisson:34,Oiseau:24,Hamster:5});
 const card=id=>page.locator(`.v2-card[data-pet-id="${id}"]`);
 const dominantStar=ref=>page.locator('#dominantTraits label:has(input[value='+JSON.stringify(ref)+']) .dominant-star');
 const clickDominantStar=async ref=>{const star=dominantStar(ref);await star.scrollIntoViewIfNeeded();const box=await star.boundingBox();assert(box&&box.width>=43.5&&box.height>=43.5,'dominant star needs a visible touch target');await page.mouse.click(box.x+box.width/2,box.y+box.height/2)};
 const filledStars=()=>page.locator('#dominantTraits .dominant-star').evaluateAll(stars=>stars.filter(star=>star.textContent==='★').length);

 const setLanguage=async code=>{await page.locator(`.language-button[data-language="${code}"]`).click();assert.equal(await page.locator(`.language-button[data-language="${code}"]`).getAttribute('aria-pressed'),'true')};
 const openHome=()=>page.locator('#openHome').click();
 const openNetwork=()=>page.locator('#openNetwork').click();
 const openAccount=()=>page.locator('#openAccount').click();
 const persisted=()=>page.evaluate(()=>JSON.stringify(AniMoiData.read()));
 const deleteDialog=page.locator('#deleteAnimalDialog');
 const confirmDelete=()=>page.locator('#confirmDelete').click();
 const cancelDelete=()=>page.locator('#cancelDelete').click();
 const deleteMessage=name=>`Voulez-vous vraiment supprimer ${name} ? Ses publications associées seront également supprimées. Cette action est irréversible sans sauvegarde.`;
 const pet=(id,name,species,traits)=>({id,name,species,traits,breed:'',photo:''});
 await page.evaluate(pets=>{localStorage.setItem('animoi-pets-v1',JSON.stringify(pets));localStorage.setItem('animoi-posts-v2','[]')},[pet('a','Mimi','Chat','calme'),pet('b','Bobby','Chien','joueur, têtu')]);await page.reload();
 assert.equal(await page.locator('article.v2-card').count(),2);
 assert.equal(await page.locator('.language-button').count(),5);
 assert.equal(await page.locator('#interfaceLanguage').count(),0);
 assert.deepEqual(await page.locator('.primary-nav button .nav-label').allTextContents(),['Animaux','Réseau','Compte']);
 assert.deepEqual(await page.locator('.primary-nav button .nav-icon').allTextContents(),['🐾','👥','👤']);
 assert.equal(await page.locator('#openHome').getAttribute('aria-current'),'page');
 assert.equal(await page.locator('#addAnimal').textContent(),'+ Ajouter');
 assert.equal(await page.locator('.community-access').count(),0);
 assert.equal(await page.locator('.pet-delete').count(),0);
 assert.equal(await page.locator('.v2-card').getByRole('button',{name:'Supprimer cet animal',exact:true}).count(),0);
 assert.equal(await page.locator('#newPet').count(),0);
 const untouched=await persisted();
 // A synthetic activation of the hidden confirmation action must never delete a pet.
 await page.locator('#confirmDelete').evaluate(button=>button.click());assert.equal(await persisted(),untouched);
 await card('a').locator('.pet-open').click();
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
 await openNetwork();assert.equal(await page.locator('.community-screen').isVisible(),true);assert.equal(await page.locator('#openNetwork').getAttribute('aria-current'),'page');assert.equal(await page.locator('.community-entry').count(),1);
 await page.getByRole('button',{name:'🐴 Chevaux'}).click();assert.equal(await page.locator('.community-entry').count(),0);
 await openHome();await card('b').locator('.pet-edit').click();assert.equal(await page.locator('#animalSelect').inputValue(),'b');
 const species=await page.locator('#species option').allTextContents();assert(species.includes('Cheval')&&species.includes('Poisson'));
 const beforeProfileCancel=await persisted();await page.locator('#deletePet').click();assert.equal(await deleteDialog.isVisible(),true);assert.equal(await page.locator('#deleteAnimalMessage').textContent(),deleteMessage('Bobby'));assert.equal(await persisted(),beforeProfileCancel);await cancelDelete();assert.equal(await deleteDialog.isVisible(),false);assert.equal(await persisted(),beforeProfileCancel);
 await page.locator('#confirmDelete').evaluate(button=>button.click());assert.equal(await persisted(),beforeProfileCancel);
 await openAccount();assert.equal(await page.locator('#accountScreen').isVisible(),true);
 await page.locator('#accountName').fill('Camille test');await page.locator('#saveAccount').click();assert.equal(await page.evaluate(()=>AniMoiData.read().settings.account.displayName),'Camille test');
 await page.reload();await openAccount();assert.equal(await page.locator('#accountName').inputValue(),'Camille test');
 await page.locator('#accountName').fill('Unsaved pseudo');
 await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='animoi-transaction-v1')throw Error('quota');return write.call(this,key,value)};window.restoreAccountStorage=()=>Storage.prototype.setItem=write});
 await page.locator('#saveAccount').click();assert.match(await page.locator('#accountFeedback').textContent(),/quota/);assert.equal(await page.evaluate(()=>AniMoiData.read().settings.account.displayName),'Camille test');await page.evaluate(()=>restoreAccountStorage());await page.locator('#accountName').fill('Camille test');
 const backupPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();const backup=await backupPromise;const backupText=fs.readFileSync(await backup.path(),'utf8');assert.equal(JSON.parse(backupText).settings.account.displayName,'Camille test');
 // Destruction is offered only inside the chosen animal’s profile.
 await openHome();await card('a').locator('.pet-open').click();await openHome();await card('b').locator('.pet-edit').click();assert.equal(await page.locator('#animalSelect').inputValue(),'b');
 const beforeProfileDelete=await persisted();const profileDelete=page.locator('#deletePet');
 await profileDelete.click();assert.equal(await deleteDialog.isVisible(),true);assert.equal(await page.locator('#deleteAnimalMessage').textContent(),deleteMessage('Bobby'));assert.equal(await persisted(),beforeProfileDelete);
 await cancelDelete();assert.equal(await persisted(),beforeProfileDelete);assert.equal(await profileDelete.evaluate(button=>button===document.activeElement),true);
 await page.locator('#confirmDelete').evaluate(button=>button.click());assert.equal(await persisted(),beforeProfileDelete);
 await profileDelete.click();const deletedBackup=page.waitForEvent('download');await page.locator('#backupBeforeDelete').click();const deletionBackup=JSON.parse(fs.readFileSync(await(await deletedBackup).path(),'utf8'));assert.equal(deletionBackup.pets.length,2);assert.equal(deletionBackup.posts.length,1);assert.equal(await deleteDialog.isVisible(),true);assert.equal(await persisted(),beforeProfileDelete);
 await page.keyboard.press('Escape');assert.equal(await deleteDialog.isVisible(),false);assert.equal(await persisted(),beforeProfileDelete);
 // Closing the dialog programmatically clears its pending target as well.
 await profileDelete.click();await deleteDialog.evaluate(dialog=>dialog.close());await page.locator('#confirmDelete').evaluate(button=>button.click());assert.equal(await persisted(),beforeProfileDelete);
 await profileDelete.click();await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='animoi-transaction-v1')throw Error('quota');return write.call(this,key,value)};window.restoreDeleteStorage=()=>Storage.prototype.setItem=write});
 await confirmDelete();assert.equal(await deleteDialog.isVisible(),true);assert.match(await page.locator('#deleteFeedback').textContent(),/quota/);assert.equal(await persisted(),beforeProfileDelete);await page.evaluate(()=>restoreDeleteStorage());await cancelDelete();assert.equal(await persisted(),beforeProfileDelete);
 // Even a selection change behind the modal cannot retarget a pending confirmation.
 await profileDelete.click();await page.evaluate(()=>{const select=document.getElementById('animalSelect');select.value='a';select.dispatchEvent(new Event('change'))});await Promise.all([page.waitForNavigation(),confirmDelete()]);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length===1);
 assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets.map(p=>p.id)),['a']);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-posts-v2')).length),0);console.log('OK confirmation explicite, annulation depuis la fiche, Escape, sauvegarde seule, échec d’écriture et suppression liée du bon animal');
 await openAccount();await page.locator('#accountName').fill('Autre pseudo');await page.locator('#saveAccount').click();assert.equal(await page.evaluate(()=>AniMoiData.read().settings.account.displayName),'Autre pseudo');
 const beforeRestoreCancel=await persisted();const cancelledRestore=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());await page.locator('#restoreFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await cancelledRestore;assert.equal(await persisted(),beforeRestoreCancel);
 page.once('dialog',dialog=>dialog.accept());const restoreBackup=page.waitForEvent('download'),restoreInitialNavigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.locator('input[type=file][hidden]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await Promise.all([restoreBackup,restoreInitialNavigation]);await page.waitForFunction(()=>window.AniMoiData&&Array.isArray(window.AniMoiData.read().pets)&&window.AniMoiData.read().pets.length===2);assert.equal(await page.locator('#homeScreen').isVisible(),true);await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-posts-v2')).length),1);
 assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets),JSON.parse(backupText).pets);assert.deepEqual(await page.evaluate(()=>AniMoiData.read().posts),JSON.parse(backupText).posts);
 await openAccount();assert.equal(await page.locator('#accountName').inputValue(),'Camille test');await openHome();
 console.log('OK compte local persistant, export et restauration du pseudo');
 // Home actions select their own animal, independently from the last active profile.
 await card('a').locator('.pet-open').click();await openHome();await card('b').locator('.pet-posts').click();assert.equal(await page.locator('#animalSelect').inputValue(),'b');assert.equal(await page.locator('.v2-post').count(),1);
 await page.locator('#petHistory .post-edit').click();assert.equal(await page.locator('#imageTools').getAttribute('open'),null);await page.locator('#imageTools summary').click();await page.locator('#makeImage').click();assert.equal(await page.locator('#cardCanvas').isVisible(),true);const imagePromise=page.waitForEvent('download');await page.locator('#download').click();assert.match((await imagePromise).suggestedFilename(),/\.png$/);console.log('OK accès publications depuis les cartes, historique, image et téléchargement');
 await openHome();await card('b').locator('.pet-open').click();await page.locator('#newStory').click();await page.locator('#story').fill('Mon humain cache une balle.');
 for(const tone of ['drôle','sérieux','triste','tendre','en colère','dramatique','philosophe']) {
   await page.locator(`input[name=mood][value="${tone}"]`).evaluate(radio=>{radio.checked=true;radio.dispatchEvent(new Event('change'))});
   for(const rubric of ['pawbook','sav','linkedin','potins']) {
     await page.locator('#rubric').selectOption(rubric);await page.locator('#generate').click();
     assert((await page.locator('#editPost').inputValue()).includes('Bobby'));
     await page.locator('[data-i18n="preview.back"]').click();
   }
 }
 console.log('OK sept tons et quatre rubriques');
 await openHome();
 await page.locator('#addAnimal').click();
 await page.locator('#petName').fill('Nemo');await page.locator('#species').selectOption('Poisson');await page.locator('#customTrait').fill('curieux');await page.locator('#addCustomTrait').click();await page.locator('#savePet').click();
 assert.equal(await page.locator('#animalSelect').inputValue(),await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).find(p=>p.name==='Nemo').id));
 await page.getByRole('button',{name:'✍️ Nouvelle histoire'}).click();await page.locator('#story').fill('Une bulle apparaît.');await page.locator('#generate').click();
 assert.match(await page.locator('#editPost').inputValue(),/#Animoi #VieDAnimal #Poisson/);await page.locator('#editPost').fill((await page.locator('#editPost').inputValue())+' #aquarium');assert.match(await page.locator('#editPost').inputValue(),/#aquarium/);assert.equal(await page.locator('#optionalTags').count(),0);assert.equal(await page.locator('#animoiCaption').count(),0);
 await page.getByRole('button',{name:'✅ Valider et enregistrer',exact:true}).click();
 console.log('OK création et hashtags');
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).originalLanguage),'fr');
 const originalPosts=await page.evaluate(()=>JSON.stringify(AniMoiData.read().posts));
 for(const code of ['en','es','de','it']){
   await setLanguage(code);
   assert.equal(await page.locator('html').getAttribute('lang'),code);
   assert.equal(await page.evaluate(()=>JSON.stringify(AniMoiData.read().posts)),originalPosts);
 }
 await page.reload();assert.equal(await page.locator('.language-button[data-language="it"]').getAttribute('aria-pressed'),'true');
 await setLanguage('en');await openAccount();assert.equal(await page.getByRole('button',{name:'Export my data',exact:true}).isVisible(),true);assert.equal(await page.locator('.language-button').count(),5);
 await setLanguage('es');assert.equal(await page.locator('#accountScreen').isVisible(),true);await setLanguage('en');await openHome();
 await page.locator('.v2-card').filter({hasText:'Nemo'}).locator('.pet-open').click();await page.locator('#petHistory .post-edit').click();
 const editingId=await page.evaluate(()=>AniMoiData.read().posts.at(-1).id);const countBeforeEdit=await page.evaluate(()=>AniMoiData.read().posts.length);
 const spanish='Mi humano y yo estamos muy felices porque hoy hemos jugado en el jardín.';await page.locator('#editPost').fill(spanish);assert.equal(await page.locator('#postLanguage').count(),0);await page.locator('#savePost').click();
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.length),countBeforeEdit);assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).id),editingId);
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).originalLanguage),'es');
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).text),spanish);
 await page.evaluate(()=>{const state=AniMoiData.read();const pet=state.pets.find(p=>p.name==='Nemo');state.posts.push({id:'legacy-language',petId:pet.id,text:'Réutiliser',date:Date.now()});AniMoiData.write(state)});
 await page.reload();await page.locator('.v2-card').filter({hasText:'Nemo'}).locator('.pet-open').click();
 assert.equal(await page.locator('.v2-post p').filter({hasText:/^Réutiliser$/}).textContent(),'Réutiliser');
 assert.equal(await page.locator('.v2-post p').filter({hasText:/^Réutiliser$/}).getAttribute('lang'),'und');
 await page.locator('.v2-post').filter({has:page.locator('p').filter({hasText:/^Réutiliser$/})}).locator('.post-edit').click();
 assert.equal(await page.locator('#postLanguage').count(),0);assert.equal(await page.locator('#editPost').getAttribute('lang'),'und');
 await setLanguage('fr');
 console.log('OK choix de langue persistant, langues originales indépendantes et anciens textes préservés');
 // A draft remains owned by its original animal, even if another profile is selected.
 await page.evaluate(()=>{const select=document.getElementById('animalSelect');select.value='a';select.dispatchEvent(new Event('change'))});
 const draftAlert=page.waitForEvent('dialog').then(async blocked=>{assert.match(blocked.message(),/autre animal/);await blocked.accept()});await Promise.all([draftAlert,page.locator('#savePost').click()]);
 assert.equal(await page.evaluate(()=>AniMoiData.read().posts.at(-1).id),'legacy-language');
 console.log('OK brouillon protégé contre une attribution à un autre animal');
 const languageBefore=await page.evaluate(()=>AniMoiData.read().settings.language);
 await page.evaluate(()=>{const write=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(key,value){if(key==='animoi-settings-v1'&&once){once=false;throw new DOMException('Test quota','QuotaExceededError')}return write.call(this,key,value)};window.restoreStorage=()=>Storage.prototype.setItem=write});
 const quotaAlert=page.waitForEvent('dialog').then(dialog=>dialog.accept());await Promise.all([quotaAlert,page.locator('.language-button[data-language="de"]').click()]);
 assert.equal(await page.locator(`.language-button[data-language="${languageBefore}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.language-button[aria-pressed="true"]').count(),1);assert.equal(await page.evaluate(()=>AniMoiData.read().settings.language),languageBefore);await page.evaluate(()=>restoreStorage());
 console.log('OK échec de sauvegarde de la préférence de langue');
 await openHome();await card('b').locator('.pet-edit').click();assert.equal(await page.locator('#animalSelect').inputValue(),'b');
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
 await openAccount();
 const beforeInvalid=await page.evaluate(()=>localStorage.getItem('animoi-pets-v1'));
 const invalidAlert=page.waitForEvent('dialog');await page.locator('input[type=file][hidden]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await (await invalidAlert).accept();
 assert.equal(await page.evaluate(()=>localStorage.getItem('animoi-pets-v1')),beforeInvalid);
 await page.evaluate(()=>AniMoiData.write({pets:[{id:'last',name:'Dernier animal',species:'Chat',breed:'',traits:'',photo:''}],posts:[{id:'last-post',petId:'last',text:'Une histoire.',date:Date.now(),originalLanguage:'fr'}],settings:AniMoiData.read().settings}));await page.reload();
 await card('last').locator('.pet-edit').click();await page.locator('#deletePet').click();await Promise.all([page.waitForNavigation(),confirmDelete()]);assert.equal(await page.locator('.v2-card').count(),0);assert.equal(await page.evaluate(()=>AniMoiData.read().posts.length),0);await page.reload();assert.equal(await page.locator('.v2-card').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('animoi-pets-v1')).length),0);
 console.log('OK sauvegarde invalide et données vides conservées');
 await openAccount();await setLanguage('en');assert.equal(await page.locator('#accountScreen').isVisible(),true);assert.equal(await page.locator('.language-button').count(),5);await setLanguage('fr');await openHome();
 await page.locator('#tellAdventure').click();assert.equal(await page.locator('#homeScreen').isVisible(),true);assert.equal(await page.locator('#petName').isVisible(),false);assert.equal(await page.locator('#addAnimal').evaluate(button=>button===document.activeElement),true);assert.equal(await page.evaluate(()=>AniMoiData.read().pets.length),0);
 await page.evaluate(pets=>AniMoiData.write({pets,posts:[],settings:AniMoiData.read().settings}),[pet('a','Mimi','Chat','calme'),pet('b','Bobby','Chien','joueur')]);await page.reload();
 await page.locator('#tellAdventure').click();assert.equal(await page.locator('#adventureChooser').isVisible(),true);await page.locator('#adventureChooser button[data-pet-id="b"]').click();assert.equal(await page.locator('#animalSelect').inputValue(),'b');assert.equal(await page.locator('#story').isVisible(),true);
 console.log('OK accueil vide sans création implicite, ajout uniquement depuis + Ajouter, cinq drapeaux dans Mon compte et choix explicite de l’animal pour une aventure');
 // Old free-text profiles remain editable without a lossy automatic migration.
 const legacyProfile={id:'legacy-catalog',name:'Profil ancien test',species:'Chat',breed:'Origine familiale non répertoriée',traits:'joueur, trait de famille ancien',photo:''};
 await page.evaluate(pet=>AniMoiData.write({pets:[pet],posts:[],settings:AniMoiData.read().settings}),legacyProfile);await page.reload();
 assert.equal(await page.evaluate(()=>AniMoiData.read().pets[0].breed),legacyProfile.breed);assert.equal(await page.evaluate(()=>AniMoiData.read().pets[0].traits),legacyProfile.traits);
 await card(legacyProfile.id).locator('.pet-edit').click();assert.equal(await page.locator('#newPet').count(),0);assert.equal(await page.locator('#profileCharacteristics').isVisible(),true);
 await page.locator('#petName').fill('Profil ancien renommé');await page.locator('#savePet').click();
 assert.equal(await page.evaluate(()=>AniMoiData.read().pets[0].breed),legacyProfile.breed);assert.equal(await page.evaluate(()=>AniMoiData.read().pets[0].traits),legacyProfile.traits);
 await openHome();await card(legacyProfile.id).locator('.pet-edit').click();
 assert.deepEqual(await page.locator('#breedStatus option').evaluateAll(options=>options.map(option=>option.value)),['selected','unknown','not-applicable']);
 const expectBreedHidden=async()=>{for(const id of ['breedSearch','breedResults','breedSelected','breedPrimary','customBreed','addCustomBreed'])assert.equal(await page.locator('#'+id).isVisible(),false,id+' must stay hidden outside a known breed selection')};
 await page.locator('#breedStatus').selectOption('unknown');await expectBreedHidden();assert.equal(await page.locator('#speciesDetail').isVisible(),false);
 await page.locator('#breedStatus').selectOption('not-applicable');await expectBreedHidden();assert.equal(await page.locator('#speciesDetail').isVisible(),true);
 await page.locator('#breedStatus').selectOption('selected');assert.equal(await page.locator('#breedSearch').isVisible(),true);assert.equal(await page.locator('#customBreed').isVisible(),true);assert.equal(await page.locator('#speciesDetail').isVisible(),false);
 const options=async selector=>page.locator(selector+' label').evaluateAll(labels=>labels.map(label=>({id:label.querySelector('input[type="checkbox"]')?.value,text:label.textContent.trim()})).filter(item=>item.id));
 const checkbox=(selector,id)=>page.locator(selector+' input[type="checkbox"][value='+JSON.stringify(id)+']');
 const breedOptions=await options('#breedResults');assert(breedOptions.length>=2&&breedOptions.length<=20);
 const firstBreed=breedOptions[0],secondBreed=breedOptions[1];
 await page.locator('#breedSearch').fill(firstBreed.text);assert.equal(await checkbox('#breedResults',firstBreed.id).count(),1);await checkbox('#breedResults',firstBreed.id).check();
 await page.locator('#breedSearch').fill(secondBreed.text);await checkbox('#breedResults',secondBreed.id).check();await page.locator('#breedPrimary').selectOption(secondBreed.id);
 await page.locator('#breedSearch').fill('Aucune race de ce nom xyz');assert.equal(await page.locator('#breedResults input[type=checkbox]').count(),0);assert.equal(await checkbox('#breedSelected',firstBreed.id).isChecked(),true);assert.equal(await checkbox('#breedSelected',secondBreed.id).isChecked(),true);
 await page.locator('#customBreed').fill('Origine croisée personnalisée test');await page.locator('#addCustomBreed').click();
 const traitOptions=await options('#traitResults');assert(traitOptions.length>=2&&traitOptions.length<=20);const firstTrait=traitOptions[0],secondTrait=traitOptions[1];
 await page.locator('#traitSearch').fill(firstTrait.text);assert.equal(await checkbox('#traitResults',firstTrait.id).count(),1);await checkbox('#traitResults',firstTrait.id).check();
 await page.locator('#traitSearch').fill(secondTrait.text);await checkbox('#traitResults',secondTrait.id).check();
 await page.locator('#traitSearch').fill('Aucun trait de ce nom xyz');assert.equal(await page.locator('#traitResults input[type=checkbox]').count(),0);assert.equal(await checkbox('#traitSelected',firstTrait.id).isChecked(),true);assert.equal(await checkbox('#traitSelected',secondTrait.id).isChecked(),true);
 await page.locator('#customTrait').fill('Fait des pirouettes test');await page.locator('#addCustomTrait').click();
 // Removing a selected checkbox with Space must keep keyboard focus in the editor.
 for(const id of ['custom:Fait des pirouettes test',firstTrait.id]){
  const selected=checkbox('#traitSelected',id);await selected.focus();await selected.press('Space');assert.equal(await selected.count(),0);assert.equal(await page.locator('#profileCharacteristics').evaluate(node=>node.contains(document.activeElement)&&document.activeElement!==document.body),true);
 }
 await page.locator('#traitSearch').fill(firstTrait.text);await checkbox('#traitResults',firstTrait.id).check();await page.locator('#customTrait').fill('Fait des pirouettes test');await page.locator('#addCustomTrait').click();
 // Up to three dominant traits can be chosen, including custom selections.
 const dominantRefs=['id:'+firstTrait.id,'id:'+secondTrait.id,'custom:Fait des pirouettes test'];
 const fourthDominant='custom:'+legacyProfile.traits;
 assert.deepEqual(new Set(await page.locator('#dominantTraits input[type=checkbox]').evaluateAll(inputs=>inputs.map(input=>input.value))),new Set([...dominantRefs,fourthDominant]));
 assert.equal(await filledStars(),0);for(const ref of dominantRefs){assert.equal(await dominantStar(ref).textContent(),'☆');await clickDominantStar(ref);assert.equal(await dominantStar(ref).textContent(),'★')}assert.equal(await filledStars(),3);assert.equal(await page.locator('#dominantTraits input:checked').count(),3);assert.equal(await checkbox('#dominantTraits',fourthDominant).isDisabled(),true);await clickDominantStar(fourthDominant);assert.equal(await filledStars(),3);assert.equal(await dominantStar(fourthDominant).textContent(),'☆');assert.match(await page.locator('#dominantCount').textContent(),/3/);
 await checkbox('#dominantTraits',dominantRefs[0]).focus();await checkbox('#dominantTraits',dominantRefs[0]).press('Space');assert.equal(await dominantStar(dominantRefs[0]).textContent(),'☆');assert.equal(await filledStars(),2);assert.equal(await checkbox('#dominantTraits',dominantRefs[0]).evaluate(input=>input===document.activeElement),true);await checkbox('#dominantTraits',dominantRefs[0]).press('Space');assert.equal(await dominantStar(dominantRefs[0]).textContent(),'★');assert.equal(await filledStars(),3);
 await checkbox('#traitSelected',firstTrait.id).click();assert.equal(await checkbox('#dominantTraits','id:'+firstTrait.id).count(),0);assert.equal(await page.locator('#dominantTraits input:checked').count(),2);assert.equal(await checkbox('#dominantTraits',fourthDominant).isDisabled(),false);
 await clickDominantStar(fourthDominant);assert.equal(await dominantStar(fourthDominant).textContent(),'★');await page.locator('#traitSearch').fill(firstTrait.text);await checkbox('#traitResults',firstTrait.id).check();assert.equal(await checkbox('#dominantTraits','id:'+firstTrait.id).isChecked(),false);assert.equal(await checkbox('#dominantTraits','id:'+firstTrait.id).isDisabled(),true);
 const savedDominants=['id:'+secondTrait.id,'custom:Fait des pirouettes test',fourthDominant];
 await page.locator('#savePet').click();
 let enriched=await page.evaluate(()=>AniMoiData.read().pets[0]);assert.equal(enriched.characteristics.version,1);
 assert.deepEqual(new Set(enriched.characteristics.breed.ids),new Set([firstBreed.id,secondBreed.id]));assert.equal(enriched.characteristics.breed.primaryId,secondBreed.id);assert.equal(enriched.characteristics.breed.status,'selected');
 assert(enriched.characteristics.breed.custom.includes(legacyProfile.breed));assert(enriched.characteristics.breed.custom.includes('Origine croisée personnalisée test'));
 assert.deepEqual(new Set(enriched.characteristics.temperament.ids),new Set([firstTrait.id,secondTrait.id]));assert(enriched.characteristics.temperament.custom.includes(legacyProfile.traits));assert(enriched.characteristics.temperament.custom.includes('Fait des pirouettes test'));
 assert.deepEqual(new Set(enriched.characteristics.temperament.dominant),new Set(savedDominants));
 assert(enriched.breed.includes(legacyProfile.breed));assert(enriched.traits.includes(legacyProfile.traits));assert(enriched.traits.includes('Fait des pirouettes test'));
 await page.reload();await card(legacyProfile.id).locator('.pet-edit').click();assert.equal(await page.locator('#breedPrimary').inputValue(),secondBreed.id);assert.equal(await checkbox('#breedSelected',firstBreed.id).isChecked(),true);assert.equal(await checkbox('#traitSelected',secondTrait.id).isChecked(),true);
 for(const ref of savedDominants){assert.equal(await checkbox('#dominantTraits',ref).isChecked(),true);assert.equal(await dominantStar(ref).textContent(),'★')}
 // Switching away hides breed inputs while retaining the previous explicit choices.
 await page.locator('#breedStatus').selectOption('unknown');await expectBreedHidden();await page.locator('#breedStatus').selectOption('selected');assert.equal(await checkbox('#breedSelected',firstBreed.id).isChecked(),true);assert.equal(await page.locator('#breedPrimary').inputValue(),secondBreed.id);
 await page.locator('#breedStatus').selectOption('unknown');await page.locator('#savePet').click();const archivedBreed=await page.evaluate(()=>AniMoiData.read().pets[0].characteristics.breed);assert.equal(archivedBreed.status,'unknown');assert.deepEqual(new Set(archivedBreed.retainedSelection.ids),new Set([firstBreed.id,secondBreed.id]));assert.equal(archivedBreed.retainedSelection.primaryId,secondBreed.id);assert(archivedBreed.retainedSelection.custom.includes(legacyProfile.breed));
 await page.reload();await card(legacyProfile.id).locator('.pet-edit').click();assert.equal(await page.locator('#breedStatus').inputValue(),'unknown');await expectBreedHidden();await page.locator('#breedStatus').selectOption('selected');assert.equal(await checkbox('#breedSelected',secondBreed.id).isChecked(),true);assert.equal(await page.locator('#breedPrimary').inputValue(),secondBreed.id);assert.equal(await checkbox('#breedSelected','custom:'+legacyProfile.breed).isChecked(),true);await page.locator('#savePet').click();enriched=await page.evaluate(()=>AniMoiData.read().pets[0]);

 await openAccount();const catalogDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();const catalogBackupText=fs.readFileSync(await(await catalogDownload).path(),'utf8');const catalogBackup=JSON.parse(catalogBackupText);assert.deepEqual(catalogBackup.pets[0],enriched);
 await page.evaluate(()=>{const state=AniMoiData.read();state.pets[0].name='Modifié après sauvegarde';state.pets[0].characteristics.temperament.custom=[];state.pets[0].characteristics.temperament.dominant=[];AniMoiData.write(state)});
 page.once('dialog',dialog=>dialog.accept());const preRestore=page.waitForEvent('download'),restoreCharacteristicsNavigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.locator('#restoreFile').setInputFiles({name:'characteristics.json',mimeType:'application/json',buffer:Buffer.from(catalogBackupText)});await Promise.all([preRestore,restoreCharacteristicsNavigation]);await page.waitForFunction(()=>window.AniMoiData&&Array.isArray(window.AniMoiData.read().pets)&&window.AniMoiData.read().pets[0]?.name==='Profil ancien renommé');assert.equal(await page.locator('#homeScreen').isVisible(),true);assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets),catalogBackup.pets);
 await page.reload();
 const varietyProfiles=[['Poisson','Poisson variété test','Combattant à nageoires courtes test'],['Hamster','Hamster variété test','Hamster nain de Campbell test'],['Oiseau','Oiseau variété test','Perruche ondulée test']];
 for(const [species,name,detail] of varietyProfiles){
  await openHome();await page.locator('#addAnimal').click();await page.locator('#petName').fill(name);await page.locator('#species').selectOption(species);assert.equal(await page.locator('#breedStatus').inputValue(),'not-applicable');await expectBreedHidden();assert.equal(await page.locator('#speciesDetail').isVisible(),true);assert.equal(await page.locator('#speciesDetail').getAttribute('maxlength'),'200');assert.equal(await page.locator('#speciesDetail').evaluate(input=>input.required),false);await page.locator('#speciesDetail').fill(detail);
  const placeholders={};for(const code of ['fr','en','es','de','it']){await setLanguage(code);assert.equal(await page.locator('html').getAttribute('lang'),code);assert.equal(await page.locator('#speciesDetail').inputValue(),detail);placeholders[code]=await page.locator('#speciesDetail').getAttribute('placeholder');assert(placeholders[code],species+' needs an example in '+code)}assert.notEqual(placeholders.fr,placeholders.en);await setLanguage('fr');
  await page.locator('#savePet').click();const saved=await page.evaluate(name=>AniMoiData.read().pets.find(p=>p.name===name),name);assert.equal(saved.characteristics.breed.status,'not-applicable');assert.deepEqual(saved.characteristics.speciesDetail,{species,text:detail});await page.reload();await card(saved.id).locator('.pet-edit').click();assert.equal(await page.locator('#speciesDetail').inputValue(),detail);await page.locator('#breedStatus').selectOption('unknown');assert.equal(await page.locator('#speciesDetail').isVisible(),false);await page.locator('#savePet').click();assert.deepEqual(await page.evaluate(id=>AniMoiData.read().pets.find(p=>p.id===id).characteristics.speciesDetail,saved.id),{species,text:detail});await page.reload();await card(saved.id).locator('.pet-edit').click();assert.equal(await page.locator('#breedStatus').inputValue(),'unknown');assert.equal(await page.locator('#speciesDetail').isVisible(),false);await page.locator('#breedStatus').selectOption('not-applicable');assert.equal(await page.locator('#speciesDetail').inputValue(),detail);await page.locator('#savePet').click();await openHome();
 }
 await openAccount();const varietyDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();const varietyBackupText=fs.readFileSync(await(await varietyDownload).path(),'utf8');const varietyBackup=JSON.parse(varietyBackupText);assert.equal(varietyBackup.pets.filter(p=>p.characteristics?.speciesDetail?.text).length,3);
 await page.evaluate(()=>{const state=AniMoiData.read();state.pets=state.pets.filter(p=>!p.characteristics?.speciesDetail?.text);AniMoiData.write(state)});page.once('dialog',dialog=>dialog.accept());const beforeVarietyRestore=page.waitForEvent('download'),restoreVarietiesNavigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.locator('#restoreFile').setInputFiles({name:'species-details.json',mimeType:'application/json',buffer:Buffer.from(varietyBackupText)});await Promise.all([beforeVarietyRestore,restoreVarietiesNavigation]);await page.waitForFunction(()=>window.AniMoiData&&Array.isArray(window.AniMoiData.read().pets)&&window.AniMoiData.read().pets.length===4);assert.equal(await page.locator('#homeScreen').isVisible(),true);assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets),varietyBackup.pets);

 console.log('OK trois choix de race, champs masqués hors sélection connue, archives de races conservées, trois traits dominants et nettoyage, variétés de poisson/hamster/oiseau dans cinq langues et sauvegarde/restauration complète');
 // Real offline species and variety entries complement existing free-form precisions.
 const speciesRadio=id=>page.locator('#speciesResults input[type="radio"][value='+JSON.stringify(id)+']');
 const speciesRow=id=>page.locator('#speciesResults label:has(input[value='+JSON.stringify(id)+'])');
 const labelFor=(entry,code)=>entry.labels?.[code]||entry.labels?.fr||entry.labels?.en||entry.id;
 const selectedCatalogues=[];
 for(const [species,scientificName] of [['Poisson','Betta splendens'],['Oiseau','Melopsittacus undulatus'],['Hamster','Mesocricetus auratus']]){
  await page.reload();await openHome();await page.locator('#addAnimal').click();await page.locator('#petName').fill('Catalogue '+species+' test');await page.locator('#species').selectOption(species);assert.equal(await page.locator('#breedStatus').inputValue(),'not-applicable');assert.equal(await page.locator('#speciesCatalogueFields').isVisible(),true);assert(await page.locator('#speciesResults input[type=radio]').count()>0);assert(await page.locator('#speciesResults input[type=radio]').count()<=20);
  const entries=await page.evaluate(species=>AniMoiSpecies.species[species].entries,species);let entry=entries.find(entry=>entry.kind==='species'&&entry.scientificName===scientificName);assert(entry,species+' needs a real common species');
  const photoPng=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;const draw=canvas.getContext('2d');draw.fillStyle='#7047b8';draw.fillRect(0,0,8,8);return canvas.toDataURL('image/png').split(',')[1]});await page.locator('#photo').setInputFiles({name:'catalogue-test.png',mimeType:'image/png',buffer:Buffer.from(photoPng,'base64')});await page.waitForFunction(()=>document.getElementById('profilePic').style.display==='block');const catalogPhoto=await page.locator('#profilePic').getAttribute('src');
  await page.locator('#speciesSearch').fill(scientificName);assert.equal(await speciesRadio(entry.id).count(),1);assert((await speciesRow(entry.id).textContent()).includes(scientificName));await speciesRow(entry.id).click();assert.equal(await speciesRadio(entry.id).isChecked(),true);
  if(species==='Poisson'){entry=entries.find(entry=>entry.kind==='variety');assert(entry,'fish varieties must be distinct from species');await page.locator('#speciesSearch').fill(labelFor(entry,'fr'));assert((await speciesRow(entry.id).textContent()).includes(entry.scientificName));assert.match(await speciesRow(entry.id).locator('small').textContent(),/variété/i);await speciesRow(entry.id).click()}
  const frenchLabel=labelFor(entry,'fr');assert.equal(await page.locator('#speciesCatalogSelected').textContent(),frenchLabel);await page.locator('#speciesSearch').fill('aucune espèce de ce nom xyz');assert.equal(await page.locator('#speciesResults input[type=radio]').count(),0);assert.equal(await page.locator('#speciesCatalogSelected').textContent(),frenchLabel);assert.equal(await page.locator('#speciesDetail').inputValue(),frenchLabel);
  for(const code of ['fr','en','es','de','it']){await setLanguage(code);await page.locator('#speciesSearch').fill(entry.scientificName);assert.equal(await speciesRadio(entry.id).isChecked(),true);assert.equal(await page.locator('#speciesResults input:checked').count(),1);assert.equal(await page.locator('#speciesCatalogSelected').textContent(),labelFor(entry,code));assert.equal(await page.locator('#speciesDetail').inputValue(),labelFor(entry,code));await page.locator('#speciesSearch').fill(labelFor(entry,code));assert.equal(await speciesRadio(entry.id).count(),1)}
  await setLanguage('fr');await page.locator('#savePet').click();let saved=await page.evaluate(name=>AniMoiData.read().pets.find(p=>p.name===name),'Catalogue '+species+' test');assert.deepEqual(saved.characteristics.speciesDetail,{species,text:frenchLabel,catalogueId:entry.id});assert.equal(saved.photo,catalogPhoto);await page.reload();await card(saved.id).locator('.pet-edit').click();assert.equal(await page.locator('#speciesCatalogSelected').textContent(),frenchLabel);assert.equal(await page.locator('#profilePic').getAttribute('src'),catalogPhoto);
  if(species==='Oiseau'){
   await setLanguage('en');const visibleEnglish=labelFor(entry,'en');assert.notEqual(visibleEnglish,frenchLabel);assert.equal(await page.locator('#speciesDetail').inputValue(),visibleEnglish);await page.locator('#speciesCatalogClear').click();assert.equal(await page.locator('#speciesDetail').inputValue(),visibleEnglish);assert.equal(await page.locator('#speciesResults input:checked').count(),0);await page.locator('#savePet').click();const free=await page.evaluate(id=>AniMoiData.read().pets.find(p=>p.id===id).characteristics.speciesDetail,saved.id);assert.deepEqual(free,{species,text:visibleEnglish});await page.reload();await card(saved.id).locator('.pet-edit').click();assert.equal(await page.locator('#speciesDetail').inputValue(),visibleEnglish);await setLanguage('fr');
  }else if(species==='Hamster'){
   await page.locator('#speciesDetail').fill('Précision libre de hamster test');assert.equal(await page.locator('#speciesResults input:checked').count(),0);assert.equal(await page.locator('#speciesCatalogClear').isVisible(),false);await page.locator('#savePet').click();assert.deepEqual(await page.evaluate(id=>AniMoiData.read().pets.find(p=>p.id===id).characteristics.speciesDetail,saved.id),{species,text:'Précision libre de hamster test'});await page.reload();await card(saved.id).locator('.pet-edit').click();assert.equal(await page.locator('#speciesDetail').inputValue(),'Précision libre de hamster test');
  }
  await page.locator('#speciesSearch').fill(entry.scientificName);await speciesRow(entry.id).click();await page.locator('#savePet').click();saved=await page.evaluate(id=>AniMoiData.read().pets.find(p=>p.id===id),saved.id);assert.equal(saved.characteristics.speciesDetail.catalogueId,entry.id);assert.equal(saved.photo,catalogPhoto);selectedCatalogues.push(saved);
 }
 const futureSpecies=JSON.parse(JSON.stringify(selectedCatalogues[0]));futureSpecies.id='species-future-ui';futureSpecies.name='Précision future test';futureSpecies.breed='Précision future conservée test';futureSpecies.characteristics.speciesDetail={species:'Poisson',text:'Précision future conservée test',catalogueId:'species:future-test'};
 await page.evaluate(pet=>{const state=AniMoiData.read();state.pets.push(pet);AniMoiData.write(state)},futureSpecies);await page.reload();await card(futureSpecies.id).locator('.pet-edit').click();for(const code of ['fr','en','es','de','it']){await setLanguage(code);assert.equal(await page.locator('#speciesCatalogSelected').textContent(),futureSpecies.characteristics.speciesDetail.text);assert.equal(await page.locator('#speciesDetail').inputValue(),futureSpecies.characteristics.speciesDetail.text)}await setLanguage('fr');await page.locator('#petName').fill(futureSpecies.name+' renommée');await page.locator('#savePet').click();assert.equal(await page.evaluate(()=>AniMoiData.read().pets.find(p=>p.id==='species-future-ui').characteristics.speciesDetail.catalogueId),'species:future-test');
 await openAccount();const speciesDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();const speciesBackupText=fs.readFileSync(await(await speciesDownload).path(),'utf8');const speciesBackup=JSON.parse(speciesBackupText);for(const old of varietyBackup.pets)assert.deepEqual(speciesBackup.pets.find(p=>p.id===old.id),old);
 await page.evaluate(()=>{const state=AniMoiData.read();state.pets=state.pets.filter(p=>!p.characteristics?.speciesDetail?.catalogueId);AniMoiData.write(state)});page.once('dialog',dialog=>dialog.accept());const beforeSpeciesRestore=page.waitForEvent('download'),restoreSpeciesNavigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.locator('#restoreFile').setInputFiles({name:'species-catalogues.json',mimeType:'application/json',buffer:Buffer.from(speciesBackupText)});await Promise.all([beforeSpeciesRestore,restoreSpeciesNavigation]);await page.waitForFunction(count=>window.AniMoiData&&Array.isArray(window.AniMoiData.read().pets)&&window.AniMoiData.read().pets.length===count,speciesBackup.pets.length);assert.equal(await page.locator('#homeScreen').isVisible(),true);assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets),speciesBackup.pets);
 // All seven supported groups expose actual catalogue rows in the applicable control.
 await page.reload();await page.locator('#addAnimal').click();for(const species of ['Chien','Chat','Lapin','Cheval','Poisson','Oiseau','Hamster']){await page.locator('#species').selectOption(species);const hasBreeds=['Chien','Chat','Lapin','Cheval'].includes(species);await page.locator('#breedStatus').selectOption(hasBreeds?'selected':'not-applicable');const selector=hasBreeds?'#breedResults input[type=checkbox]':'#speciesResults input[type=radio]';assert(await page.locator(selector).count()>0,species+' needs actual catalogue rows');assert(await page.locator(selector).count()<=20)}
 console.log('OK sept catalogues accessibles, espèces scientifiques et variétés distinctes, sélection unique et ID stable dans cinq langues, retrait/texte libre sans perte, identifiant futur conservé et sauvegarde/restauration complète');
 // A typed custom origin is saved even if the species changes before Add is touched.
 await page.reload();await openHome();await page.locator('#addAnimal').click();await page.locator('#petName').fill('Origine en cours test');await page.locator('#species').selectOption('Chien');await page.locator('#breedStatus').selectOption('selected');await page.locator('#customBreed').fill('Origine saisie avant changement test');await page.locator('#species').selectOption('Poisson');await page.locator('#savePet').click();const pendingOrigin=await page.evaluate(()=>AniMoiData.read().pets.find(p=>p.name==='Origine en cours test'));assert([...pendingOrigin.characteristics.breed.custom,...(pendingOrigin.characteristics.breed.retainedSelection?.custom||[])].includes('Origine saisie avant changement test'));
 await page.reload();await card(pendingOrigin.id).locator('.pet-edit').click();await page.locator('#breedStatus').selectOption('selected');assert.equal(await page.locator('#customBreed').isVisible(),true);assert.equal(await checkbox('#breedSelected','custom:Origine saisie avant changement test').isChecked(),true);assert.equal(await page.locator('#breedResults input[type=checkbox]').count(),0);
 console.log('OK origine personnalisée saisie sans Ajouter conservée après changement d’espèce, enregistrement et rechargement');
 // Exceptional but valid historical values must not prevent future profile edits.
 const exceptional={id:'legacy-exceptional',name:'Ancien profil atypique',species:'Espèce historique test',breed:'Origine ancienne '+ 'R'.repeat(210)+'\nAutre origine',traits:'calme\ncurieux '+ 'T'.repeat(201),photo:'',futureProfileField:{kept:'champ historique test'}};
 await page.evaluate(pet=>AniMoiData.write({pets:[pet],posts:[],settings:AniMoiData.read().settings}),exceptional);await page.reload();await card(exceptional.id).locator('.pet-edit').click();assert.equal(await page.locator('#species').inputValue(),exceptional.species);await page.locator('#petName').fill('Ancien profil atypique renommé');await page.locator('#savePet').click();
 const nameOnly=await page.evaluate(()=>AniMoiData.read().pets[0]);assert.deepEqual(nameOnly,{...exceptional,name:'Ancien profil atypique renommé'});assert.equal(Object.hasOwn(nameOnly,'characteristics'),false);
 await openHome();await card(exceptional.id).locator('.pet-edit').click();await page.locator('#traitSearch').fill('Joueur');await checkbox('#traitResults','playful').check();await checkbox('#dominantTraits','legacy').check();await checkbox('#dominantTraits','id:playful').check();await page.locator('#savePet').click();const exceptionalEdited=await page.evaluate(()=>AniMoiData.read().pets[0]);
 assert.equal(exceptionalEdited.species,exceptional.species);assert.equal(exceptionalEdited.breed,exceptional.breed);assert(exceptionalEdited.traits.includes(exceptional.traits));assert.equal(exceptionalEdited.characteristics.breed.legacyText,exceptional.breed);assert.equal(exceptionalEdited.characteristics.temperament.legacyText,exceptional.traits);assert.deepEqual(exceptionalEdited.futureProfileField,exceptional.futureProfileField);assert.deepEqual(new Set(exceptionalEdited.characteristics.temperament.dominant),new Set(['legacy','id:playful']));
 console.log('OK textes historiques longs et multilignes, espèce ancienne et champs supplémentaires préservés après édition, focus clavier conservé après retrait des sélections');
 // The former Other and No defined breed records still open with the simplified choices.
 for(const [oldStatus,newChoice] of [['other','selected'],['none','unknown']]){
  const historical={id:'status-'+oldStatus,name:'Ancien statut '+oldStatus,species:'Chien',breed:oldStatus==='other'?'Origine libre ancienne test':'',traits:'',photo:'',characteristics:{version:1,breed:{status:oldStatus,ids:[],custom:oldStatus==='other'?['Origine libre ancienne test']:[],primaryId:null},temperament:{ids:[],custom:[]}}};
  await page.evaluate(pet=>AniMoiData.write({pets:[pet],posts:[],settings:AniMoiData.read().settings}),historical);await page.reload();await card(historical.id).locator('.pet-edit').click();assert.equal(await page.locator('#breedStatus').inputValue(),newChoice);if(newChoice==='unknown')await expectBreedHidden();else assert.equal(await page.locator('#customBreed').isVisible(),true);assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets[0]),historical);
  await page.locator('#petName').fill(historical.name+' renommé');await page.locator('#savePet').click();assert.deepEqual(await page.evaluate(()=>AniMoiData.read().pets[0]),{...historical,name:historical.name+' renommé'});
 }
 console.log('OK anciens statuts Autre et Sans race définie affichés via les trois choix sans migration automatique ni perte');
 assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
