/* Editable local catalogues. Opening a profile never writes or migrates its data. */
(() => {
  'use strict';
  const host = document.getElementById('profileCharacteristics');
  if (!host) return;
  const model = AniMoiCharacteristics, i18n = AniMoiI18n;
  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const text = (entry, locale = i18n.locale) => entry.labels?.[locale] || entry.labels?.fr || entry.labels?.en || entry.id;
  let base = null, draft = null, species = 'Chien', breedDirty = false, traitsDirty = false, detailDirty = false, dominantDirty = false;
  function node(tag, value, cls) {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = value;
    if (cls) element.className = cls;
    return element;
  }
  function ui(tag, key, cls) { return i18n.bind(node(tag, undefined, cls), key); }
  function labelledInput(id, key, placeholder) {
    const label = ui('label', key); label.htmlFor = id;
    const input = node('input'); input.type = 'search'; input.id = id;
    input.autocomplete = 'off'; i18n.bind(input, placeholder, 'placeholder');
    return [label, input];
  }
  function group(key) {
    const fieldset = node('fieldset', undefined, 'catalogue-fieldset');
    fieldset.append(ui('legend', key)); host.append(fieldset); return fieldset;
  }
  const breed = group('characteristics.breedTitle');
  const statusLabel = ui('label', 'characteristics.breedStatus'); statusLabel.htmlFor = 'breedStatus';
  const status = node('select'); status.id = 'breedStatus';
  for (const value of ['selected', 'unknown', 'not-applicable']) {
    const option = ui('option', 'characteristics.status.' + (value === 'not-applicable' ? 'notApplicable' : value));
    option.value = value; status.append(option);
  }
  const noBreedHint = ui('p', 'characteristics.notApplicableHint', 'v2-muted');
  const unknownBreedHint = ui('p', 'characteristics.unknownBreedHint', 'v2-muted');
  const noCatalogueHint = ui('p', 'characteristics.noBreedCatalogue', 'v2-muted');
  const retainedBreedHint = ui('p', 'characteristics.retainedBreedHint', 'v2-muted'); retainedBreedHint.id = 'retainedBreedHint';
  const knownArea = node('div'); knownArea.id = 'knownBreedFields';
  const searchArea = node('div');
  const [breedSearchLabel, breedSearch] = labelledInput('breedSearch', 'characteristics.breedSearch', 'characteristics.breedSearchPlaceholder');
  const breedResults = node('div', undefined, 'catalogue-results'); breedResults.id = 'breedResults';
  const breedCount = node('p', undefined, 'v2-muted catalogue-count'); breedCount.id = 'breedResultCount'; breedCount.setAttribute('aria-live', 'polite');
  searchArea.append(breedSearchLabel, breedSearch, breedResults, breedCount);
  const selectedTitle = ui('p', 'characteristics.breedSelected', 'setting-label');
  const breedSelected = node('div', undefined, 'catalogue-selected'); breedSelected.id = 'breedSelected';
  const primaryLabel = ui('label', 'characteristics.breedMainLabel'); primaryLabel.htmlFor = 'breedPrimary';
  const primary = node('select'); primary.id = 'breedPrimary';
  const crossbred = ui('p', 'characteristics.crossbred', 'v2-muted');
  const customBreedLabel = ui('label', 'characteristics.breedCustom'); customBreedLabel.htmlFor = 'customBreed';
  const customBreed = node('input'); customBreed.id = 'customBreed'; customBreed.maxLength = 200;
  i18n.bind(customBreed, 'characteristics.breedCustomPlaceholder', 'placeholder');
  const addBreed = ui('button', 'characteristics.addCustomBreed', 'secondary'); addBreed.id = 'addCustomBreed'; addBreed.type = 'button';
  const customBreedRow = node('div', undefined, 'catalogue-custom'); customBreedRow.append(customBreed, addBreed);
  const sources = ui('a', 'characteristics.sourcesLink'); sources.href = 'catalogs/SOURCES.txt'; sources.target = '_blank'; sources.rel = 'noopener';
  knownArea.append(ui('p', 'characteristics.knownBreedHint', 'v2-muted'), noCatalogueHint, searchArea, selectedTitle, breedSelected, primaryLabel, primary, crossbred, customBreedLabel, customBreedRow, ui('p', 'characteristics.customHint', 'v2-muted'), sources);
  const speciesDetailArea = node('div'); speciesDetailArea.id = 'speciesDetailFields';
  const speciesCatalogArea = node('div'); speciesCatalogArea.id = 'speciesCatalogueFields';
  const [speciesSearchLabel, speciesSearch] = labelledInput('speciesSearch', 'characteristics.speciesSearch', 'characteristics.speciesSearchPlaceholder');
  speciesSearchLabel.id = 'speciesSearchLabel';
  const speciesResults = node('div', undefined, 'catalogue-results'); speciesResults.id = 'speciesResults';
  speciesResults.setAttribute('role', 'radiogroup'); speciesResults.setAttribute('aria-labelledby', speciesSearchLabel.id);
  const speciesCount = node('p', undefined, 'v2-muted catalogue-count'); speciesCount.id = 'speciesResultCount'; speciesCount.setAttribute('aria-live', 'polite');
  const speciesSelectedTitle = ui('p', 'characteristics.speciesCatalogSelected', 'setting-label');
  const speciesSelected = node('p', undefined, 'v2-muted'); speciesSelected.id = 'speciesCatalogSelected';
  const speciesClear = ui('button', 'characteristics.speciesCatalogClear', 'secondary'); speciesClear.type = 'button'; speciesClear.id = 'speciesCatalogClear';
  speciesCatalogArea.append(ui('p', 'characteristics.speciesCatalogHint', 'v2-muted'), speciesSearchLabel, speciesSearch, speciesResults, speciesCount, speciesSelectedTitle, speciesSelected, speciesClear);
  const speciesDetailLabel = ui('label', 'characteristics.speciesDetail'); speciesDetailLabel.htmlFor = 'speciesDetail';
  const speciesDetail = node('input'); speciesDetail.id = 'speciesDetail'; speciesDetail.maxLength = 200;
  speciesDetailArea.append(speciesCatalogArea, speciesDetailLabel, speciesDetail, ui('p', 'characteristics.speciesDetailHint', 'v2-muted'));
  breed.append(statusLabel, status, unknownBreedHint, noBreedHint, retainedBreedHint, knownArea, speciesDetailArea);

  const temperament = group('characteristics.traitsTitle');
  const [traitSearchLabel, traitSearch] = labelledInput('traitSearch', 'characteristics.traitsSearch', 'characteristics.traitsSearchPlaceholder');
  const traitResults = node('div', undefined, 'catalogue-results'); traitResults.id = 'traitResults';
  const traitCount = node('p', undefined, 'v2-muted catalogue-count'); traitCount.id = 'traitResultCount'; traitCount.setAttribute('aria-live', 'polite');
  const traitSelected = node('div', undefined, 'catalogue-selected'); traitSelected.id = 'traitSelected';
  const customTraitLabel = ui('label', 'characteristics.traitsCustom'); customTraitLabel.htmlFor = 'customTrait';
  const customTrait = node('input'); customTrait.id = 'customTrait'; customTrait.maxLength = 200;
  i18n.bind(customTrait, 'characteristics.traitsCustomPlaceholder', 'placeholder');
  const addTrait = ui('button', 'characteristics.addCustomTrait', 'secondary'); addTrait.id = 'addCustomTrait'; addTrait.type = 'button';
  const customTraitRow = node('div', undefined, 'catalogue-custom'); customTraitRow.append(customTrait, addTrait);
  const dominantTitle = ui('p', 'characteristics.dominantTitle', 'setting-label'); dominantTitle.id = 'dominantTitle';
  const dominantHint = ui('p', 'characteristics.dominantHint', 'v2-muted'); dominantHint.id = 'dominantHint';
  const dominantCount = node('p', undefined, 'v2-muted'); dominantCount.id = 'dominantCount'; dominantCount.setAttribute('aria-live', 'polite');
  const dominantTraits = node('div', undefined, 'catalogue-results'); dominantTraits.id = 'dominantTraits';
  dominantTraits.setAttribute('role', 'group'); dominantTraits.setAttribute('aria-labelledby', dominantTitle.id); dominantTraits.setAttribute('aria-describedby', dominantHint.id);
  temperament.append(ui('p', 'characteristics.traitsHint', 'v2-muted'), traitSearchLabel, traitSearch, traitResults, traitCount, ui('p', 'characteristics.traitsSelected', 'setting-label'), traitSelected, customTraitLabel, customTraitRow, dominantTitle, dominantHint, ui('p', 'characteristics.dominantStarHint', 'v2-muted'), dominantCount, dominantTraits);
  const legacyHint = ui('p', 'characteristics.legacyHint', 'v2-muted'); host.append(legacyHint);
  const feedback = node('p', undefined, 'catalogue-feedback'); feedback.id = 'characteristicsFeedback'; feedback.setAttribute('role', 'status'); host.append(feedback);

  function entries() { return AniMoiBreeds.species[species]?.entries || []; }
  const allBreeds = new Map(Object.values(AniMoiBreeds.species).flatMap(item => item.entries).map(entry => [entry.id, entry]));
  const allTraits = new Map(model.traits.map(entry => [entry.id, entry]));
  function matching(list, search) {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return list.filter(entry => {
      const value = fold([entry.id, entry.scientificName || '', ...Object.values(entry.labels || {}), ...(entry.aliases || [])].join(' '));
      return words.every(word => value.includes(word));
    }).sort((a, b) => text(a).localeCompare(text(b), i18n.locale));
  }
  function checkbox(container, label, id, checked, handler) {
    const row = node('label', undefined, 'catalogue-option');
    const input = node('input'); input.type = 'checkbox'; input.value = id; input.checked = checked;
    input.onchange = () => handler(input.checked);
    row.append(input, node('span', label)); container.append(row);
    return input;
  }
  function pruneDominants() {
    const value = draft.temperament;
    if (!value.dominant) return;
    const selected = new Set([...value.ids.map(id => 'id:' + id), ...value.custom.map(item => 'custom:' + item), ...(value.legacyText ? ['legacy'] : [])]);
    value.dominant = value.dominant.filter(key => selected.has(key));
  }
  function notice(key) { feedback.textContent = i18n.t(key); }
  function toggle(kind, id, selected) {
    const value = kind === 'breed' ? draft.breed : draft.temperament;
    const limit = kind === 'breed' ? 20 : 80;
    if (selected && value.ids.length >= limit) { notice('characteristics.selectionLimit'); render(); return; }
    value.ids = selected ? [...value.ids.filter(item => item !== id), id] : value.ids.filter(item => item !== id);
    if (kind === 'breed') {
      breedDirty = true; value.status = 'selected';
      if (value.primaryId && !value.ids.includes(value.primaryId)) value.primaryId = null;
    } else { traitsDirty = true; pruneDominants(); }
    feedback.textContent = ''; render();
  }
  function renderResults(target, count, list, selected, query, kind) {
    const focusValue = target.contains(document.activeElement) ? document.activeElement.value : null;
    target.replaceChildren();
    const found = matching(list, query);
    for (const entry of found.slice(0, 20)) checkbox(target, text(entry), entry.id, selected.includes(entry.id), checked => toggle(kind, entry.id, checked));
    count.textContent = !found.length ? i18n.t('characteristics.noResults') : found.length > 20 ? i18n.t('characteristics.moreResults', {count: found.length}) : i18n.t('characteristics.resultCount', {count: found.length});
    if (focusValue) [...target.querySelectorAll('input')].find(input => input.value === focusValue)?.focus({preventScroll: true});
  }
  function renderSelected(target, value, lookup, kind) {
    const focused = target.contains(document.activeElement) ? document.activeElement.value : null;
    const focusIndex = focused ? [...target.querySelectorAll('input')].indexOf(document.activeElement) : -1;
    target.replaceChildren();
    for (const id of value.ids) checkbox(target, lookup.has(id) ? text(lookup.get(id)) : id, id, true, checked => toggle(kind, id, checked));
    for (const custom of value.custom) checkbox(target, custom, 'custom:' + custom, true, () => {
      value.custom = value.custom.filter(item => item !== custom);
      if (kind === 'breed') breedDirty = true; else { traitsDirty = true; pruneDominants(); }
      feedback.textContent = ''; render();
    });
    if (value.legacyText) checkbox(target, value.legacyText, 'legacy-text', true, () => {
      delete value.legacyText;
      if (kind === 'breed') breedDirty = true; else { traitsDirty = true; pruneDominants(); }
      feedback.textContent = ''; render();
    });
    if (!value.ids.length && !value.custom.length && !value.legacyText) target.append(ui('p', 'characteristics.noSelection', 'v2-muted'));
    if (focused) {
      const choices = [...target.querySelectorAll('input')];
      const next = choices.find(input => input.value === focused) || choices[Math.min(focusIndex, choices.length - 1)] || (kind === 'breed' && searchArea.hidden ? customBreed : kind === 'breed' ? breedSearch : traitSearch);
      next.focus({preventScroll: true});
    }
  }
  function render() {
    if (!draft) return;
    const relevant = AniMoiBreeds.species[species]?.kind === 'breed';
    const choice = model.breedChoice(draft.breed);
    status.value = choice; knownArea.hidden = choice !== 'selected'; noCatalogueHint.hidden = relevant;
    noBreedHint.hidden = choice !== 'not-applicable'; unknownBreedHint.hidden = choice !== 'unknown';
    retainedBreedHint.hidden = !draft.breed.retainedSelection;
    speciesDetailArea.hidden = choice !== 'not-applicable';
    const placeholderKey = {Poisson: 'speciesDetailFishPlaceholder', Hamster: 'speciesDetailHamsterPlaceholder', Oiseau: 'speciesDetailBirdPlaceholder'}[species] || 'speciesDetailPlaceholder';
    i18n.bind(speciesDetail, 'characteristics.' + placeholderKey, 'placeholder');
    renderSpecies();
    renderResults(breedResults, breedCount, entries(), draft.breed.ids, breedSearch.value, 'breed');
    renderSelected(breedSelected, draft.breed, allBreeds, 'breed');
    primary.replaceChildren(ui('option', 'characteristics.noPrimary')); primary.firstChild.value = '';
    for (const id of draft.breed.ids) { const option = node('option', allBreeds.has(id) ? text(allBreeds.get(id)) : id); option.value = id; primary.append(option); }
    primary.value = draft.breed.primaryId || ''; primary.hidden = primaryLabel.hidden = !draft.breed.ids.length;
    crossbred.hidden = draft.breed.ids.length + draft.breed.custom.length + (draft.breed.legacyText ? 1 : 0) < 2;
    renderResults(traitResults, traitCount, model.traits, draft.temperament.ids, traitSearch.value, 'traits');
    renderSelected(traitSelected, draft.temperament, allTraits, 'traits');
    renderDominants();
    legacyHint.hidden = !base || !!base.characteristics || !(base.breed || base.traits);
  }
  function renderDominants() {
    const focused = dominantTraits.contains(document.activeElement) ? document.activeElement.value : null;
    const choices = model.traitChoices({species, characteristics: draft}, i18n.locale);
    const selected = draft.temperament.dominant || [];
    dominantTraits.replaceChildren();
    dominantCount.textContent = i18n.t('characteristics.dominantCount', {count: selected.length});
    if (!choices.length) dominantTraits.append(ui('p', 'characteristics.dominantEmpty', 'v2-muted'));
    for (const choice of choices) {
      const input = checkbox(dominantTraits, choice.label, choice.key, selected.includes(choice.key), checked => {
        if (checked && (draft.temperament.dominant || []).length >= 3) { notice('characteristics.dominantLimit'); renderDominants(); return; }
        draft.temperament.dominant = checked ? [...(draft.temperament.dominant || []), choice.key] : (draft.temperament.dominant || []).filter(key => key !== choice.key);
        dominantDirty = true; feedback.textContent = ''; renderDominants();
      });
      input.setAttribute('aria-label', i18n.t('characteristics.dominantLabel', {trait: choice.label}));
      const star = node('span', input.checked ? '★' : '☆', 'dominant-star'); star.setAttribute('aria-hidden', 'true'); input.after(star);
      input.title = i18n.t(input.checked ? 'characteristics.dominantRemove' : 'characteristics.dominantAdd', {trait: choice.label});
      input.disabled = selected.length >= 3 && !selected.includes(choice.key);
    }
    if (focused) [...dominantTraits.querySelectorAll('input')].find(input => input.value === focused)?.focus({preventScroll: true});
  }
  function renderSpecies() {
    const list = window.AniMoiSpecies?.species?.[species]?.entries || [];
    speciesCatalogArea.hidden = !list.length;
    const focusId = speciesResults.contains(document.activeElement) ? document.activeElement.value : null;
    speciesResults.replaceChildren();
    const found = matching(list, speciesSearch.value);
    const detail = draft.speciesDetail?.species === species ? draft.speciesDetail : null;
    for (const entry of found.slice(0, 20)) {
      const row = node('label', undefined, 'catalogue-option');
      const radio = node('input'); radio.type = 'radio'; radio.name = 'species-catalogue'; radio.value = entry.id; radio.checked = detail?.catalogueId === entry.id;
      const description = node('span', undefined, 'catalogue-entry');
      description.append(node('span', text(entry)), node('small', [i18n.t(entry.kind === 'variety' ? 'characteristics.varietyKind' : 'characteristics.speciesKind'), entry.scientificName].filter(Boolean).join(' · ')));
      radio.onchange = () => {
        draft.speciesDetail = {...(draft.speciesDetail?.species === species ? draft.speciesDetail : {}), species, text: text(entry), catalogueId: entry.id};
        speciesDetail.value = text(entry); detailDirty = true; feedback.textContent = ''; renderSpecies();
      };
      row.append(radio, description); speciesResults.append(row);
    }
    speciesCount.textContent = !found.length ? i18n.t('characteristics.noResults') : found.length > 20 ? i18n.t('characteristics.moreResults', {count: found.length}) : i18n.t('characteristics.resultCount', {count: found.length});
    const selected = model.speciesDetail({species, characteristics: draft}, i18n.locale);
    speciesSelected.textContent = selected; speciesSelectedTitle.hidden = speciesSelected.hidden = !selected;
    speciesClear.hidden = !detail?.catalogueId;
    if (detail?.catalogueId && model.breedChoice(draft.breed) === 'not-applicable') speciesDetail.value = selected;
    if (focusId) [...speciesResults.querySelectorAll('input')].find(input => input.value === focusId)?.focus({preventScroll: true});
  }
  function addCustom(kind) {
    const input = kind === 'breed' ? customBreed : customTrait;
    const value = input.value.trim();
    if (!value || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) { notice('characteristics.invalidCustom'); return false; }
    const selection = kind === 'breed' ? draft.breed : draft.temperament;
    if (selection.custom.some(item => fold(item) === fold(value))) { input.value = ''; return true; }
    if (selection.custom.length >= (kind === 'breed' ? 20 : 40)) { notice('characteristics.customLimit'); return false; }
    selection.custom.push(value);
    if (kind === 'breed') { breedDirty = true; selection.status = 'selected'; }
    else traitsDirty = true;
    input.value = ''; feedback.textContent = ''; render(); input.focus(); return true;
  }
  addBreed.onclick = () => addCustom('breed'); addTrait.onclick = () => addCustom('traits');
  for (const [input, kind] of [[customBreed, 'breed'], [customTrait, 'traits']]) input.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(kind); } };
  breedSearch.oninput = () => renderResults(breedResults, breedCount, entries(), draft.breed.ids, breedSearch.value, 'breed');
  traitSearch.oninput = () => renderResults(traitResults, traitCount, model.traits, draft.temperament.ids, traitSearch.value, 'traits');
  speciesSearch.oninput = renderSpecies;
  speciesClear.onclick = () => {
    if (draft.speciesDetail?.species !== species) return;
    draft.speciesDetail.text = speciesDetail.value.trim(); delete draft.speciesDetail.catalogueId;
    detailDirty = true; renderSpecies(); speciesDetail.focus();
  };
  status.onchange = () => {
    const choice = status.value;
    if (model.breedChoice(draft.breed) === 'selected' && customBreed.value.trim() && !addCustom('breed')) { status.value = model.breedChoice(draft.breed); return; }
    draft = model.setBreedChoice(draft, choice); breedDirty = true;
    feedback.textContent = ''; render();
  };
  speciesDetail.oninput = () => {
    if (model.breedChoice(draft.breed) !== 'not-applicable') return;
    draft.speciesDetail = {...(draft.speciesDetail?.species === species ? draft.speciesDetail : {}), species, text: speciesDetail.value.trim()};
    delete draft.speciesDetail.catalogueId; detailDirty = true; renderSpecies();
  };
  primary.onchange = () => { draft.breed.primaryId = primary.value || null; breedDirty = true; };
  $('species').addEventListener('change', () => {
    if (model.breedChoice(draft.breed) === 'selected' && customBreed.value.trim() && !addCustom('breed')) { $('species').value = species; return; }
    species = $('species').value; breedSearch.value = ''; speciesSearch.value = '';
    // Keep all previous origins visible until the user explicitly changes them.
    if (!draft.breed.ids.length && !draft.breed.custom.length && !draft.breed.legacyText) {
      draft = model.setBreedChoice(draft, AniMoiBreeds.species[species]?.kind === 'breed' ? 'unknown' : 'not-applicable'); breedDirty = true;
    }
    speciesDetail.value = draft.speciesDetail?.species === species ? draft.speciesDetail.text : '';
    render();
  });
  document.addEventListener('animoi:locale-changed', render);
  window.AniMoiProfileFields = {
    load(pet, currentSpecies) {
      base = pet ? copy(pet) : null; species = currentSpecies; draft = model.read(pet || {});
      if (!pet && AniMoiBreeds.species[species]?.kind !== 'breed') draft.breed.status = 'not-applicable';
      breedDirty = false; traitsDirty = false; detailDirty = false; dominantDirty = false; speciesDetail.value = draft.speciesDetail?.species === species ? draft.speciesDetail.text : ''; speciesSearch.value = ''; breedSearch.value = ''; traitSearch.value = ''; customBreed.value = ''; customTrait.value = ''; feedback.textContent = ''; render();
    },
    values() {
      // Typed custom values are included even when the user goes straight to Save.
      if (model.breedChoice(draft.breed) === 'selected' && customBreed.value.trim() && !addCustom('breed')) throw new Error(feedback.textContent);
      if (customTrait.value.trim() && !addCustom('traits')) throw new Error(feedback.textContent);
      const metadataDirty = breedDirty || traitsDirty || detailDirty || dominantDirty;
      if (metadataDirty || !base || base.characteristics) model.validate(draft);
      const display = model.display({species, characteristics: draft}, 'fr');
      const result = {breed: breedDirty || detailDirty || !base ? display.breed : base.breed, traits: traitsDirty || !base ? display.traits : base.traits};
      if (metadataDirty || !base) result.characteristics = copy(draft);
      else if (base.characteristics) result.characteristics = copy(base.characteristics);
      return result;
    }
  };
})();
