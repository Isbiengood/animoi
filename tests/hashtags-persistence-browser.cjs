'use strict';
// Isolated synthetic mobile coverage. No hosting, real user data or database.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const species = ['Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'];
const labels = {
  fr: ['VieDAnimal', 'Chien', 'Chat', 'Oiseau', 'Lapin', 'Cheval', 'Poisson', 'Hamster', 'Autre'],
  en: ['AnimalLife', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Horse', 'Fish', 'Hamster', 'Other'],
  es: ['VidaAnimal', 'Perro', 'Gato', 'Pajaro', 'Conejo', 'Caballo', 'Pez', 'Hamster', 'Otro'],
  de: ['Tierleben', 'Hund', 'Katze', 'Vogel', 'Kaninchen', 'Pferd', 'Fisch', 'Hamster', 'Andere'],
  it: ['VitaAnimale', 'Cane', 'Gatto', 'Uccello', 'Coniglio', 'Cavallo', 'Pesce', 'Criceto', 'Altro']
};
const defaults = (locale, index) => ['#Animoi', '#' + labels[locale][0], '#' + labels[locale][index + 1]];
const tagCount = (text, tag) => (text.match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).filter(value => value.toLocaleLowerCase('en') === tag.toLocaleLowerCase('en')).length;
const ordinary = ['pawbook', 'sav', 'linkedin'];

(async () => {
  const root = path.resolve(__dirname, '..');
  const work = process.env.ANIMOI_HASHTAG_PERSISTENCE_TEST_OUTPUT || '/workspace/work/animoi-hashtags-classification/hashtags-persistence';
  fs.mkdirSync(work, {recursive: true});
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
  const report = {status: 'running', browser: 'Chromium mobile emulation', physicalSafariTest: false, widths: [320, 390], languages: Object.keys(labels), species, matrixCases: [], checks: [], pageErrors: [], outsideRequests: []};
  try {
    browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext({acceptDownloads: true, viewport: {width: 320, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 3, timezoneId: 'Europe/Paris'});
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      report.outsideRequests.push(url); return route.abort();
    });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(origin + '/v2-preview/index.html', {waitUntil: 'networkidle'});
    const state = () => page.evaluate(() => AniMoiData.read());
    const rawContent = () => page.evaluate(() => ({pets: localStorage.getItem('animoi-pets-v1'), posts: localStorage.getItem('animoi-posts-v2')}));
    const flag = locale => page.locator('.language-button[data-language=' + JSON.stringify(locale) + ']').tap();
    const openAnimal = async index => {await page.locator('#openHome').tap(); await page.locator('.v2-card[data-pet-id=' + JSON.stringify('persistence-' + index) + '] .pet-open').tap();};
    const history = id => page.locator('#petHistory .publication-card[data-post-id=' + JSON.stringify(id) + ']');
    const networkPost = id => page.locator('#networkScreen .publication-card[data-post-id=' + JSON.stringify(id) + ']');
    const layout = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': no horizontal overflow');
      for (const button of await page.locator('button:visible, summary:visible').all()) {
        const box = await button.boundingBox();
        assert(box && box.width >= 43.5 && box.height >= 43.5, label + ': touch target ' + await button.textContent());
      }
    };
    const fixture = await page.evaluate(species => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
      canvas.getContext('2d').fillStyle = '#7042bb'; canvas.getContext('2d').fillRect(0, 0, 16, 16);
      const photo = canvas.toDataURL('image/png');
      return {pets: species.map((name, index) => ({id: 'persistence-' + index, name: 'Animal fictif ' + index, species: name, breed: '', traits: 'curieux, calme', photo: index % 2 ? '' : photo, birthDate: '2020-05-12', futureProfile: {preserve: [index, 'original']}})),
        posts: [{id: 'persistence-legacy', petId: 'persistence-0', text: '  Mon ancien récit reste intact.\r\n\r\n#MaMarque #Chien\r\n ', photo, date: 1234, originalLanguage: 'pt-BR', ownerId: 'synthetic-owner', futurePost: {keep: true}},
          {id: 'persistence-orphan', petId: 'missing-pet', text: 'Une histoire orpheline conservée. #Personnel', date: 1400, originalLanguage: 'und', futurePost: ['keep']}],
        settings: {language: 'fr', learningConsent: false, autoTranslate: false, futureSetting: {keep: true}}};
    }, species);
    await page.evaluate(value => AniMoiData.write(value), fixture); await page.reload({waitUntil: 'networkidle'});
    const profileBytes = (await rawContent()).pets;
    let attachmentCases = 0, recategorizedCases = 0;
    for (const width of report.widths) {
      await page.setViewportSize({width, height: 844});
      for (const [localeIndex, locale] of report.languages.entries()) {
        for (let index = 0; index < species.length; index++) {
          const proposed = defaults(locale, index);
          const rubric = ['pawbook', 'sav', 'linkedin', 'potins'][(index + localeIndex + (width === 390 ? 1 : 0)) % 4];
          await openAnimal(index); await flag(locale); await page.locator('#newStory').tap();
          // Exact reproduction of the former missing-footer issue: the story
          // already includes its species tag before generated defaults appear.
          const anecdote = 'Mon humain et moi avons voulu sortir mais nous avons attendu parce que la pluie tombait dans le jardin. Je raconte avec ' + proposed[2] + ' et ma marque #MarqueAmie.';
          await page.locator('#story').fill(anecdote); await page.locator('#rubric').selectOption(rubric); await page.locator('#generate').tap();
          const text = await page.locator('#editPost').inputValue();
          assert(text.endsWith(proposed.join(' ')), width + '/' + locale + '/' + species[index] + ': all three proposed hashtags below text');
          for (const tag of proposed) assert.equal(tagCount(text, tag), 1, width + '/' + locale + '/' + species[index] + ': unique ' + tag);
          assert.equal(tagCount(text, '#MarqueAmie'), 1);
          assert(text.includes('Je raconte avec ' + proposed[2].slice(1) + ' et ma marque #MarqueAmie.'), 'consolidation preserves the species word inside the anecdote');
          assert.equal(await page.locator('#postRubric').inputValue(), rubric);
          if (index === 0) {
            await layout('official release ' + width + '/' + locale);
            await page.locator('#postPhotoFile').setInputFiles({name: 'synthetic-post.png', mimeType: 'image/png', buffer: Buffer.from(fixture.posts[0].photo.split(',')[1], 'base64')});
            await page.waitForFunction(() => document.querySelector('#postAttachmentPreview')?.getAttribute('src')?.startsWith('data:image/jpeg;base64,') && document.querySelector('#postPhotoFields').getAttribute('aria-busy') === 'false');
            attachmentCases++;
          }
          await page.locator('#savePost').tap();
          const saved = (await state()).posts.at(-1);
          assert.equal(saved.petId, 'persistence-' + index); assert.equal(saved.rubric, rubric); assert.equal(saved.text, text); assert.equal(saved.originalLanguage, 'fr');
          if (index === 0) assert(saved.photo?.startsWith('data:image/jpeg;base64,'));
          if (rubric === 'potins') assert.equal(saved.editorial.status, 'draft');
          assert.equal(await history(saved.id).locator('.publication-text').textContent(), text);
          const beforeReload = await rawContent();
          await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForFunction(() => window.AniMoiNavigation && !document.querySelector('#openNetwork').disabled);
          assert.deepEqual(await rawContent(), beforeReload, 'same-origin reload does not rewrite local content');
          await openAnimal(index); assert.equal(await history(saved.id).locator('.publication-text').textContent(), text);
          const changedLocale = report.languages[(localeIndex + 1) % report.languages.length];
          await flag(changedLocale); assert.deepEqual(await rawContent(), beforeReload, 'interface change preserves saved hashtags');
          await page.locator('#openNetwork').tap(); await page.locator('#networkAll').tap();
          assert.equal(await networkPost(saved.id).locator('.publication-text').textContent(), text, 'All includes the locally accessible original');
          await page.locator('.universe-button[data-rubric=' + JSON.stringify(rubric) + ']').tap();
          assert.equal(await networkPost(saved.id).locator('.publication-text').textContent(), text, 'selected rubric keeps hashtags visible');
          if (rubric === 'potins') assert.equal(await page.locator('#gazettePublished .publication-card').count(), 0, 'local proposal never becomes a public article');
          if (index < 2 && rubric !== 'potins') {
            const nextRubric = ordinary[(ordinary.indexOf(rubric) + 1) % ordinary.length];
            await networkPost(saved.id).locator('.post-classify').tap(); await page.locator('#postRubric').selectOption(nextRubric); await page.locator('#savePost').tap();
            const changed = (await state()).posts.find(post => post.id === saved.id);
            for (const field of ['id', 'petId', 'date', 'text', 'photo', 'originalLanguage']) assert.deepEqual(changed[field], saved[field], 'classification preserves ' + field);
            assert.equal(changed.rubric, nextRubric); assert.equal((await state()).posts.filter(post => post.id === saved.id).length, 1); recategorizedCases++;
          }
          assert.equal((await rawContent()).pets, profileBytes, 'existing profiles and photos remain byte-identical');
          for (const legacy of fixture.posts) assert.deepEqual((await state()).posts.find(post => post.id === legacy.id), legacy, 'historical and orphan original remain untouched');
          report.matrixCases.push({width, locale, species: species[index], initialRubric: rubric, postId: saved.id});
        }
      }
      // A real JSON download and explicit guarded restore, not a mock of the
      // repository serializer. Install navigation waits before file input.
      await page.locator('#openAccount').tap(); await flag('fr');
      const downloading = page.waitForEvent('download'); await page.locator('button[data-i18n="nav.export"]').tap();
      const backupText = fs.readFileSync(await (await downloading).path(), 'utf8'), backup = JSON.parse(backupText);
      assert.deepEqual(backup.posts, (await state()).posts); assert.deepEqual(backup.pets, fixture.pets);
      await page.evaluate(() => {const value = AniMoiData.read(); value.posts = value.posts.filter(post => post.id === 'persistence-orphan'); AniMoiData.write(value);});
      const preRestore = page.waitForEvent('download'), restoreNavigation = page.waitForNavigation({waitUntil: 'domcontentloaded'});
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#restoreFile').setInputFiles({name: 'synthetic-hashtag-backup-' + width + '.json', mimeType: 'application/json', buffer: Buffer.from(backupText)});
      await Promise.all([preRestore, restoreNavigation]);
      await page.waitForFunction(count => window.AniMoiNavigation && window.AniMoiData && AniMoiData.read().posts.length === count && !document.querySelector('#openNetwork').disabled, backup.posts.length);
      assert.deepEqual((await state()).posts, backup.posts); assert.deepEqual((await state()).pets, backup.pets); assert.deepEqual((await state()).settings, backup.settings);
      await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForFunction(() => window.AniMoiData && window.AniMoiNavigation && !document.querySelector('#openNetwork').disabled);
      assert.deepEqual((await state()).posts, backup.posts); assert.equal((await rawContent()).pets, profileBytes);
      await openAnimal(0); await layout('restored history ' + width); await page.screenshot({path: path.join(work, 'restored-history-' + width + '.png'), fullPage: true});
      report.checks.push('JSON download, guarded restore and reload at ' + width + 'px preserve every exact post, hashtag, photo, profile and preference.');
    }
    assert.equal(report.matrixCases.length, 80);
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.outsideRequests, []);
    report.matrixCombinations = report.matrixCases.length; report.attachmentCases = attachmentCases; report.recategorizedCases = recategorizedCases;
    report.checks.unshift('All 80 species/language/mobile combinations generate three unique hashtags in the footer even when the source anecdote already contains its species tag; personal brands remain intact.',
      'Every generated story is saved under the correct animal and rubric, survives same-context reload and flag changes, and keeps visible hashtags in history, All and its selected rubric.',
      'Ordinary manual rubric changes preserve the same ID, animal, creation date, exact text/hashtags, language and optional post photo without duplication; Potins drafts never enter the public Gazette.',
      'The official release controls in all five languages at 320 and 390px and restored histories have no horizontal overflow and touch targets of at least 44px.');
    report.status = 'passed'; fs.writeFileSync(path.join(work, 'hashtags-persistence-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({...report, matrixCases: report.matrixCases.length}, null, 2));
  } finally {if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
