const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const photo = require('../v2-preview/post-photo.js');
const source = fs.readFileSync(path.join(__dirname, '../v2-preview/post-photo.js'), 'utf8');
const jpeg = 'data:image/jpeg;base64,/9j/2Q==';
function environment(options = {}) {
  const calls = { created: [], revoked: [], drawings: [], exports: [] };
  class Image {
    constructor() { this.naturalWidth = options.width ?? 2400; this.naturalHeight = options.height ?? 1200; }
    set src(value) { queueMicrotask(() => options.badImage ? this.onerror() : this.onload()); }
  }
  const canvas = {
    width: 0, height: 0,
    getContext() { return options.noContext ? null : { fillRect() {}, drawImage(...args) { calls.drawings.push(args.slice(1)); } }; },
    toDataURL(type, quality) {
      calls.exports.push({ type, quality, width: this.width, height: this.height });
      if (options.canvasError) throw new Error('Synthetic canvas failure');
      return options.output ? options.output(calls.exports.length) : jpeg;
    }
  };
  const context = vm.createContext({ module: { exports: {} }, Image, document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } }, URL: { createObjectURL(file) { calls.created.push(file); return 'blob:synthetic'; }, revokeObjectURL(url) { calls.revoked.push(url); } }, queueMicrotask });
  vm.runInContext(source, context);
  return { api: context.module.exports, calls };
}
test('rendering accepts raster data URLs and rejects remote, executable, SVG and malformed attachments', () => {
  for (const type of ['jpeg', 'png', 'webp', 'gif']) assert.equal(photo.isRenderable('data:image/' + type + ';base64,AAAA'), true);
  for (const value of [undefined, null, '', 12, {}, 'https://example.test/photo.jpg', 'javascript:alert(1)', 'data:image/svg+xml;base64,AAAA', 'data:text/html;base64,AAAA', 'data:image/png;base64,A', 'data:image/png;base64,AA=A', 'data:image/png;base64,AAAA\n', 'data:image/jpeg;base64,', 'data:image/jpeg;base64,AAAA?']) assert.equal(photo.isRenderable(value), false, String(value));
});
test('sharing converts exact data bytes to a correctly typed file without fetching a URL', async () => {
  const file = photo.fileForShare(jpeg);
  assert(file instanceof File);
  assert.equal(file.name, 'animoi-publication.jpg');
  assert.equal(file.type, 'image/jpeg');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), Uint8Array.of(255, 216, 255, 217));
  for (const value of [null, '', 'https://example.test/photo.jpg', 'data:image/svg+xml;base64,AAAA']) assert.equal(photo.fileForShare(value), null);
});
test('sharing degrades safely when File or base64 decoding is unavailable', () => {
  for (const extra of [{}, { File, atob() { throw new Error('Unavailable'); } }]) {
    const context = vm.createContext({ module: { exports: {} }, ...extra });
    vm.runInContext(source, context);
    assert.equal(context.module.exports.fileForShare(jpeg), null);
  }
});
test('unsupported, empty and oversized files fail before allocating a blob URL', async () => {
  const { api, calls } = environment();
  for (const value of [null, {}, { type: 'text/plain', size: 10 }, { type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: NaN }]) await assert.rejects(api.prepare(value), error => error.code === 'photo.invalid');
  await assert.rejects(api.prepare({ type: 'image/jpeg', size: api.MAX_INPUT_BYTES + 1 }), error => error.code === 'photo.tooLarge');
  assert.equal(calls.created.length, 0);
});
test('a photograph is scaled proportionally, converted locally to JPEG and its blob URL is revoked', async () => {
  const { api, calls } = environment();
  const original = { type: 'image/png', size: 2000 };
  assert.equal(await api.prepare(original), jpeg);
  assert.deepEqual(calls.drawings, [[0, 0, 1280, 640]]);
  assert.equal(calls.exports[0].type, 'image/jpeg');
  assert.equal(calls.exports[0].quality, 0.78);
  assert.deepEqual(calls.created, [original]);
  assert.deepEqual(calls.revoked, ['blob:synthetic']);
});
test('small images are not enlarged; supported HEIC and empty MIME iPhone files rely on browser decoding', async () => {
  for (const original of [{ type: 'image/heic', size: 100 }, { type: '', name: 'IMG_001.HEIC', size: 100 }]) {
    const { api, calls } = environment({ width: 300, height: 200 });
    assert.equal(await api.prepare(original), jpeg);
    assert.deepEqual(calls.drawings, [[0, 0, 300, 200]]);
  }
});
test('decoding, invalid dimensions and canvas failures release their object URLs and report a usable error', async () => {
  for (const settings of [{ badImage: true }, { width: 0 }, { noContext: true }, { canvasError: true }, { output: () => 'data:,' }]) {
    const { api, calls } = environment(settings);
    await assert.rejects(api.prepare({ type: 'image/png', size: 100 }), error => error.code === 'photo.unreadable');
    assert.deepEqual(calls.revoked, ['blob:synthetic']);
  }
});
test('compression reduces quality and dimensions to fit the local attachment budget', async () => {
  const large = 'data:image/jpeg;base64,' + 'AAAA'.repeat(160000);
  const { api, calls } = environment({ output: attempt => attempt < 5 ? large : jpeg });
  assert.equal(await api.prepare({ type: 'image/jpeg', size: 1000 }), jpeg);
  assert(calls.exports[1].quality < calls.exports[0].quality);
  assert(calls.exports.at(-1).width < calls.exports[0].width);
  assert.deepEqual(calls.revoked, ['blob:synthetic']);
});
test('an attachment that cannot fit is rejected without leaking the temporary object URL', async () => {
  const { api, calls } = environment({ output: () => 'data:image/jpeg;base64,' + 'AAAA'.repeat(160000) });
  await assert.rejects(api.prepare({ type: 'image/jpeg', size: 1000 }), error => error.code === 'photo.tooLarge');
  assert.equal(calls.exports.length, 9);
  assert.deepEqual(calls.revoked, ['blob:synthetic']);
});
