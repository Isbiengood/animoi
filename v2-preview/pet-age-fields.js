/* Optional editor fields; opening a profile never adds or migrates stored data. */
(() => {
  'use strict';
  const host = document.getElementById('profileCharacteristics');
  if (!host) return;
  const model = AniMoiPetAge, i18n = AniMoiI18n;
  let base = null, dirty = false;
  function node(tag, id) { const element = document.createElement(tag); if (id) element.id = id; return element; }
  function ui(tag, key, id) { return i18n.bind(node(tag, id), key); }
  function label(key, id) { const element = ui('label', key); element.htmlFor = id; return element; }
  const fields = node('fieldset', 'petAgeFields'); fields.className = 'catalogue-fieldset pet-age-fields';
  fields.append(ui('legend', 'age.title'), ui('p', 'age.optional'));
  const mode = node('select', 'ageMode');
  for (const [value, key] of [['unknown', 'age.unknown'], ['birthDate', 'age.birthDate'], ['estimatedAge', 'age.estimatedAge']]) {
    const option = ui('option', key); option.value = value; mode.append(option);
  }
  fields.append(label('age.mode', 'ageMode'), mode);
  const dateArea = node('div', 'birthDateFields'), birthday = node('input', 'birthDate');
  birthday.type = 'date'; birthday.autocomplete = 'off';
  dateArea.append(label('age.birthDate', 'birthDate'), birthday);
  const estimatedArea = node('div', 'estimatedAgeFields'); estimatedArea.className = 'twocol';
  const years = node('input', 'estimatedYears'), months = node('input', 'estimatedMonths');
  for (const input of [years, months]) { input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; }
  months.max = '11';
  const yearsArea = node('div'), monthsArea = node('div');
  yearsArea.append(label('age.years', 'estimatedYears'), years); monthsArea.append(label('age.months', 'estimatedMonths'), months);
  estimatedArea.append(yearsArea, monthsArea);
  const calculated = node('p', 'calculatedAge'); calculated.className = 'v2-muted'; calculated.setAttribute('aria-live', 'polite');
  fields.append(dateArea, estimatedArea, calculated); host.before(fields);
  function candidate() {
    if (mode.value === 'birthDate') {
      if (birthday.validity.badInput) { const error = new Error(i18n.t('age.invalidDate')); error.code = 'age.invalidDate'; throw error; }
      return {birthDate: birthday.value || null, estimatedAge: null};
    }
    if (mode.value === 'estimatedAge') {
      if (years.validity.badInput || months.validity.badInput) { const error = new Error(i18n.t('age.invalidEstimate')); error.code = 'age.invalidEstimate'; throw error; }
      if (years.value !== '' || months.value !== '') return {birthDate: null, estimatedAge: {...(base?.estimatedAge || {}), years: years.value === '' ? 0 : Number(years.value), months: months.value === '' ? 0 : Number(months.value), recordedOn: model.todayString()}};
    }
    return {birthDate: null, estimatedAge: null};
  }
  function refresh() {
    birthday.max = model.todayString(); dateArea.hidden = mode.value !== 'birthDate'; estimatedArea.hidden = mode.value !== 'estimatedAge';
    calculated.textContent = '';
    try {
      const value = candidate(); model.validate(value);
      const age = model.display(value, i18n.locale);
      if (age) calculated.textContent = i18n.t(value.estimatedAge ? 'age.estimated' : 'age.calculated', {age});
    } catch (error) { calculated.textContent = i18n.t(error.code || 'age.invalidDate'); }
  }
  mode.onchange = () => { dirty = true; refresh(); };
  for (const input of [birthday, years, months]) input.oninput = () => { dirty = true; refresh(); };
  window.AniMoiPetAgeFields = {
    load(pet) {
      base = pet || null; dirty = false;
      mode.value = pet?.birthDate ? 'birthDate' : pet?.estimatedAge ? 'estimatedAge' : 'unknown';
      birthday.value = pet?.birthDate || ''; years.value = pet?.estimatedAge?.years ?? ''; months.value = pet?.estimatedAge?.months ?? ''; refresh();
    },
    values() {
      if (!dirty) return {};
      try { const value = candidate(); model.validate(value); return value; }
      catch (error) { throw new Error(i18n.t(error.code || 'age.invalidDate')); }
    },
    refresh
  };
  document.addEventListener('animoi:locale-changed', refresh);
  refresh();
})();
