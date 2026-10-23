/* Shared publication metadata. Reading old stories never assigns a rubric or tone. */
(function (root) {
  'use strict';
  const i18n = root.AniMoiI18n || (typeof module !== 'undefined' ? require('./i18n.js') : null);
  const list = Object.freeze([
    {id:'pawbook', style:'carnet', labelKey:'rubric.pawbook'},
    {id:'sav', style:'dossier', labelKey:'rubric.sav'},
    {id:'linkedin', style:'career', labelKey:'rubric.linkedin'},
    {id:'potins', style:'gazette', labelKey:'rubric.potins'}
  ].map(Object.freeze));
  const savStatuses = Object.freeze(['received', 'in-progress', 'compensated', 'closed']);
  const careerKinds = Object.freeze(['announcement', 'promotion', 'cv', 'offer', 'resignation']);
  function get(id) { return list.find(rubric => rubric.id === id) || null; }
  function label(id, locale = i18n?.locale || 'fr') {
    const key = get(id)?.labelKey || (id ? 'classify.unknownRubric' : 'rubrics.historical');
    return i18n?.tFor(locale, key) || key;
  }
  function isHistorical(post) { return get(post?.rubric) === null; }
  // An unknown future rubric is retained, but it already has an assignment.
  function isUnclassified(post) { return post?.rubric === undefined || post.rubric === ''; }
  function historicalChoices() { return list.filter(rubric => rubric.id !== 'potins'); }
  function ticket(post) {
    const id = typeof post?.id === 'string' ? post.id : '';
    const suffix = id.normalize('NFKD').replace(/[^a-z0-9]/gi, '').slice(-12).toUpperCase();
    // Display-only reference: never a counter or a claim of a real support case.
    return 'SAV-' + (suffix || 'LOCAL');
  }
  function invalid(field) {
    throw Object.assign(new Error('Métadonnées de rubrique invalides : ' + field), {code:'rubrics.invalid', field});
  }
  function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function optionalString(value, limit, field) {
    if (value !== undefined && (typeof value !== 'string' || value.length > limit)) invalid(field);
  }
  function validate(post) {
    if (!object(post)) invalid('publication');
    // Empty historical values remain readable; an unknown valid future slug is
    // retained and displayed as unrecognised until this app understands it.
    if (post.rubric !== undefined && (typeof post.rubric !== 'string' ||
        (post.rubric !== '' && !/^[a-z][a-z0-9_-]{0,59}$/.test(post.rubric)))) invalid('rubric');
    optionalString(post.tone, 80, 'tone');
    if (post.humorVariant !== undefined && !['funny', 'cheeky', 'wacky'].includes(post.humorVariant)) invalid('humorVariant');
    optionalString(post.title, 160, 'title');
    if (post.rubricData === undefined) return;
    if (!object(post.rubricData)) invalid('rubricData');
    const data = post.rubricData;
    if (data.sav !== undefined) {
      if (!object(data.sav)) invalid('rubricData.sav');
      optionalString(data.sav.subject, 200, 'rubricData.sav.subject');
      optionalString(data.sav.reply, 2000, 'rubricData.sav.reply');
      if (data.sav.status !== undefined && !savStatuses.includes(data.sav.status)) invalid('rubricData.sav.status');
    }
    if (data.linkedin !== undefined) {
      if (!object(data.linkedin)) invalid('rubricData.linkedin');
      optionalString(data.linkedin.role, 160, 'rubricData.linkedin.role');
      if (data.linkedin.kind !== undefined && !careerKinds.includes(data.linkedin.kind)) invalid('rubricData.linkedin.kind');
    }
    // Unknown extension fields and editorial metadata belong to their adapters;
    // this validator neither removes them nor invents any missing defaults.
  }
  const api = Object.freeze({list, get, label, isHistorical, isUnclassified, historicalChoices, ticket, validate, savStatuses, careerKinds});
  root.AniMoiRubrics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
