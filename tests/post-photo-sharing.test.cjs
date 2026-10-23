const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../v2-preview/i18n.js');
for (const locale of ['fr', 'en', 'es', 'de', 'it']) require('../v2-preview/locales/' + locale + '.js');
const publications = require('../v2-preview/caption.js');
const photo = 'data:image/jpeg;base64,/9j/2Q==';
const text = 'Mon aventure corrigée. 🐾\n\n#Animoi #VieDAnimal #Chat #MaMarque';
function feedback(initial = '') {
  return { textContent: initial, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } };
}
beforeEach(() => i18n.setLocale('fr'));
afterEach(() => i18n.setLocale('fr'));

test('native photo sharing starts synchronously with the exact text and a typed File, preserving user activation', async () => {
  let invoked = false, capability, request;
  const status = feedback();
  const task = publications.shareText(text, { photo, feedback: status, navigator: {
    canShare(data) { capability = data; return true; },
    share(data) { invoked = true; request = data; return Promise.resolve(); },
    clipboard: { writeText() { assert.fail('No clipboard after native success'); } }
  } });
  assert.equal(invoked, true, 'navigator.share must run before the first asynchronous boundary');
  assert.equal(await task, 'shared');
  assert.equal(request.title, 'Ani’Moi');
  assert.equal(request.text, text);
  assert.deepEqual(Object.keys(request).sort(), ['files', 'text', 'title']);
  assert.equal(request.files.length, 1);
  assert(request.files[0] instanceof File);
  assert.equal(capability.files[0], request.files[0]);
  assert.equal(request.files[0].type, 'image/jpeg');
  assert.equal(request.files[0].name, 'animoi-publication.jpg');
  assert.deepEqual(new Uint8Array(await request.files[0].arrayBuffer()), Uint8Array.of(255, 216, 255, 217));
  assert.equal(status.textContent, i18n.t('sharing.shared'));
});

test('false, missing or throwing file capability shares exact text and explains that the photo is omitted', async () => {
  for (const canShare of [() => false, undefined, () => { throw new Error('Capability unavailable'); }]) {
    let request;
    const status = feedback();
    assert.equal(await publications.shareText(text, { photo, feedback: status, navigator: {
      ...(canShare ? { canShare } : {}),
      share(data) { request = data; return Promise.resolve(); },
      clipboard: { writeText() { assert.fail('No clipboard after text sharing succeeds'); } }
    } }), 'shared');
    assert.deepEqual(request, { title: 'Ani’Moi', text });
    assert(status.textContent.includes(i18n.t('postPhoto.textOnly')));
    assert.equal(status.attributes['aria-live'], 'polite');
  }
});

test('a failed native attachment share falls back once to clipboard with the original text and an honest photo message', async () => {
  let copied, nativeCalls = 0, clipboardCalls = 0;
  const status = feedback();
  assert.equal(await publications.shareText(text, { photo, feedback: status, navigator: {
    canShare() { return true; },
    async share(data) { nativeCalls++; assert.equal(data.files.length, 1); throw Object.assign(new Error('Denied'), { name: 'NotAllowedError' }); },
    clipboard: { async writeText(value) { clipboardCalls++; copied = value; } }
  } }), 'copied');
  assert.equal(nativeCalls, 1);
  assert.equal(clipboardCalls, 1);
  assert.equal(copied, text);
  assert(status.textContent.includes(i18n.t('sharing.copied')));
  assert(status.textContent.includes(i18n.t('postPhoto.shareFallback')));
});

test('cancelling native photo sharing is silent and never opens clipboard fallback', async () => {
  const status = feedback('Message précédent');
  assert.equal(await publications.shareText(text, { photo, feedback: status, navigator: {
    canShare() { return true; },
    async share() { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); },
    clipboard: { writeText() { assert.fail('Cancellation must not copy data'); } }
  } }), 'cancelled');
  assert.equal(status.textContent, 'Message précédent');
});

test('without native sharing or clipboard the existing editor selects exact text while preserving the attachment', async () => {
  const status = feedback();
  const calls = [];
  const editor = { value: text, focus() { calls.push('focus'); }, select() { calls.push('select'); } };
  const options = { photo, editor, feedback: status, navigator: {} };
  assert.equal(await publications.shareText(text, options), 'manual');
  assert.deepEqual(calls, ['focus', 'select']);
  assert.equal(editor.value, text);
  assert.equal(options.photo, photo);
  assert(status.textContent.includes(i18n.t('sharing.manual')));
  assert(status.textContent.includes(i18n.t('postPhoto.textOnly')));
});

test('remote URLs, SVG and invalid data are never passed to native sharing as files or URLs', async () => {
  for (const invalidPhoto of ['https://example.test/private.jpg', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/jpeg;base64,!invalid!', null, '']) {
    let request;
    assert.equal(await publications.shareText(text, { photo: invalidPhoto, navigator: {
      canShare() { assert.fail('Invalid photos must not reach file capability detection'); },
      share(data) { request = data; return Promise.resolve(); }
    } }), 'shared');
    assert.deepEqual(request, { title: 'Ani’Moi', text });
    assert.equal(Object.hasOwn(request, 'url'), false);
    assert.equal(Object.hasOwn(request, 'files'), false);
  }
});

test('empty text never shares or copies a photo in isolation', async () => {
  const nav = { canShare() { assert.fail('No file probe for empty text'); }, share() { assert.fail('No empty publication share'); }, clipboard: { writeText() { assert.fail('No empty publication copy'); } } };
  assert.equal(await publications.shareText(' \n ', { photo, navigator: nav }), 'empty');
});

test('photo-sharing fallback messages come from each of the five interface catalogues', async () => {
  const texts = [];
  for (const locale of ['fr', 'en', 'es', 'de', 'it']) {
    i18n.setLocale(locale);
    const status = feedback();
    assert.equal(await publications.shareText(text, { photo, feedback: status, navigator: { share() { return Promise.resolve(); } } }), 'shared');
    const expected = i18n.t('postPhoto.textOnly');
    assert.notEqual(expected, 'postPhoto.textOnly');
    assert(status.textContent.includes(expected));
    texts.push(expected);
  }
  assert.equal(new Set(texts).size, 5);
});
