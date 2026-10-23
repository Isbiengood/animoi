/* Optional publication metadata. Reading a historical story never classifies it. */
(function (root) {
  'use strict';
  const doc = root.document;
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  let host = null, controls = null, baseline = {}, originalDisplay = null, newPost = false, originalHumor = 'funny';

  function element(tag, id) {
    const node = doc.createElement(tag);
    if (id) node.id = id;
    return node;
  }
  function ui(tag, key, id) { return root.AniMoiI18n.bind(element(tag, id), key); }
  function option(select, value, key) {
    const node = ui('option', key); node.value = value; select.append(node); return node;
  }
  function labelled(parent, tag, id, key, limit) {
    const label = ui('label', key); label.htmlFor = id;
    const node = element(tag, id);
    if (tag === 'input') node.type = 'text';
    if (limit) node.maxLength = limit;
    parent.append(label, node); return node;
  }
  function display() {
    return Object.fromEntries(['rubric', 'title', 'subject', 'status', 'reply', 'kind', 'role'].map(key => [key, controls[key].value]));
  }
  function showFields() {
    if (!controls) return;
    const rubric = controls.rubric.value;
    controls.sav.hidden = rubric !== 'sav';
    controls.professional.hidden = rubric !== 'linkedin';
    controls.gazette.hidden = rubric !== 'potins';
  }
  function selectionChanged() {
    // Defaults describe a newly chosen format only. Going back to the original
    // category must not fill missing historical metadata as a side effect.
    const selected = controls.rubric.value;
    if (selected !== originalDisplay?.rubric || newPost) {
      if (selected === 'sav' && !controls.status.value) controls.status.value = 'received';
      if (selected === 'linkedin' && !controls.kind.value) controls.kind.value = 'announcement';
    }
    showFields();
  }
  function refreshTranslations() {
    if (!host) return;
    // Keep the same controls and option values: a flag change must neither lose
    // unsaved input nor create a metadata change in an old publication.
    root.AniMoiI18n.apply(host);
  }
  function mount(parent, beforeNode) {
    if (!doc || !parent) throw new Error('Publication metadata interface is unavailable.');
    if (host) {
      if (host.parentNode !== parent) parent.insertBefore(host, beforeNode?.parentNode === parent ? beforeNode : null);
      return host;
    }
    host = element('div', 'publicationFields'); host.className = 'publication-fields';
    const rubricLabel = ui('label', 'rubrics.label'); rubricLabel.htmlFor = 'postRubric';
    const rubric = element('select', 'postRubric');
    const historicalHint = ui('p', 'rubrics.noInference', 'publicationClassificationHint'); historicalHint.className = 'v2-muted';
    rubric.setAttribute('aria-describedby', historicalHint.id);
    host.append(rubricLabel, rubric, historicalHint);
    const humor = root.AniMoiHumor.mount(host, 'postHumor');
    const title = labelled(host, 'input', 'postTitle', 'rubrics.title', 160);

    const sav = element('fieldset', 'savFields'); sav.className = 'catalogue-fieldset';
    sav.append(ui('legend', 'rubric.sav'));
    const subject = labelled(sav, 'input', 'savSubject', 'rubrics.subject', 200);
    const status = labelled(sav, 'select', 'savStatus', 'rubrics.savStatusLabel');
    option(status, '', 'language.unknown');
    for (const value of root.AniMoiRubrics.savStatuses) option(status, value, 'rubrics.savStatus.' + value);
    const reply = labelled(sav, 'textarea', 'savReply', 'rubrics.reply', 2000);
    host.append(sav);

    const professional = element('fieldset', 'professionalFields'); professional.className = 'catalogue-fieldset';
    professional.append(ui('legend', 'rubrics.professional'));
    const kind = labelled(professional, 'select', 'jobKind', 'rubrics.jobType');
    option(kind, '', 'language.unknown');
    for (const value of root.AniMoiRubrics.careerKinds) option(kind, value, 'rubrics.jobKind.' + value);
    const role = labelled(professional, 'input', 'jobRole', 'rubrics.role', 160);
    host.append(professional);
    const gazette = ui('p', 'rubrics.editorialNotice', 'gazetteDraftNotice'); gazette.className = 'notice';
    host.append(gazette);
    controls = {humor, rubricLabel, rubric, title, subject, status, reply, kind, role, sav, professional, gazette, historicalHint};
    rubric.addEventListener('change', selectionChanged);
    doc.addEventListener('animoi:locale-changed', refreshTranslations);
    parent.insertBefore(host, beforeNode?.parentNode === parent ? beforeNode : null);
    load(null);
    return host;
  }
  function load(post, {isNew = false, rubric, tone, humorVariant} = {}) {
    if (!controls) throw new Error('Mount publication fields before loading them.');
    newPost = isNew;
    baseline = {};
    for (const key of ['rubric', 'tone', 'humorVariant', 'title', 'rubricData']) if (post && own(post, key)) baseline[key] = copy(post[key]);
    if (newPost) {
      baseline.rubric = root.AniMoiRubrics.get(rubric)?.id || root.AniMoiRubrics.get(baseline.rubric)?.id || 'pawbook';
      if (typeof tone === 'string') baseline.tone = tone;
      if (root.AniMoiHumor.isAmusing(tone)) baseline.humorVariant = root.AniMoiHumor.normalize(humorVariant);
    }
    controls.humor.value = baseline.humorVariant;
    controls.humor.element.hidden = !root.AniMoiHumor.isAmusing(baseline.tone);
    originalHumor = controls.humor.value;
    const historical = !newPost && root.AniMoiRubrics.isHistorical(baseline);
    controls.rubric.replaceChildren();
    if (historical) option(controls.rubric, '', root.AniMoiRubrics.isUnclassified(baseline) ? 'rubrics.keepHistorical' : 'classify.unknownRubric');
    const choices = newPost ? root.AniMoiRubrics.list : baseline.rubric === 'potins' ? [root.AniMoiRubrics.get('potins')] : root.AniMoiRubrics.historicalChoices();
    for (const choice of choices) option(controls.rubric, choice.id, choice.labelKey);
    controls.rubric.value = historical ? '' : baseline.rubric;
    controls.rubric.disabled = !newPost && baseline.rubric === 'potins';
    root.AniMoiI18n.bind(controls.rubricLabel, historical ? 'rubrics.classify' : 'rubrics.label');
    controls.historicalHint.hidden = !historical;
    const data = baseline.rubricData || {};
    controls.title.value = baseline.title || '';
    controls.subject.value = data.sav?.subject || '';
    controls.status.value = data.sav?.status || '';
    controls.reply.value = data.sav?.reply || '';
    controls.kind.value = data.linkedin?.kind || '';
    controls.role.value = data.linkedin?.role || '';
    if (newPost && baseline.rubric === 'sav' && !controls.status.value) controls.status.value = 'received';
    if (newPost && baseline.rubric === 'linkedin' && !controls.kind.value) controls.kind.value = 'announcement';
    originalDisplay = display();
    showFields();
    return host;
  }
  function values() {
    if (!controls) return {};
    const current = display(), patch = {};
    if (newPost || current.rubric !== originalDisplay.rubric) {
      if (current.rubric) patch.rubric = current.rubric;
    }
    if (newPost && own(baseline, 'tone')) patch.tone = baseline.tone;
    if (root.AniMoiHumor.isAmusing(baseline.tone) && ((newPost && own(baseline, 'humorVariant')) || controls.humor.value !== originalHumor)) patch.humorVariant = controls.humor.value;
    if ((newPost && current.title !== '') || (!newPost && current.title !== originalDisplay.title)) patch.title = current.title;

    const active = current.rubric === 'sav' ? 'sav' : current.rubric === 'linkedin' ? 'linkedin' : null;
    if (active) {
      const names = active === 'sav' ? [['subject', 'subject'], ['status', 'status'], ['reply', 'reply']] : [['kind', 'kind'], ['role', 'role']];
      const choosingFormat = newPost || current.rubric !== originalDisplay.rubric;
      const group = {...(baseline.rubricData?.[active] || {})};
      for (const [control, field] of names) {
        const changed = current[control] !== originalDisplay[control];
        if (!changed && !choosingFormat) continue;
        if (current[control] === '' && !changed) continue;
        if ((field === 'status' || field === 'kind') && current[control] === '') delete group[field];
        else group[field] = current[control];
      }
      const nextData = {...(baseline.rubricData || {})};
      if (Object.keys(group).length) nextData[active] = group;
      else if (own(nextData, active)) nextData[active] = group;
      if (JSON.stringify(nextData) !== JSON.stringify(baseline.rubricData || {})) patch.rubricData = nextData;
    }
    root.AniMoiRubrics.validate({...baseline, ...patch});
    return patch;
  }
  const api = {mount, load, values, get rubric() { return controls?.rubric.value || ''; }};
  root.AniMoiPublicationFields = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
