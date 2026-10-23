/* Reader-only translation boundary. No engine, endpoint or network client is configured.
 * A future provider must preserve opaque hashtag markers and return {text, language}.
 * The original post and browser storage are never modified by this module.
 */
(function (root) {
  'use strict';
  const i18n = root.AniMoiI18n || (typeof module !== 'undefined' ? require('./i18n.js') : null);
  const supported = ['fr', 'en', 'es', 'de', 'it'];
  let provider = null, providerEpoch = 0;
  const cache = new Map(), pending = new Map();
  const baseLanguage = code => typeof code === 'string' ? code.toLowerCase().split('-')[0] : '';
  const languageTag = value => typeof value === 'string' && /^(?:und|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(value);
  const normalizedText = value => value.replace(/\s+/gu, ' ').trim();
  function configureProvider(value) {
    if (value != null && (typeof value !== 'object' || typeof value.translate !== 'function')) throw new TypeError('A translation provider must implement translate(request).');
    provider = value || null; providerEpoch++;
    cache.clear(); pending.clear();
  }
  function maskHashtags(text) {
    let prefix = '⟦AMT_';
    while (text.includes(prefix)) prefix += '_';
    const tokens = [];
    const masked = text.replace(/(^|[^\p{L}\p{M}\p{N}_/:#])(#[\p{L}\p{M}\p{N}_]+)/gu, (_, before, tag) => {
      const marker = prefix + tokens.length + '⟧';
      tokens.push({marker, tag}); return before + marker;
    });
    return {masked, restore(value) {
      let result = value, previousIndex = -1;
      for (const {marker, tag} of tokens) {
        const index = result.indexOf(marker);
        if (index < 0 || index <= previousIndex || result.indexOf(marker, index + marker.length) >= 0) throw new Error('Translation lost a protected hashtag.');
        previousIndex = index;
      }
      for (const {marker, tag} of tokens) result = result.replace(marker, tag);
      if (result.includes(prefix)) throw new Error('Translation contains an unknown hashtag marker.');
      return result;
    }};
  }
  function revision(text, language) {
    // Local opaque change marker, not an authentication/security hash. Cache
    // identity and stale-response checks also include the entire exact source.
    const value = JSON.stringify([text, language]);
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return 'local-' + (hash >>> 0).toString(16) + '-' + value.length;
  }
  function translated(post, source, sourceLanguage, target, engine, epoch) {
    const key = JSON.stringify([epoch, post.id, source, sourceLanguage, target]);
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    if (pending.has(key)) return pending.get(key);
    const protectedText = maskHashtags(source);
    const task = Promise.resolve().then(() => engine.translate({
      text: protectedText.masked, sourceLanguage, targetLanguage: target,
      postId: post.id, sourceRevision: revision(source, sourceLanguage)
    })).then(value => {
      if (!value || typeof value.text !== 'string' || !value.text.trim() ||
          !languageTag(value.language) || baseLanguage(value.language) !== target) throw new Error('Invalid translation result.');
      const text = protectedText.restore(value.text);
      const result = normalizedText(text) === normalizedText(source) ? {unchanged: true} : {text};
      if (providerEpoch === epoch && !result.unchanged) {
        if (cache.size >= 64) cache.delete(cache.keys().next().value);
        cache.set(key, result);
      }
      return result;
    });
    pending.set(key, task);
    task.then(() => { if (pending.get(key) === task) pending.delete(key); }, () => { if (pending.get(key) === task) pending.delete(key); });
    return task;
  }
  const fallback = {
    'translation.show':'Voir la traduction', 'translation.original':'Voir l’original',
    'translation.unavailable':'La traduction n’est pas encore disponible. Le texte original est conservé.',
    'translation.loading':'Traduction en cours…',
    'translation.failed':'Traduction indisponible pour le moment. Le texte original reste affiché.',
    'translation.unchanged':'Aucune traduction différente n’est disponible. Le texte original reste affiché.',
    'translation.originalVisible':'Texte original affiché.', 'translation.translated':'Traduction en {language}.'
  };
  function message(key, vars = {}) {
    const text = i18n?.t(key, vars);
    return text && text !== key ? text : (fallback[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] || ''));
  }
  function attach(post, textNode, container, options = {}) {
    if (!post || typeof post.text !== 'string' || !textNode || !container) throw new TypeError('A post, text node and controls container are required.');
    const doc = container.ownerDocument || root.document;
    const source = post.text, sourceLanguage = languageTag(post.originalLanguage) ? post.originalLanguage : 'und';
    let job = 0, destroyed = false, hasTranslation = false;
    const controls = doc.createElement('div'); controls.className = 'translation-controls';
    const show = doc.createElement('button'); show.type = 'button'; show.className = 'secondary show-translation';
    const original = doc.createElement('button'); original.type = 'button'; original.className = 'secondary show-original';
    const status = doc.createElement('p'); status.className = 'v2-muted translation-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    controls.append(show, original, status); container.append(controls);
    const locale = () => {
      const value = typeof options.locale === 'function' ? options.locale() : options.locale || i18n?.locale;
      const base = baseLanguage(value); return supported.includes(base) ? base : 'fr';
    };
    const relevant = () => sourceLanguage === 'und' || baseLanguage(sourceLanguage) !== locale();
    function setStatus(key, variables) { status.textContent = key ? message(key, variables) : ''; }
    function labels() { show.textContent = message('translation.show'); original.textContent = message('translation.original'); }
    function restore() {
      textNode.textContent = source; textNode.lang = sourceLanguage;
      show.disabled = false; original.hidden = !hasTranslation; original.disabled = true;
    }
    function showOriginal() {
      if (destroyed) return;
      job++; restore(); labels(); setStatus('translation.originalVisible');
    }
    function current(sequence, target, epoch) {
      return !destroyed && job === sequence && providerEpoch === epoch && locale() === target &&
        container.isConnected !== false && post.text === source && (post.originalLanguage || 'und') === sourceLanguage;
    }
    async function showTranslation() {
      if (destroyed || !relevant()) return 'original';
      const sequence = ++job, target = locale(), epoch = providerEpoch, engine = provider;
      restore(); labels();
      if (!engine) { setStatus('translation.unavailable'); return 'unavailable'; }
      show.disabled = true; original.hidden = !hasTranslation; original.disabled = false;
      setStatus('translation.loading');
      try {
        const result = await translated(post, source, sourceLanguage, target, engine, epoch);
        if (!current(sequence, target, epoch)) return 'stale';
        if (result.unchanged) { restore(); setStatus('translation.unchanged'); return 'unchanged'; }
        textNode.textContent = result.text; textNode.lang = target;
        hasTranslation = true; original.hidden = false; original.disabled = false; show.disabled = true;
        let name = target;
        try { name = new Intl.DisplayNames([i18n?.locale || 'fr'], {type: 'language'}).of(target); } catch {}
        setStatus('translation.translated', {language: name}); return 'translated';
      } catch {
        if (!current(sequence, target, epoch)) return 'stale';
        restore(); setStatus('translation.failed'); return 'failed';
      }
    }
    function optedIn() {
      if (typeof options.autoTranslate === 'boolean') return options.autoTranslate;
      try { return root.AniMoiData?.read().settings.autoTranslate === true; } catch { return false; }
    }
    function refresh() {
      if (destroyed) return;
      job++; hasTranslation = false; restore(); labels(); controls.hidden = !relevant(); setStatus('');
      if (relevant() && optedIn()) void showTranslation();
    }
    show.onclick = showTranslation; original.onclick = showOriginal;
    const controller = {showTranslation, showOriginal, refresh, destroy() {
      if (destroyed) return;
      job++; restore(); controls.remove(); destroyed = true;
    }};
    refresh();
    return controller;
  }
  const api = Object.freeze({attach, configureProvider, get available() { return provider !== null; }});
  root.AniMoiTranslation = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
