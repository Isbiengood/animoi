/* One publication renderer for animal histories, local network views and Gazette drafts. */
(function (root) {
  'use strict';
  let sequence = 0;
  const speciesKeys = {Chien:'dog', Chat:'cat', Oiseau:'bird', Lapin:'rabbit', Cheval:'horse', Poisson:'fish', Hamster:'hamster', Autre:'other'};
  function create({post, pet = {}, context = 'history', actions = {}} = {}) {
    if (!post || typeof post.text !== 'string') throw new TypeError('A publication with original text is required.');
    const doc = root.document, i18n = root.AniMoiI18n, rubrics = root.AniMoiRubrics;
    if (!doc || !i18n || !rubrics) throw new Error('Publication interface modules are unavailable.');
    const el = (tag, text, className) => {
      const node = doc.createElement(tag);
      if (text != null) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const ui = (tag, key, className) => i18n.bind(el(tag, null, className), key);
    const historical = rubrics.isHistorical(post), rubric = historical ? null : rubrics.get(post.rubric);
    const element = el('article', null, 'publication-card ' + (context === 'history' ? 'v2-post' : 'community-entry'));
    element.dataset.postId = post.id;
    element.dataset.rubric = rubric?.id || 'historical';
    element.dataset.style = rubric?.style || 'historical';

    const top = el('div', null, 'publication-topline');
    const badge = el('span', rubrics.label(post.rubric, i18n.locale), 'publication-rubric');
    const date = el('time', null, 'publication-date');
    if (Number.isFinite(post.date)) {
      date.dateTime = new Date(post.date).toISOString(); date.textContent = i18n.date(post.date);
    }
    top.append(badge, date); element.append(top);

    const author = el('div', null, 'publication-author community-author');
    if (pet.photo) {
      const avatar = el('img', null, 'publication-avatar'); avatar.src = pet.photo; avatar.alt = pet.name || '';
      author.append(avatar);
    } else {
      const avatar = el('span', '🐾', 'publication-avatar publication-avatar-fallback community-avatar'); avatar.setAttribute('aria-hidden', 'true'); author.append(avatar);
    }
    const byline = el('div', null, 'publication-byline');
    byline.append(el('strong', pet.name || '🐾', 'publication-animal'));
    let breed = pet.breed || '';
    if (root.AniMoiCharacteristics && pet.characteristics) breed = root.AniMoiCharacteristics.display(pet, i18n.locale).breed || '';
    const species = speciesKeys[pet.species] ? i18n.t('species.' + speciesKeys[pet.species]) : pet.species || '';
    byline.append(el('div', [species, breed].filter(Boolean).join(' · '), 'publication-animal-meta'));
    author.append(byline); element.append(author);

    function field(labelKey, value, className = '') {
      if (typeof value !== 'string' || !value.trim()) return;
      const box = el('div', null, 'publication-field ' + className);
      box.append(ui('div', labelKey, 'publication-field-label'), el('div', value, 'publication-field-value')); element.append(box);
    }
    const details = post.rubricData || {};
    if (rubric?.id === 'sav') {
      const ticket = el('div', null, 'publication-ticket');
      ticket.append(el('strong', i18n.t('rubrics.ticket', {reference:rubrics.ticket(post)})), ui('small', 'rubrics.fictional'));
      element.append(ticket);
      field('rubrics.subject', details.sav?.subject);
      if (details.sav?.status) element.append(ui('div', 'rubrics.savStatus.' + details.sav.status, 'publication-stamp'));
    } else if (rubric?.id === 'linkedin') {
      element.append(ui('div', 'rubrics.professional', 'publication-professional'));
      if (details.linkedin?.kind) element.append(ui('div', 'rubrics.jobKind.' + details.linkedin.kind, 'publication-kind'));
      field('rubrics.role', details.linkedin?.role);
    } else if (rubric?.id === 'potins') {
      const masthead = el('div', null, 'publication-masthead');
      masthead.append(ui('strong', 'rubrics.gazetteTitle'), ui('div', 'rubrics.proposal', 'publication-edition'));
      element.append(masthead);
      if (post.editorial?.status) element.append(ui('div', ['approved','published'].includes(post.editorial.status) ? 'rubrics.editorialUnverified' : 'rubrics.editorialStatus.' + post.editorial.status, 'publication-editorial-status'));
    }

    if (typeof post.title === 'string' && post.title.trim()) {
      const title = el('h3', post.title, 'publication-title'); title.id = 'publication-title-' + (++sequence);
      element.setAttribute('aria-labelledby', title.id); element.append(title);
    }
    // Keep this as the first direct paragraph. Reading never rewrites storage;
    // only the recognised legacy automatic profile list is hidden from view.
    const visibleText = root.AniMoiStoryFormatter?.publicationText(post.text) ?? post.text;
    const text = el('p', visibleText, 'publication-text'); text.lang = post.originalLanguage || 'und'; element.append(text);
    if (root.AniMoiPostPhoto?.isRenderable(post.photo)) {
      const image = el('img', null, 'post-photo publication-photo'); image.src = post.photo; image.loading = 'lazy';
      i18n.bind(image, 'postPhoto.preview', 'alt'); element.append(image);
    }
    if (rubric?.id === 'sav') field('rubrics.reply', details.sav?.reply, 'publication-human-reply');
    if (rubric?.id === 'potins') element.append(ui('div', 'rubrics.localEditorial', 'publication-editorial-note'));

    const feedback = el('p', null, 'v2-muted post-feedback'); feedback.setAttribute('aria-live', 'polite');
    const view = {element, text, feedback, translation:null, destroy() { view.translation?.destroy(); }};
    const buttons = el('div', null, 'buttons post-actions publication-actions');
    for (const [name, key, className] of [['classify',rubrics.isUnclassified(post) ? 'classify.action' : 'classify.change','secondary post-classify'], ['edit','post.edit','secondary post-edit'], ['share','preview.share','post-share'], ['remove','post.delete','secondary danger post-delete']]) {
      if (typeof actions[name] !== 'function') continue;
      const button = ui('button', key, className); button.type = 'button';
      button.onclick = () => actions[name](view); buttons.append(button);
    }
    if (buttons.childElementCount) element.append(buttons);
    element.append(feedback);
    if (root.AniMoiTranslation?.attach) {
      let autoTranslate = false;
      try { autoTranslate = root.AniMoiData?.read().settings.autoTranslate === true; } catch { /* View creation never repairs or overwrites unreadable storage. */ }
      // The translation view must use the same presentation when it restores
      // the original; the stored publication and action snapshots stay intact.
      const reading = visibleText === post.text ? post : {...post, text:visibleText};
      view.translation = root.AniMoiTranslation.attach(reading, text, element, {locale:() => i18n.locale, autoTranslate});
    }
    return view;
  }
  const api = Object.freeze({create}); root.AniMoiPublicationCard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
