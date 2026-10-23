'use strict';
// Synthetic images and data only. This suite never opens the private hosted Site.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const work = process.env.ANIMOI_PHOTO_TEST_OUTPUT || '/workspace/work/animoi-post-photos';
  fs.mkdirSync(work, { recursive: true });
  const server = http.createServer((request, response) => {
    const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(data);
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const pageErrors = [], outsideRequests = [], checks = [];
  const report = { status: 'running', checks, pageErrors, outsideRequests, physicalSafariTest: false };
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, timezoneId: 'Europe/Paris' });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      outsideRequests.push(url); return route.abort();
    });
    await context.addInitScript(() => {
      window.__photoShares = []; window.__photoCopies = []; window.__photoCanShare = true;
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => window.__photoCanShare && Array.isArray(data.files) && data.files.length === 1 });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        const files = await Promise.all((data.files || []).map(async file => ({ name: file.name, type: file.type, size: file.size, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) })));
        window.__photoShares.push({ text: data.text, title: data.title, url: data.url, files });
      } });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => window.__photoCopies.push(text) } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000); page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(origin + '/v2-preview/index.html', { waitUntil: 'networkidle' });
    const state = () => page.evaluate(() => AniMoiData.read());
    const raw = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
    const card = id => page.locator('.v2-card[data-pet-id=' + JSON.stringify(id) + ']');
    const post = id => page.locator('#petHistory .v2-post[data-post-id=' + JSON.stringify(id) + ']');
    const home = () => page.locator('#openHome').tap();
    const openAnimal = async id => { await home(); await card(id).locator('.pet-open').tap(); };
    const input = page.locator('#postPhotoFile'), preview = page.locator('#postAttachmentPreview');
    const newStory = async (petId, text) => {
      await openAnimal(petId); await page.locator('#newStory').tap();
      await page.locator('#story').fill(text); await page.locator('#generate').tap();
    };
    const upload = async (buffer, name = 'photo-synthetique.png', mimeType = 'image/png') => {
      await input.setInputFiles({ name, mimeType, buffer });
      await page.waitForFunction(() => {
        const photo = document.getElementById('postAttachmentPreview');
        return photo && !photo.hidden && photo.complete && photo.naturalWidth > 0 && !document.getElementById('savePost').disabled;
      });
      return preview.getAttribute('src');
    };
    const fixture = await page.evaluate(() => {
      const image = (color, width, height) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
        return canvas.toDataURL('image/png');
      };
      const profile = image('#7042bb', 16, 16);
      return {
        red: image('#bf3333', 2200, 600), green: image('#26823a', 320, 240),
        state: {
          pets: [
            { id: 'photo-animal-a', name: 'Animal A fictif', species: 'Chat', breed: '', traits: 'curieux', photo: profile, futureProfile: { keep: true } },
            { id: 'photo-animal-b', name: 'Animal B fictif', species: 'Chien', breed: '', traits: 'calme', photo: '' }
          ],
          posts: [
            { id: 'legacy-photo-a', petId: 'photo-animal-a', text: 'Je garde ma publication historique.\n\n#Animoi #VieDAnimal #Chat #MaMarque', originalLanguage: 'pt-BR', date: 1000, futurePost: { keep: true } },
            { id: 'legacy-photo-b', petId: 'photo-animal-b', text: 'Une autre histoire reste indépendante. #Ancien', originalLanguage: 'fr', date: 2000 }
          ], settings: { language: 'fr', learningConsent: false, futureSetting: 'keep' }
        }
      };
    });
    const red = Buffer.from(fixture.red.split(',')[1], 'base64'), green = Buffer.from(fixture.green.split(',')[1], 'base64');
    await page.evaluate(value => AniMoiData.write(value), fixture.state);
    await page.reload({ waitUntil: 'networkidle' });
    const originalRaw = await raw();
    await openAnimal('photo-animal-a');
    assert.equal(await post('legacy-photo-a').locator('img.post-photo').count(), 0);
    await post('legacy-photo-a').locator('.post-edit').tap();
    assert.equal(await preview.isVisible(), false); assert.deepEqual(await raw(), originalRaw);
    await page.locator('[data-i18n="preview.back"]').tap(); assert.deepEqual(await raw(), originalRaw);
    checks.push('Historical posts without photos remain untouched when viewed or edited, including original language, hashtags and unknown metadata.');

    await newStory('photo-animal-a', 'Mon humain et moi avons découvert une nouvelle cachette dans le jardin.');
    const text = await page.locator('#editPost').inputValue();
    const photoA = await upload(red);
    assert.match(photoA, /^data:image\/jpeg;base64,/); assert(photoA.length <= 600000);
    const dimensions = await preview.evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }));
    assert(Math.max(dimensions.width, dimensions.height) <= 1280); assert.notEqual(photoA, fixture.state.pets[0].photo);
    await input.setInputFiles({ name: 'pas-une-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('Photo invalide fictive') });
    await page.waitForFunction(() => document.getElementById('postPhotoFeedback').textContent.trim() !== '' && !document.getElementById('savePost').disabled);
    assert.equal(await preview.getAttribute('src'), photoA);
    await input.setInputFiles([]); assert.equal(await preview.getAttribute('src'), photoA);
    await page.locator('#imageTools > summary').tap();
    await page.locator('#makeImage').tap();
    await page.locator('#cardCanvas').waitFor({ state: 'visible' });
    const cardPixels = await page.locator('#cardCanvas').evaluate(canvas => {
      const context = canvas.getContext('2d');
      return { post: [...context.getImageData(540, 500, 1, 1).data], avatar: [...context.getImageData(110, 235, 1, 1).data] };
    });
    assert(cardPixels.post[0] > cardPixels.post[1] * 1.5 && cardPixels.post[0] > cardPixels.post[2] * 1.5, 'optional card must use the red post photo as its main image');
    assert(cardPixels.avatar[2] > cardPixels.avatar[0] && cardPixels.avatar[0] > cardPixels.avatar[1], 'optional card must retain the violet profile photo in its small avatar');
    await page.locator('#imageTools > summary').tap();
    await page.screenshot({ path: path.join(work, 'post-photo-390.png'), fullPage: true });
    await page.locator('#savePost').tap();
    let saved = (await state()).posts.find(value => !fixture.state.posts.some(old => old.id === value.id));
    assert(saved); const newId = saved.id;
    assert.equal(saved.petId, 'photo-animal-a'); assert.equal(saved.text, text); assert.equal(saved.photo, photoA);
    assert.deepEqual((await state()).pets, fixture.state.pets);
    assert.deepEqual((await state()).posts.filter(value => value.id !== newId), fixture.state.posts);
    assert.equal(await post(newId).locator('img.post-photo').getAttribute('src'), photoA);
    await page.locator('#openNetwork').tap();
    assert.equal(await page.locator('.community-entry[data-post-id=' + JSON.stringify(newId) + '] img.post-photo').getAttribute('src'), photoA);
    await openAnimal('photo-animal-b'); assert.equal(await page.locator('#petHistory img.post-photo').count(), 0);
    checks.push('A selected photo is resized to JPEG, previewed and saved only on its intended publication; invalid or cancelled file selection preserves the previous photo, and profile photos stay separate. History and network show the attachment. The optional image card uses the post photo as its main image and retains the profile photo in the small avatar.');

    await openAnimal('photo-animal-a'); await post(newId).locator('.post-edit').tap();
    const originalSaved = structuredClone(saved), photoB = await upload(green);
    assert.notEqual(photoA, photoB); await page.locator('#savePost').tap();
    saved = (await state()).posts.find(value => value.id === newId);
    assert.equal((await state()).posts.length, 3); assert.equal(saved.photo, photoB);
    for (const field of ['id', 'petId', 'date', 'text', 'originalLanguage']) assert.equal(saved[field], originalSaved[field]);
    await post(newId).locator('.post-edit').tap(); await page.locator('#removePostPhoto').tap();
    assert.equal(await preview.isVisible(), false); const beforeCancel = await raw();
    await page.locator('[data-i18n="preview.back"]').tap(); assert.deepEqual(await raw(), beforeCancel);
    assert.equal((await state()).posts.find(value => value.id === newId).photo, photoB);
    await post(newId).locator('.post-edit').tap(); await page.locator('#removePostPhoto').tap(); await page.locator('#savePost').tap();
    assert.equal(Boolean((await state()).posts.find(value => value.id === newId).photo), false);
    assert.equal(await post(newId).locator('img.post-photo').count(), 0);
    await post('legacy-photo-a').locator('.post-edit').tap(); await upload(red); await page.locator('#savePost').tap();
    const legacy = (await state()).posts.find(value => value.id === 'legacy-photo-a');
    assert.equal(legacy.photo, photoA); assert.equal(legacy.originalLanguage, 'pt-BR'); assert.equal(legacy.date, 1000);
    assert.equal(legacy.text, fixture.state.posts[0].text); assert.deepEqual(legacy.futurePost, { keep: true });
    assert.equal((await state()).posts.length, 3);
    checks.push('Adding, replacing and removing a photo edits the existing publication without a duplicate or an inferred text-language change. Cancelling an edit never removes the stored attachment.');

    await post('legacy-photo-a').locator('.post-edit').tap(); await upload(green);
    const beforeFailure = await raw();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'animoi-transaction-v1') throw new Error('photo-quota-test'); return original.call(this, key, value); };
      window.__restorePhotoStorage = () => Storage.prototype.setItem = original;
    });
    const alertMessage = page.waitForEvent('dialog').then(async dialog => { const message = dialog.message(); await dialog.accept(); return message; });
    await page.locator('#savePost').tap(); assert.match(await alertMessage, /photo-quota-test/);
    assert.deepEqual(await raw(), beforeFailure); assert.equal(await preview.getAttribute('src'), photoB);
    assert.equal(await page.locator('#savePost').isVisible(), true); await page.evaluate(() => __restorePhotoStorage());
    await page.locator('[data-i18n="preview.back"]').tap();
    assert.equal((await state()).posts.find(value => value.id === 'legacy-photo-a').photo, photoA);
    checks.push('A storage quota failure leaves the saved publication, other posts and profiles intact, keeps the prepared photo available, and allows cancellation or retry.');

    await post('legacy-photo-a').locator('.post-share').tap();
    await page.waitForFunction(() => window.__photoShares.length > 0);
    const shared = await page.evaluate(() => __photoShares.at(-1));
    assert.equal(shared.text, legacy.text); assert.equal(shared.url, undefined); assert.equal(shared.files.length, 1);
    assert.equal(shared.files[0].type, 'image/jpeg'); assert.deepEqual(shared.files[0].bytes, [...Buffer.from(photoA.split(',')[1], 'base64')]);
    await page.evaluate(() => { window.__photoCanShare = false; });
    await post('legacy-photo-a').locator('.post-share').tap();
    await page.waitForFunction(() => window.__photoShares.length > 1);
    const textShare = await page.evaluate(() => __photoShares.at(-1));
    assert.equal(textShare.text, legacy.text); assert.deepEqual(textShare.files, []);
    await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
    await post('legacy-photo-a').locator('.post-share').tap();
    assert.equal(await page.evaluate(() => __photoCopies.at(-1)), legacy.text);
    checks.push('Native sharing includes the attached JPEG and original text/hashtags when supported; unsupported file sharing uses text, and absent native sharing uses clipboard, without exposing the private URL.');

    // Resolve a controlled asynchronous preparation only after the user leaves
    // its draft. Real decoding/compression is already exercised above.
    const deferPhoto = photo => page.evaluate(value => {
      const original = AniMoiPostPhoto.prepare;
      let release;
      const pending = new Promise(resolve => { release = resolve; });
      AniMoiPostPhoto.prepare = () => pending;
      window.__releaseDeferredPhoto = async () => {
        AniMoiPostPhoto.prepare = original; release(value);
        await Promise.resolve(); await Promise.resolve();
      };
    }, photo);
    await newStory('photo-animal-a', 'Mon humain et moi préparons une nouvelle petite aventure dans le jardin.');
    const beforeDeferred = await raw(); await deferPhoto(photoB);
    await input.setInputFiles({ name: 'photo-differee.png', mimeType: 'image/png', buffer: green });
    assert.equal(await page.locator('#savePost').isDisabled(), true);
    assert.equal(await page.locator('#share').isDisabled(), true);
    await page.evaluate(() => { document.getElementById('savePost').onclick(); document.getElementById('share').onclick(); });
    assert.deepEqual(await raw(), beforeDeferred);
    await page.locator('#removePostPhoto').tap(); await page.evaluate(() => __releaseDeferredPhoto());
    assert.equal(await preview.isVisible(), false); assert.equal(await page.locator('#savePost').isEnabled(), true);
    assert.deepEqual(await raw(), beforeDeferred);
    await deferPhoto(photoA);
    await input.setInputFiles({ name: 'autre-photo-differee.png', mimeType: 'image/png', buffer: red });
    assert.equal(await page.locator('#savePost').isDisabled(), true);
    await newStory('photo-animal-b', 'Une aventure différente avec mon humain et moi dans une autre maison.');
    const unrelatedDraft = await page.locator('#editPost').inputValue();
    await page.evaluate(() => __releaseDeferredPhoto());
    assert.equal(await preview.isVisible(), false); assert.equal(await page.locator('#savePost').isEnabled(), true);
    assert.equal(await page.locator('#editPost').inputValue(), unrelatedDraft); assert.deepEqual(await raw(), beforeDeferred);
    checks.push('While a photo is preparing, saving/sharing is blocked. Removing it or starting another animal story invalidates the delayed result: no stale image reappears and no draft or saved data is overwritten.');

    const translatedLabels = [], translatedRemove = [];
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const locale of ['fr', 'en', 'es', 'de', 'it']) {
        await page.locator('.language-button[data-language=' + JSON.stringify(locale) + ']').tap();
        await openAnimal('photo-animal-a'); await post('legacy-photo-a').locator('.post-edit').tap();
        const label = await input.evaluate(node => [...node.labels].map(value => value.textContent).join(' ').trim());
        assert(label && label !== 'postPhoto.label'); assert.equal(await preview.getAttribute('src'), photoA);
        const remove = page.locator('#removePostPhoto'), box = await remove.boundingBox();
        assert(box && box.height >= 43.5 && box.width >= 43.5);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if (width === 390) { translatedLabels.push(label); translatedRemove.push(await remove.textContent()); }
        await page.locator('[data-i18n="preview.back"]').tap();
      }
    }
    assert.equal(new Set(translatedLabels).size, 5); assert.equal(new Set(translatedRemove).size, 5);
    await page.locator('.language-button[data-language="fr"]').tap();
    await newStory('photo-animal-b', 'Une autre petite aventure pour mon humain et moi dans la maison.');
    assert.equal(await preview.isVisible(), false);
    await page.locator('#savePost').tap();
    const textOnly = (await state()).posts.at(-1);
    assert.equal(textOnly.petId, 'photo-animal-b'); assert.equal(Boolean(textOnly.photo), false);
    checks.push('The five catalogues label the photo controls at 320/390px with touch-sized removal and no horizontal overflow. A new story never inherits another post or animal photo, and text-only publication remains possible.');

    await page.locator('#openAccount').tap();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter mes données', exact: true }).tap();
    const backupText = fs.readFileSync(await (await downloading).path(), 'utf8'), backup = JSON.parse(backupText);
    assert.equal(backup.posts.find(value => value.id === 'legacy-photo-a').photo, photoA);
    assert.deepEqual(backup.pets, fixture.state.pets);
    await page.evaluate(() => { const value = AniMoiData.read(); value.posts = value.posts.filter(post => post.id !== 'legacy-photo-a'); AniMoiData.write(value); });
    page.once('dialog', dialog => dialog.accept());
    const restoring = page.waitForNavigation({ waitUntil: 'domcontentloaded' }), preRestoreBackup = page.waitForEvent('download');
    await page.locator('#restoreFile').setInputFiles({ name: 'post-photos-backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) });
    await Promise.all([restoring, preRestoreBackup]);
    await page.waitForFunction(() => window.AniMoiData && AniMoiData.read().posts.some(post => post.id === 'legacy-photo-a'));
    assert.deepEqual((await state()).posts, backup.posts); assert.deepEqual((await state()).pets, backup.pets);
    await openAnimal('photo-animal-a');
    assert.equal(await post('legacy-photo-a').locator('img.post-photo').getAttribute('src'), photoA);
    await page.reload({ waitUntil: 'networkidle' }); assert.deepEqual((await state()).posts, backup.posts);
    checks.push('JSON backup and actual guarded restore preserve post photos, text, hashtags, languages, profile photos and extension metadata, including another reload and the historical storage keys.');
    assert.deepEqual(pageErrors, []); assert.deepEqual(outsideRequests, []);
    report.status = 'passed'; report.viewportWidths = [320, 390]; report.languages = ['fr', 'en', 'es', 'de', 'it'];
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || String(error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(work, 'post-photos-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
