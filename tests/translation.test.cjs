const {test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../v2-preview/i18n.js');
for (const locale of ['fr', 'en', 'es', 'de', 'it']) require('../v2-preview/locales/' + locale + '.js');
const translation = require('../v2-preview/translation.js');

// Minimal DOM fixture for state/async tests; browser rendering is checked by
// Chromium separately. Translation providers below are explicit test fixtures.
class Element {
  constructor(tag, document) {this.tagName = tag; this.ownerDocument = document; this.children = []; this.parentNode = null; this.attributes = {}; this.hidden = false; this.disabled = false; this._text = '';}
  get isConnected() {return this.tagName === 'root' || !!this.parentNode?.isConnected;}
  get textContent() {return this._text + this.children.map(child => child.textContent).join('');}
  set textContent(value) {this._text = String(value); this.children = [];}
  append(...children) {for (const child of children) {child.parentNode = this; this.children.push(child);}}
  setAttribute(name, value) {this.attributes[name] = String(value);}
  remove() {if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null;}
  click() {if (!this.disabled && !this.hidden) return this.onclick?.();}
}
const settingsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'AniMoiData');
beforeEach(() => {i18n.setLocale('fr'); translation.configureProvider(null);});
afterEach(() => {
  i18n.setLocale('fr'); translation.configureProvider(null);
  if (settingsDescriptor) Object.defineProperty(globalThis, 'AniMoiData', settingsDescriptor);
  else delete globalThis.AniMoiData;
});
function fixture(post = {id: 'post-fixture', text: 'My original story.\n\n#Animoi #Dog #MyBrand', originalLanguage: 'en'}, options = {}) {
  const doc = {createElement: tag => new Element(tag, doc)};
  const root = doc.createElement('root'), text = doc.createElement('p'), holder = doc.createElement('div');
  root.append(text, holder); text.textContent = post.text;
  const controller = translation.attach(post, text, holder, options);
  const controls = holder.children[0];
  return {post, text, holder, root, controls, show: controls.children[0], original: controls.children[1], status: controls.children[2], controller};
}
function deferred() {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}
const settle = () => new Promise(resolve => setImmediate(resolve));
const realFixture = request => ({text: 'Texte de test traduit — ' + request.text, language: request.targetLanguage});

test('no provider shows an honest unavailable message and leaves the source and post untouched', async () => {
  const post = {id: 'missing-engine', text: 'Keep this source. #PersonalBrand', originalLanguage: 'en', futureMetadata: {keep: true}};
  const before = structuredClone(post), view = fixture(post);
  assert.equal(view.controls.hidden, false); assert.equal(view.original.hidden, true);
  assert.equal(await view.show.click(), 'unavailable');
  assert.equal(view.text.textContent, post.text);
  assert.equal(view.status.textContent, i18n.t('translation.unavailable'));
  assert.equal(view.status.attributes['aria-live'], 'polite');
  assert.equal(view.status.attributes.role, 'status');
  assert.equal(view.original.hidden, true); assert.deepEqual(post, before);
});

test('automatic preference without an engine does not make a request or rewrite local storage', async () => {
  let reads = 0;
  globalThis.AniMoiData = {read: () => {reads++; return {settings: {autoTranslate: true}};}, write: () => assert.fail('Translation never writes storage')};
  const view = fixture(); await settle();
  assert(reads > 0); assert.equal(view.text.textContent, view.post.text);
  assert.equal(view.status.textContent, i18n.t('translation.unavailable'));
});

test('same-language posts hide translation commands and regional language tags match their base', async () => {
  let requests = 0;
  translation.configureProvider({translate: async request => {requests++; return realFixture(request);}});
  for (const language of ['fr', 'fr-FR']) {
    const view = fixture({id: language, text: 'Un texte en français.', originalLanguage: language}, {autoTranslate: true});
    assert.equal(view.controls.hidden, true);
    assert.equal(await view.controller.showTranslation(), 'original');
    assert.equal(view.text.textContent, view.post.text);
  }
  assert.equal(requests, 0);
});

test('unknown original language remains eligible without inventing language metadata', async () => {
  const post = {id: 'legacy', text: 'Source with unknown language.'}, view = fixture(post);
  assert.equal(view.controls.hidden, false);
  assert.equal(await view.controller.showTranslation(), 'unavailable');
  assert.equal(post.originalLanguage, undefined); assert.equal(view.text.lang, 'und');
});

test('an explicit fixture provider can display a translation and return to the exact original', async () => {
  let calls = 0;
  translation.configureProvider({id: 'fixture-only', translate: async request => {calls++; return realFixture(request);}});
  const post = {id: 'toggle', text: 'My own story.\n\n#Animoi #MyBrand', originalLanguage: 'en', futureMetadata: {keep: true}};
  const before = structuredClone(post), view = fixture(post);
  assert.equal(await view.controller.showTranslation(), 'translated');
  assert.equal(view.text.textContent, 'Texte de test traduit — ' + post.text);
  assert.equal(view.text.lang, 'fr'); assert.equal(view.original.hidden, false); assert.equal(view.original.disabled, false);
  assert.equal(view.show.disabled, true); assert(view.status.textContent.startsWith('Traduction en'));
  view.original.click();
  assert.equal(view.text.textContent, post.text); assert.equal(view.text.lang, 'en');
  assert.equal(view.show.disabled, false); assert.equal(view.original.disabled, true);
  assert.equal(view.status.textContent, i18n.t('translation.originalVisible'));
  assert.equal(await view.show.click(), 'translated'); assert.equal(calls, 1);
  assert.deepEqual(post, before);
});

test('hashtag literals and brands never enter the provider request and are reinserted without changes', async () => {
  let request;
  translation.configureProvider({translate: async input => {request = input; return realFixture(input);}});
  const post = {id: 'protected', text: 'A #DOG can tell stories.\n\n#Animoi #VieDAnimal #MyBrand #été #猫 #DOG', originalLanguage: 'en'};
  const view = fixture(post); assert.equal(await view.controller.showTranslation(), 'translated');
  for (const tag of ['#DOG', '#Animoi', '#VieDAnimal', '#MyBrand', '#été', '#猫']) assert(!request.text.includes(tag));
  assert.equal(request.postId, post.id); assert.equal(request.sourceLanguage, 'en'); assert.equal(request.targetLanguage, 'fr');
  assert.match(request.sourceRevision, /^local-/);
  assert(!request.sourceRevision.includes('#MyBrand'));
  assert.equal(view.text.textContent, 'Texte de test traduit — ' + post.text);
});

test('hashtag marker collisions in an anecdote do not corrupt original text', async () => {
  translation.configureProvider({translate: async request => realFixture(request)});
  const post = {id: 'marker', text: 'Literal ⟦AMT_0⟧ stays in my story. #MyBrand', originalLanguage: 'en'};
  const view = fixture(post); assert.equal(await view.controller.showTranslation(), 'translated');
  assert.equal(view.text.textContent, 'Texte de test traduit — ' + post.text);
});

test('a provider losing protected tags fails visibly and retains the complete original', async () => {
  translation.configureProvider({translate: async request => ({text: 'Traduction de test sans marqueurs.', language: request.targetLanguage})});
  const view = fixture(); assert.equal(await view.controller.showTranslation(), 'failed');
  assert.equal(view.text.textContent, view.post.text);
  assert.equal(view.status.textContent, i18n.t('translation.failed'));
  assert.equal(view.original.hidden, true);
});

test('provider errors never replace the original or claim that translation succeeded', async () => {
  translation.configureProvider({translate: async () => {throw new Error('Fixture engine failed');}});
  const view = fixture(); assert.equal(await view.controller.showTranslation(), 'failed');
  assert.equal(view.text.textContent, view.post.text);
  assert.equal(view.status.textContent, i18n.t('translation.failed'));
  assert.equal(view.show.disabled, false);
});

test('identical results including whitespace-only changes are not announced as translations', async () => {
  for (const suffix of ['', '   \n']) {
    translation.configureProvider({translate: async request => ({text: request.text + suffix, language: request.targetLanguage})});
    const view = fixture(); assert.equal(await view.controller.showTranslation(), 'unchanged');
    assert.equal(view.text.textContent, view.post.text); assert.equal(view.original.hidden, true);
    assert.equal(view.status.textContent, i18n.t('translation.unchanged'));
  }
});

test('invalid, empty or incorrectly labelled provider results retain the source', async () => {
  for (const response of [null, {}, {text: '', language: 'fr'}, {text: 'Different fixture.', language: 'de'}, {text: 'Different fixture.', language: '<script>'}]) {
    translation.configureProvider({translate: async () => response});
    const view = fixture(); assert.equal(await view.controller.showTranslation(), 'failed');
    assert.equal(view.text.textContent, view.post.text); assert.equal(view.original.hidden, true);
  }
});

test('a flag change invalidates an in-flight result instead of showing a translation for the old target', async () => {
  const waiting = deferred(); let request;
  translation.configureProvider({translate: input => {request = input; return waiting.promise;}});
  const view = fixture(), task = view.controller.showTranslation(); await settle();
  i18n.setLocale('de'); view.controller.refresh();
  waiting.resolve(realFixture(request)); assert.equal(await task, 'stale');
  assert.equal(view.text.textContent, view.post.text); assert.equal(view.original.hidden, true);
});

test('returning to the original or destroying/detaching the view invalidates pending output', async () => {
  for (const action of ['original', 'destroy', 'detach']) {
    const waiting = deferred(); let request;
    translation.configureProvider({translate: input => {request = input; return waiting.promise;}});
    const view = fixture(), task = view.controller.showTranslation(); await settle();
    if (action === 'original') view.controller.showOriginal();
    if (action === 'destroy') view.controller.destroy();
    if (action === 'detach') view.holder.remove();
    waiting.resolve(realFixture(request)); assert.equal(await task, 'stale');
    assert.equal(view.text.textContent, view.post.text);
  }
});

test('changing the configured provider invalidates its in-flight output and cached results', async () => {
  const waiting = deferred(); let request;
  translation.configureProvider({id: 'fixture-before', translate: input => {request = input; return waiting.promise;}});
  const view = fixture(), task = view.controller.showTranslation(); await settle();
  translation.configureProvider(null); waiting.resolve(realFixture(request));
  assert.equal(await task, 'stale'); assert.equal(view.text.textContent, view.post.text);
  assert.equal(await view.controller.showTranslation(), 'unavailable');
});

test('exact-source memory cache is separated by post, original language, target language and provider', async () => {
  let calls = 0;
  const provider = {id: 'fixture-cache', translate: async request => {calls++; return realFixture(request);}};
  translation.configureProvider(provider);
  const source = {id: 'cache-a', text: 'My source #Custom', originalLanguage: 'en'};
  assert.equal(await fixture({...source}).controller.showTranslation(), 'translated');
  assert.equal(await fixture({...source}).controller.showTranslation(), 'translated'); assert.equal(calls, 1);
  await fixture({...source, text: 'Changed source #Custom'}).controller.showTranslation(); assert.equal(calls, 2);
  await fixture({...source, originalLanguage: 'it'}).controller.showTranslation(); assert.equal(calls, 3);
  await fixture({...source, id: 'cache-b'}).controller.showTranslation(); assert.equal(calls, 4);
  i18n.setLocale('de'); await fixture({...source}).controller.showTranslation(); assert.equal(calls, 5);
  translation.configureProvider({...provider, id: 'fixture-new'});
  await fixture({...source}).controller.showTranslation(); assert.equal(calls, 6);
});

test('simultaneous requests for the same source share one provider operation without storage', async () => {
  const waiting = deferred(); let calls = 0, request;
  translation.configureProvider({translate: input => {calls++; request = input; return waiting.promise;}});
  const one = fixture(), two = fixture(), first = one.controller.showTranslation(), second = two.controller.showTranslation();
  await settle(); assert.equal(calls, 1); waiting.resolve(realFixture(request));
  assert.equal(await first, 'translated'); assert.equal(await second, 'translated');
});

test('automatic translation only invokes a configured fixture when explicitly enabled', async () => {
  let calls = 0;
  translation.configureProvider({translate: async request => {calls++; return realFixture(request);}});
  const optOut = fixture(undefined, {autoTranslate: false}); await settle(); assert.equal(calls, 0);
  assert.equal(optOut.text.textContent, optOut.post.text);
  const optIn = fixture(undefined, {autoTranslate: true}); await settle(); assert.equal(calls, 1);
  assert.equal(optIn.text.textContent, 'Texte de test traduit — ' + optIn.post.text);
});

test('translated output is assigned as plain text and never turns provider content into HTML', async () => {
  translation.configureProvider({translate: async request => ({text: '<img src=x onerror=alert(1)> ' + request.text, language: request.targetLanguage})});
  const view = fixture(); assert.equal(await view.controller.showTranslation(), 'translated');
  assert(view.text.textContent.startsWith('<img')); assert.equal(view.text.children.length, 0);
  assert.equal(view.post.text, 'My original story.\n\n#Animoi #Dog #MyBrand');
});

test('provider configuration rejects malformed adapters instead of enabling a default network service', () => {
  for (const value of [true, 'https://example.test', {}, {translate: 'not a function'}]) assert.throws(() => translation.configureProvider(value), TypeError);
});

test('provider availability is observable without making requests or activating a default service', () => {
  assert.equal(translation.available, false);
  translation.configureProvider({translate: () => assert.fail('Checking availability never translates')});
  assert.equal(translation.available, true);
  translation.configureProvider(null);
  assert.equal(translation.available, false);
});
