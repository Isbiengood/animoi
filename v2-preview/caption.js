/* Offline publication helpers. Defaults are proposed once; the author owns the final text. */
(function (root) {
  'use strict';
  const languages = ['fr', 'en', 'es', 'de', 'it'];
  const i18n = root.AniMoiI18n || (typeof module !== 'undefined' ? require('./i18n.js') : null);
  const photos = root.AniMoiPostPhoto || (typeof module !== 'undefined' ? require('./post-photo.js') : null);
  // Classic browser scripts load the existing catalogues before this helper.
  // CommonJS consumers use those same files, without a second translation table.
  if (typeof module !== 'undefined') for (const code of languages) require('./locales/' + code + '.js');
  const languageTag = value => typeof value === 'string' && /^(?:und|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(value);
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en');
  const species = Object.freeze({chien:'dog',chiens:'dog',chat:'cat',chats:'cat',oiseau:'bird',oiseaux:'bird',lapin:'rabbit',lapins:'rabbit',cheval:'horse',chevaux:'horse',poisson:'fish',poissons:'fish',hamster:'hamster',hamsters:'hamster',autre:'other'});
  const tagPattern = () => /#[\p{L}\p{M}\p{N}_]+/gu;
  const realTagPattern = () => /(^|[^\p{L}\p{M}\p{N}_/:#])(#[\p{L}\p{M}\p{N}_]+)/gu;
  function proposedTags(value, locale = i18n.locale) {
    return {brand:'#Animoi', life:'#' + i18n.tFor(locale, 'hashtags.life'), species:'#' + i18n.tFor(locale, 'hashtags.species.' + (species[normalize(value).trim()] || 'other'))};
  }
  function defaultHashtags(value, locale = i18n.locale) {
    return Object.values(proposedTags(value, locale)).join(' ');
  }
  function dedupeHashtags(value) {
    const seen = new Set();
    // A fragment inside a URL or word is not a hashtag. Do not alter links or
    // story prose; preserve paragraph breaks, accents and the first spelling.
    return String(value ?? '').replace(realTagPattern(), (whole, prefix, tag) => {
      const key = normalize(tag);
      if (seen.has(key)) return /^[\t ]*$/.test(prefix) ? '' : prefix;
      seen.add(key); return whole;
    }).replace(/[\t ]+$/gm, '').trim();
  }
  function withDefaultHashtags(value, animalSpecies, locale = i18n.locale) {
    const raw = String(value ?? '').trim();
    const defaults = defaultHashtags(animalSpecies, locale);
    const required = new Set((defaults.match(tagPattern()) || []).map(normalize));
    const terminal = raw.match(/(?:^|\n)[\t ]*(?:#[\p{L}\p{M}\p{N}_]+\s*)+$/u);
    let body = raw, extras = [], terminalTags = [];
    if (terminal) {
      body = raw.slice(0, terminal.index).trimEnd();
      terminalTags = terminal[0].match(tagPattern()) || [];
      extras = terminalTags.filter(tag => !required.has(normalize(tag)));
    }
    // New generated drafts only: consolidate matching default tokens at the
    // foot instead of letting global deduplication silently remove that foot.
    // Keep the first authored spelling and every word/custom brand. The
    // source anecdote separately determines ownership, never the new position.
    const authored = new Map();
    body = body.replace(realTagPattern(), (whole, prefix, tag) => {
      const key = normalize(tag);
      if (!required.has(key)) return whole;
      if (!authored.has(key)) authored.set(key, tag);
      return prefix + tag.slice(1);
    }).trim();
    // Keep a previously consolidated personal species/life spelling across
    // repeated formatting. The canonical brand is always proposed as #Animoi.
    for (const tag of terminalTags) {
      const key = normalize(tag);
      if (required.has(key) && key !== normalize('#Animoi') && !authored.has(key)) authored.set(key, tag);
    }
    const footer = defaults.split(' ').map(tag => authored.get(normalize(tag)) || tag);
    return dedupeHashtags((body ? body + '\n\n' : '') + [...footer, ...extras].join(' '));
  }
  function restoreSuggestedHashtags(value, animalSpecies, locale = i18n.locale) {
    // Explicit, append-only recovery for an authored draft. In particular this
    // is NEVER called by reading, editing, classifying or restoring a post.
    const raw = String(value ?? '');
    const present = new Set([...raw.matchAll(realTagPattern())].map(match => normalize(match[2])));
    const missing = defaultHashtags(animalSpecies, locale).split(' ').filter(tag => !present.has(normalize(tag)));
    if (!missing.length) return raw;
    const separator = raw ? (endingTags(raw).length && !/\s$/.test(raw) ? ' ' : '\n\n') : '';
    return raw + separator + missing.join(' ');
  }

  function endingTags(text) {
    const ending = text.match(/(?:^|\n)[\t ]*(?:#[\p{L}\p{M}\p{N}_]+\s*)+$/u);
    if (!ending) return [];
    return [...ending[0].matchAll(tagPattern())].map(match => ({value:match[0], index:ending.index + match.index}));
  }
  // Ephemeral ownership of generated defaults, never stored in a profile/post.
  // Removed, renamed or moved tags become the author's choice and stay that way.
  function createHashtagDraft(text, animalSpecies, locale = i18n.locale, sourceStory = '') {
    const proposed = proposedTags(animalSpecies, locale), ending = endingTags(String(text));
    const authored = new Set([...String(sourceStory).matchAll(realTagPattern())].map(match => normalize(match[2])));
    const owned = Object.fromEntries(['life','species'].filter(role => !authored.has(normalize(proposed[role])) && ending.some(tag => tag.value === proposed[role])).map(role => [role, proposed[role]]));
    return {animalSpecies, owned};
  }
  function observeHashtagDraft(text, draft) {
    const ending = endingTags(String(text));
    return {...draft, owned:Object.fromEntries(Object.entries(draft.owned).filter(([, value]) => ending.some(tag => tag.value === value)))};
  }
  function updateHashtagDraft(text, draft, locale = i18n.locale) {
    const current = observeHashtagDraft(text, draft), proposed = proposedTags(draft.animalSpecies, locale);
    const ending = endingTags(text), edits = [], owned = {...current.owned};
    // Match real hashtags only; URL fragments and word fragments are not tags.
    const all = [...text.matchAll(/(^|[^\p{L}\p{M}\p{N}_/:#])(#[\p{L}\p{M}\p{N}_]+)/gu)].map(match => ({value:match[2], index:match.index + match[1].length}));
    for (const [role, value] of Object.entries(current.owned)) {
      if (value === proposed[role]) continue;
      const tag = ending.find(tag => tag.value === value);
      const collision = all.some(item => item.index !== tag.index && normalize(item.value) === normalize(proposed[role]));
      edits.push({index:tag.index, length:value.length, value:collision ? '' : proposed[role]});
      if (collision) delete owned[role]; else owned[role] = proposed[role];
    }
    let result = text;
    for (const edit of edits.sort((a,b) => b.index - a.index)) result = result.slice(0, edit.index) + edit.value + result.slice(edit.index + edit.length);
    if (edits.length) result = dedupeHashtags(result);
    return {text:result, draft:{...current, owned}};
  }

  // Deliberately bounded, conservative offline hints for the five supported
  // languages. No translation occurs; ambiguous/short stories use the UI locale.
  // Animal names/species alone are not evidence of a publication language.
  const hints = Object.fromEntries(Object.entries({
    fr: 'je tu nous vous mon mes son ses suis sommes avons avait etait voulais voulait voulais encore avec dans pour mais quand puis parce apres avant tres aujourd hui demain hier humain humains promenade pleuvait pleut friandises adore toujours matin maintenant cette ces une des est ai',
    en: 'the my our your his her their this that these those am are was were have has had wanted would could should with from into for but when then because after before very today tomorrow yesterday human humans walk walking raining rains treats loves always morning now again is it',
    es: 'yo nosotros vosotros mi mis nuestros vuestro sus soy somos estoy estaba estaban queria queriamos con para pero cuando porque despues antes muy hoy manana ayer humano humanos paseo lloviendo llovia llueve golosinas siempre ahora esta estas una unos las los del el',
    de: 'ich wir ihr mein meine meinen unser unsere euer eure sein seine bin bist sind war waren wollte wollten mit zum zur aber wenn dann weil nach bevor sehr heute morgen gestern mensch menschen spazieren gehen geregnet regnet leckerli immer jetzt wieder diese dieser das der die und hat habe',
    it: 'io noi voi mio mia miei nostre vostro suoi sono siamo ero era voleva volevamo con per pero quando poi perche dopo prima molto oggi domani ieri umano umani passeggiata pioveva piove bocconcini sempre mattina adesso ancora questa queste una degli della delle del il lo gli'
  }).map(([code, words]) => [code, new Set(words.split(' ').map(normalize))]));
  function detectLanguage(value, fallback = 'fr') {
    // Existing posts may carry compatible languages outside the current UI
    // catalogues (or "und"). An uncertain edit must preserve that metadata.
    const otherwise = languageTag(fallback) ? fallback : 'fr';
    const words = normalize(value).match(/[\p{L}]+/gu) || [];
    if (words.length < 6) return otherwise;
    const distinct = new Set(words);
    const scores = languages.map(code => {
      const matched = [...distinct].filter(word => hints[code].has(word));
      const diagnostic = matched.filter(word => languages.every(other => other === code || !hints[other].has(word)));
      return {code, score:matched.length, diagnostic:diagnostic.length};
    }).sort((a,b) => b.score - a.score);
    return scores[0].score >= 3 && scores[0].diagnostic >= 2 && scores[0].score - scores[1].score >= 2 ? scores[0].code : otherwise;
  }

  const messages = {
    'sharing.shared':'Menu de partage ouvert.',
    'sharing.copied':'Texte et hashtags copiés.',
    'sharing.manual':'Sélectionnez puis copiez le texte et ses hashtags.',
    'sharing.empty':'Ajoutez un texte avant de partager.'
  };
  function feedback(options, key, append = false) {
    const translated = root.AniMoiI18n?.t(key);
    const text = translated && translated !== key ? translated : messages[key];
    if (typeof options.feedback === 'function') options.feedback(text, key);
    else if (options.feedback) {
      options.feedback.removeAttribute?.('data-i18n');
      options.feedback.setAttribute?.('aria-live', 'polite');
      if (append && typeof options.feedback.append === 'function') options.feedback.append(' ' + text);
      else options.feedback.textContent = append ? [options.feedback.textContent, text].filter(Boolean).join(' ') : text;
    }
  }
  async function copyText(value, options = {}) {
    const text = dedupeHashtags(root.AniMoiStoryFormatter?.publicationText(value) ?? value);
    if (!text) { feedback(options, 'sharing.empty'); return 'empty'; }
    const nav = options.navigator || root.navigator;
    try {
      if (typeof nav?.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await nav.clipboard.writeText(text);
      feedback(options, 'sharing.copied'); return 'copied';
    } catch {
      let editor = options.editor;
      feedback(options, 'sharing.manual');
      const editorValue = typeof editor?.value === 'string' ? editor.value : editor?.textContent;
      if (typeof editorValue === 'string' && editorValue !== text) {
        // An owner may edit the complete historical source. Never select that
        // raw source when the share/copy presentation deliberately hides its
        // old automatic profile list. This field is ephemeral, never stored.
        const target = typeof options.feedback?.append === 'function' ? options.feedback : editor?.parentElement;
        const doc = root.document;
        editor = null;
        if (target && doc?.createElement) {
          editor = doc.createElement('textarea'); editor.className = 'sharing-manual-copy';
          editor.value = text; editor.readOnly = true; editor.rows = 6; editor.spellcheck = false;
          editor.setAttribute('aria-label', root.AniMoiI18n?.t('preview.copy') || 'Copier');
          target.append(editor);
        }
      }
      if (editor) {
        editor.focus?.();
        if (typeof editor.select === 'function') editor.select();
        else if (root.document?.createRange && root.getSelection) {
          const range = root.document.createRange(); range.selectNodeContents(editor);
          const selection = root.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        }
      }
      return 'manual';
    }
  }
  async function shareText(value, options = {}) {
    const text = dedupeHashtags(root.AniMoiStoryFormatter?.publicationText(value) ?? value);
    if (!text) { feedback(options, 'sharing.empty'); return 'empty'; }
    const nav = options.navigator || root.navigator;
    const file = photos?.fileForShare(options.photo);
    let attach = false;
    try { attach = !!file && typeof nav?.canShare === 'function' && nav.canShare({files:[file]}); } catch { /* Text sharing remains available. */ }
    if (typeof nav?.share === 'function') {
      try {
        // Keep this call before the first await so iPhone retains user activation.
        // Never attach the private preview URL. A selected photo is optional.
        await nav.share({title:'Ani’Moi', text, ...(attach ? {files:[file]} : {})});
        feedback(options, 'sharing.shared');
        if (options.photo && !attach) feedback(options, 'postPhoto.textOnly', true);
        return 'shared';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
      }
    }
    const result = await copyText(text, options);
    if (options.photo) feedback(options, attach ? 'postPhoto.shareFallback' : 'postPhoto.textOnly', true);
    return result;
  }
  const api = Object.freeze({defaultHashtags, withDefaultHashtags, restoreSuggestedHashtags, createHashtagDraft, observeHashtagDraft, updateHashtagDraft, dedupeHashtags, detectLanguage, shareText, copyText});
  root.AniMoiPublications = api;
  // Retain the historical community taxonomy for compatible integrations.
  root.AniMoiCategories = Object.freeze(['Tous','Chien','Chat','Poisson','Oiseau','Hamster','Lapin','Cheval','Reptile','Animaux']);
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
