'use strict';
// Synthetic local data only. This suite never contacts hosting or a database.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const languages = ['fr', 'en', 'es', 'de', 'it'];
const rubrics = ['pawbook', 'sav', 'linkedin', 'potins'];
const styles = {pawbook:'carnet', sav:'dossier', linkedin:'career', potins:'gazette'};
const sourceStories = {
  fr:'Mon humain et moi avons découvert ce jardin. Je raconte que je reste curieux dans cette histoire. #MaMarque',
  en:'My human wanted to walk with me today. I am curious about this story. #MaMarque',
  es:'Mi humano quería salir de paseo conmigo hoy porque hacía buen tiempo. Soy curioso en esta historia. #MaMarque',
  de:'Mein Mensch wollte heute mit mir spazieren gehen, weil es nicht regnet. Ich bin neugierig auf diese Geschichte. #MaMarque',
  it:'Il mio umano voleva fare una passeggiata con me oggi perché non piove. Sono curioso di questa storia. #MaMarque'
};
const sentinels = ['TraitInvisibleXYZ', '★'];
const labels = /Mon caractère\s*:|My personality\s*:|Mi carácter\s*:|Mein Charakter\s*:|Il mio carattere\s*:/u;

// Exact version-9 template signatures, kept as fixtures independently from the
// current formatter. No profile or story from a real browser is read.
function legacyText(locale, rubric, profile, traits, tags) {
  const frames = {
    fr:{intro:'COMMUNIQUÉ OFFICIEL 🐾', prefix:{pawbook:'Cher journal,', sav:'À l’attention du service réclamations des humains,', linkedin:'Note interne de la direction des opérations domestiques,', potins:'EXCLUSIVITÉ — La presse animalière révèle :'}, quote:'Voici les faits selon mon humain :', identity:`Moi, ${profile.name}, chien ${profile.breed}, je tiens à faire entendre ma version.`, personality:`Mon caractère : ${traits}. Moi, je transforme chaque imprévu en terrain de jeu. Je prends le temps de savourer les petits moments. Il faut absolument que j’explore cette affaire.`, ending:'J’exige réparation sous forme de friandises. Sans négociation. 😂'},
    en:{intro:'OFFICIAL STATEMENT 🐾', prefix:{pawbook:'Dear diary,', sav:'To the human complaints department,', linkedin:'Internal memo from the director of household operations,', potins:'EXCLUSIVE — Breaking news from the animal press:'}, quote:'Here is what my human says happened:', identity:`I am ${profile.name}, a dog (${profile.breed}). This is my side of the story.`, personality:`My personality: ${traits}. I tell this adventure in my own way.`, ending:'I demand compensation in treats. No negotiations. 😂'},
    es:{intro:'COMUNICADO OFICIAL 🐾', prefix:{pawbook:'Querido diario:', sav:'A la atención del departamento de reclamaciones de los humanos:', linkedin:'Nota interna de la dirección de operaciones domésticas:', potins:'EXCLUSIVA — La prensa animal revela:'}, quote:'Esto es lo que cuenta mi humano:', identity:`Soy ${profile.name}, un perro (${profile.breed}). Quiero contar mi versión de la historia.`, personality:`Mi carácter: ${traits}. Cuento esta aventura a mi manera.`, ending:'Exijo una compensación en golosinas. Sin negociación. 😂'},
    de:{intro:'OFFIZIELLE MITTEILUNG 🐾', prefix:{pawbook:'Liebes Tagebuch,', sav:'An die Beschwerdestelle für Menschen,', linkedin:'Interne Mitteilung der Leitung für häusliche Abläufe,', potins:'EXKLUSIV — Neues aus der Tierpresse:'}, quote:'So erzählt mein Mensch, was passiert ist:', identity:`Ich bin ${profile.name}, ein Hund (${profile.breed}). Hier ist meine Sicht der Geschichte.`, personality:`Mein Charakter: ${traits}. Ich erzähle dieses Abenteuer auf meine eigene Art.`, ending:'Ich fordere Entschädigung in Leckerlis. Nicht verhandelbar. 😂'},
    it:{intro:'COMUNICATO UFFICIALE 🐾', prefix:{pawbook:'Caro diario,', sav:'All’attenzione dell’ufficio reclami degli umani,', linkedin:'Nota interna della direzione delle operazioni domestiche,', potins:'ESCLUSIVA — La stampa animale rivela:'}, quote:'Ecco come il mio umano racconta i fatti:', identity:`Sono ${profile.name}, un cane (${profile.breed}). Voglio raccontare la mia versione della storia.`, personality:`Il mio carattere: ${traits}. Racconto questa avventura a modo mio.`, ending:'Esigo un risarcimento in bocconcini. Senza trattative. 😂'}
  };
  const f = frames[locale];
  return [f.intro, f.prefix[rubric], `${f.quote} « ${sourceStories[locale]} »`, f.identity, f.personality, f.ending, tags].join('\n\n');
}
function noProfileList(text, context) {
  assert(!labels.test(text), context + ': no automatic personality label');
  for (const marker of sentinels) assert(!text.includes(marker), context + ': no profile trait/dominant ' + marker);
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const work = process.env.ANIMOI_PERSONALITY_TEST_OUTPUT || '/workspace/work/animoi-publication-personality';
  fs.mkdirSync(work, {recursive:true});
  const server = http.createServer((request, response) => {
    const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) {response.writeHead(403).end(); return;}
    fs.readFile(file, (error, data) => {
      if (error) {response.writeHead(404).end(); return;}
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(data);
    });
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const report = {status:'running', languages, widths:[320,390], rubrics, newStoryCases:0, historicalReadCases:0, checks:[], pageErrors:[], outsideRequests:[], physicalSafariTest:false};
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox']});
    const context = await browser.newContext({acceptDownloads:true, viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      report.outsideRequests.push(url); return route.abort();
    });
    await context.addInitScript(() => {
      window.__personalityShares = []; window.__personalityCopies = []; window.__personalityCanvas = [];
      Object.defineProperty(navigator, 'share', {configurable:true, value:async data => window.__personalityShares.push({text:data.text, title:data.title})});
      Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async text => window.__personalityCopies.push(text)}});
      const draw = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {window.__personalityCanvas.push(String(text)); return draw.call(this, text, ...args);};
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(origin + '/v2-preview/index.html', {waitUntil:'networkidle'});
    const base = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 12;
      canvas.getContext('2d').fillStyle = '#7042bb'; canvas.getContext('2d').fillRect(0,0,12,12);
      const photo = canvas.toDataURL('image/png');
      const profile = {id:'personality-pet', name:'Animal fictif', species:'Chien', breed:'Labrador synthétique', traits:'Joueur, Calme, Curieux, TraitInvisibleXYZ', photo,
        characteristics:{version:1, breed:{status:'selected', ids:[], primaryId:null, custom:['Labrador synthétique']}, temperament:{ids:['playful','calm','curious'], custom:['TraitInvisibleXYZ'], dominant:['id:playful','id:calm','custom:TraitInvisibleXYZ']}}, futureProfile:{keep:['original']}};
      return {profile, traits:Object.fromEntries(['fr','en','es','de','it'].map(locale => [locale,AniMoiCharacteristics.display(profile,locale).traits])), tags:Object.fromEntries(['fr','en','es','de','it'].map(locale => [locale,AniMoiPublications.defaultHashtags(profile.species,locale)])), ai:AniMoiCharacteristics.toAIContext(profile,'fr')};
    });
    const fixture = {pets:[base.profile], posts:languages.flatMap((locale,index) => rubrics.map((rubric,rubricIndex) => ({id:'old-' + locale + '-' + rubric, petId:base.profile.id, text:legacyText(locale,rubric,base.profile,base.traits[locale],base.tags[locale]), date:1000+index*10+rubricIndex, originalLanguage:locale, rubric, tone:'drôle', photo:base.profile.photo, ownerId:'synthetic-owner', futurePost:{keep:true}, ...(rubric==='potins' ? {editorial:{status:'draft'}} : {})}))), settings:{language:'fr', learningConsent:false, autoTranslate:false, futureSetting:{keep:true}}};
    fixture.posts.push({id:'authored-traits', petId:base.profile.id, rubric:'pawbook', text:'Mon humain dit que je suis curieux et calme. Ce sont mes mots dans mon histoire. #MaMarque', date:900, originalLanguage:'fr'});
    await page.evaluate(value => AniMoiData.write(value), fixture); await page.reload({waitUntil:'networkidle'});
    const state = () => page.evaluate(() => AniMoiData.read());
    const rawContent = () => page.evaluate(() => ({pets:localStorage.getItem('animoi-pets-v1'),posts:localStorage.getItem('animoi-posts-v2')}));
    const history = id => page.locator('#petHistory .publication-card[data-post-id=' + JSON.stringify(id) + ']');
    const networkPost = id => page.locator('#networkFeed .publication-card[data-post-id=' + JSON.stringify(id) + ']');
    const home = () => page.locator('#openHome').tap();
    const openAnimal = async () => {await home(); await page.locator('.v2-card[data-pet-id="personality-pet"] .pet-open').tap();};
    const flag = locale => page.locator('.language-button[data-language=' + JSON.stringify(locale) + ']').tap();
    const layout = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': no horizontal overflow');
      for (const button of await page.locator('button:visible,summary:visible').all()) {
        const box = await button.boundingBox(); assert(box && box.width>=43.5 && box.height>=43.5, label + ': touch target ' + await button.textContent());
      }
    };
    const originalProfileBytes = (await rawContent()).pets;
    const originalPosts = fixture.posts;
    for (const width of report.widths) {
      await page.setViewportSize({width,height:844});
      for (const locale of languages) {
        await flag(locale); await openAnimal();
        const beforeRead = await rawContent();
        noProfileList(await page.locator('.animal-summary').textContent(), 'animal history header ' + width + '/' + locale);
        assert.equal(await history('authored-traits').locator('.publication-text').textContent(),fixture.posts.at(-1).text,'free authored story words are never globally censored');
        for (const rubric of rubrics) {
          const id = 'old-' + locale + '-' + rubric;
          const visible = await history(id).locator('.publication-text').textContent();
          noProfileList(visible,'historical reader ' + width + '/' + locale + '/' + rubric);
          assert(visible.includes(sourceStories[locale]),'original anecdote preserved');
          assert(visible.includes(base.tags[locale]),'hashtags preserved');
          assert.equal(await history(id).getAttribute('data-style'),styles[rubric]);
          noProfileList(await history(id).locator('.publication-author').textContent(),'publication identity');
          assert((await history(id).locator('.publication-author').textContent()).includes(base.profile.name));
          assert((await history(id).locator('.publication-animal-meta').textContent()).includes(base.profile.breed));
          assert.equal(await history(id).locator('.publication-avatar').count(),1); assert.equal(await history(id).locator('.publication-photo').count(),1);
          await history(id).locator('.post-share').tap();
          assert.equal((await page.evaluate(() => __personalityShares.at(-1))).text,visible,'native share uses displayed original without automatic profile list');
          await page.locator('#openNetwork').tap(); await page.locator('.universe-button[data-rubric=' + JSON.stringify(rubric) + ']').tap();
          assert.equal(await networkPost(id).locator('.publication-text').textContent(),visible); noProfileList(await networkPost(id).textContent(),'network card');
          if(rubric==='potins') assert.equal(await page.locator('#gazettePublished .publication-card').count(),0);
          await openAnimal(); report.historicalReadCases++;
        }
        assert.deepEqual(await rawContent(),beforeRead,'reading/shared display never migrates profile or original publication text');
        await layout('history ' + width + '/' + locale);
        // A missing engine and returning to original cannot restore a hidden
        // profile list, even for a foreign-language historical publication.
        const foreign = history('old-' + (locale==='en'?'fr':'en') + '-pawbook');
        const beforeTranslation = await foreign.locator('.publication-text').textContent();
        assert.equal(await page.evaluate(() => AniMoiTranslation.available),false);
        await foreign.locator('.show-translation').tap();
        assert.equal(await foreign.locator('.translation-status').textContent(),await page.evaluate(() => AniMoiI18n.t('translation.unavailable')));
        assert.equal(await foreign.locator('.publication-text').textContent(),beforeTranslation);
        await foreign.locator('.show-original').evaluate(node=>node.click());
        assert.equal(await foreign.locator('.publication-text').textContent(),beforeTranslation);
        // Owner editing keeps the original source; an unchanged explicit save
        // must not replace it with its non-destructive reader projection.
        const editId = 'old-' + locale + '-pawbook'; const oldPost = originalPosts.find(post=>post.id===editId);
        await history(editId).locator('.post-edit').tap();
        assert.equal(await page.locator('#editPost').inputValue(),oldPost.text.replace(/\r\n/g,'\n'));
        const projected = await page.evaluate(text=>AniMoiStoryFormatter.publicationText(text),oldPost.text);
        await page.locator('#copy').tap(); assert.equal(await page.evaluate(()=>__personalityCopies.at(-1)),projected);
        await page.locator('#share').tap(); assert.equal((await page.evaluate(()=>__personalityShares.at(-1))).text,projected);
        const beforeManualCopy=await rawContent();
        await page.evaluate(()=>{
          window.__restorePersonalityClipboard=navigator.clipboard.writeText;
          window.__restorePersonalityShare=navigator.share;
          navigator.clipboard.writeText=async()=>{throw Error('clipboard denied for synthetic test');};
          Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
        });
        for(const action of ['copy','share']) {
          await page.locator('#'+action).tap();
          const manual=page.locator('#feedback .sharing-manual-copy');
          assert.equal(await manual.count(),1,'exactly one projected manual-copy field');
          assert.equal(await manual.inputValue(),projected); noProfileList(await manual.inputValue(),'manual '+action);
          assert.equal(await manual.getAttribute('readonly'),'');
          assert.deepEqual(await manual.evaluate(node=>[node.selectionStart,node.selectionEnd]),[0,projected.length]);
          assert.equal(await page.locator('#editPost').inputValue(),oldPost.text.replace(/\r\n/g,'\n'),'manual fallback never replaces private source');
          assert.deepEqual(await rawContent(),beforeManualCopy,'manual fallback never writes profile/post data');
        }
        await page.evaluate(()=>{
          navigator.clipboard.writeText=window.__restorePersonalityClipboard;
          Object.defineProperty(navigator,'share',{configurable:true,value:window.__restorePersonalityShare});
        });
        if(width===390 && locale==='fr') {
          await page.locator('#imageTools summary').tap(); await page.locator('#shareFormat').selectOption('story');
          await page.evaluate(()=>{window.__personalityCanvas=[];window.__personalityMeasure=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=()=>({width:1});});
          await page.locator('#makeImage').tap(); await page.waitForFunction(()=>document.querySelector('#cardCanvas').style.display==='block');
          const drawn = await page.evaluate(()=>__personalityCanvas.join('\n')); noProfileList(drawn,'optional image');
          assert(drawn.includes(sourceStories.fr),'optional image draws the story text');
          await page.evaluate(()=>CanvasRenderingContext2D.prototype.measureText=window.__personalityMeasure);
        }
        await page.locator('#savePost').tap(); assert.deepEqual((await state()).posts.find(post=>post.id===editId),oldPost,'unchanged private editor preserves full historical source');
        for(const rubric of rubrics) {
          await page.locator('#newStory').tap(); await page.locator('#story').fill(sourceStories[locale]); await page.locator('#rubric').selectOption(rubric); await page.locator('#generate').tap();
          assert.equal(await page.locator('#feedback .sharing-manual-copy').count(),0,'new draft clears previous manual copy');
          const text = await page.locator('#editPost').inputValue(); noProfileList(text,'new official statement ' + width + '/' + locale + '/' + rubric);
          assert(text.includes(sourceStories[locale])); assert(text.includes(base.tags[locale]));
          noProfileList(await page.locator('#postMeta').textContent(),'official statement identity'); await layout('official statement ' + width + '/' + locale);
          await page.locator('#savePost').tap(); const saved=(await state()).posts.at(-1);
          assert.equal(saved.petId,base.profile.id); assert.equal(saved.rubric,rubric); assert.equal(saved.text,text);
          if(rubric==='potins')assert.equal(saved.editorial.status,'draft');
          noProfileList(await history(saved.id).textContent(),'new saved publication'); report.newStoryCases++;
        }
        assert.equal((await rawContent()).pets,originalProfileBytes,'every profile byte remains unchanged');
        assert.deepEqual((await state()).posts.filter(post=>originalPosts.some(old=>old.id===post.id)),originalPosts,'historical stories are unchanged');
        assert.deepEqual(await page.evaluate(()=>AniMoiCharacteristics.toAIContext(AniMoiData.read().pets[0],'fr')),base.ai,'all personality data remains available to the future AI context');
        if((width===390&&locale==='fr')||(width===320&&locale==='de')) {
          await history('old-'+locale+'-pawbook').screenshot({path:path.join(work,'publication-sans-caracteres-'+width+'-'+locale+'.png')});
          await page.screenshot({path:path.join(work,'lecture-'+width+'-'+locale+'.png'),fullPage:false});
        }
      }
    }
    report.checks.push('Five languages × 320/390px × four rubrics: new official statements and historical reading/network cards do not display automatic profile lists or dominant stars; authored personality words, photo, name, species, breed, rubric, text and hashtags remain.');
    report.checks.push('Foreign historical originals remain projected through unavailable translation, original restoration, native sharing, copying and optional image rendering; private owner editing and unchanged save retain the complete stored original.');
    report.checks.push('Denied clipboard and unavailable native share select only a temporary readonly projected field, including with a photo; source/profile/post bytes stay intact and a new draft clears that field in all five languages at both mobile widths.');
    await home(); await page.locator('.v2-card[data-pet-id="personality-pet"] .pet-edit').tap();
    assert.equal(await page.locator('#dominantTraits input:checked').count(),3); assert.equal(await page.evaluate(()=>AniMoiCharacteristics.traits.length),52);
    assert.equal((await rawContent()).pets,originalProfileBytes); assert.deepEqual((await state()).pets,fixture.pets);
    report.checks.push('The profile editor retains all 52 choices and three selected dominant stars; raw profile JSON and prioritised future AI context stay identical.');
    await page.locator('#openAccount').tap(); await flag('fr');
    const downloading=page.waitForEvent('download'); await page.locator('[data-i18n="nav.export"]').tap();
    const backupText=fs.readFileSync(await(await downloading).path(),'utf8'),backup=JSON.parse(backupText);
    assert.deepEqual(backup.pets,fixture.pets); assert.deepEqual(backup.posts,(await state()).posts);
    for(const old of originalPosts)assert.deepEqual(backup.posts.find(post=>post.id===old.id),old,'backup preserves complete historical source');
    await page.evaluate(()=>{const s=AniMoiData.read();s.posts=[];AniMoiData.write(s);});
    const navigation=page.waitForNavigation({waitUntil:'domcontentloaded'}),preRestore=page.waitForEvent('download');page.once('dialog',dialog=>dialog.accept());
    await page.locator('#restoreFile').setInputFiles({name:'publication-personality.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await Promise.all([navigation,preRestore]);
    await page.waitForFunction(count=>window.AniMoiData&&window.AniMoiNavigation&&AniMoiData.read().posts.length===count,backup.posts.length);
    assert.deepEqual((await state()).pets,backup.pets);assert.deepEqual((await state()).posts,backup.posts);
    await page.reload({waitUntil:'networkidle'});assert.deepEqual((await state()).posts,backup.posts);await openAnimal();noProfileList(await history('old-fr-pawbook').locator('.publication-text').textContent(),'restored reader');
    assert.deepEqual(await page.evaluate(()=>AniMoiCharacteristics.toAIContext(AniMoiData.read().pets[0],'fr')),base.ai);
    report.checks.push('Real JSON download, explicit guarded restore and reload retain profiles, structured/custom personality, dominant priorities, all original stories/photos/hashtags and new posts without adding a migration.');
    assert.equal(report.historicalReadCases,40); assert.equal(report.newStoryCases,40);
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);report.status='passed';
  } catch(error) {report.status='failed';report.error=error.stack||String(error);process.exitCode=1;}
  finally {
    if(browser)await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(work,'publication-personality-browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
