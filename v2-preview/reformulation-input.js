/* Preparation only: builds an allowlisted payload. No fetch, storage or UI connection. */
(function (root) {
  'use strict';
  const characteristics = root.AniMoiCharacteristics || (typeof require === 'function' ? require('./characteristics.js') : null);
  const ages = root.AniMoiPetAge || (typeof require === 'function' ? require('./pet-age.js') : null);
  const amusing = tone => ['drôle', 'amusant', 'amusing', 'humoristique, légèrement insolent'].includes(tone);
  const tones = ['drôle','amusant','humoristique, légèrement insolent','tendre','triste','neutre','sérieux','ironique','sarcastique','en colère','dramatique','philosophe'];
  function invalid() { throw new Error('invalid_reformulation_input'); }
  function text(value, max) { if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(); return value; }
  function fromProfile(pet, {anecdote, language, rubric, tone, humorVariant, today = new Date()} = {}) {
    if (!pet || typeof pet !== 'object' || Array.isArray(pet)) invalid();
    tone = tone === 'amusing' ? 'amusant' : tone;
    if (!['fr','en','es','de','it'].includes(language) || !['pawbook','sav','linkedin','potins'].includes(rubric) || !tones.includes(tone)) invalid();
    if (!['Chien','Chat','Oiseau','Lapin','Cheval','Poisson','Hamster','Autre'].includes(pet.species)) invalid();
    if (humorVariant !== undefined && (!amusing(tone) || !['funny','cheeky','wacky'].includes(humorVariant))) invalid();
    if (pet.characteristics !== undefined) characteristics.validate(pet.characteristics);
    ages.validate(pet, {today});
    const profile = characteristics.toAIContext(pet, language);
    const traits = [...new Set(profile.temperament.labels)], dominants = [...new Set(profile.temperament.dominantLabels)];
    if (traits.length > 52 || dominants.length > 3 || dominants.some(trait => !traits.includes(trait))) invalid();
    traits.forEach(trait => text(trait, 100));
    const animal = {name:text(pet.name,80), species:pet.species, traits, dominants};
    if (pet.sex !== undefined) {
      if (!['female','male','unknown'].includes(pet.sex)) invalid();
      animal.sex = pet.sex;
    }
    const detail = profile.speciesDetail;
    if (detail) animal.variety = text(detail,160);
    else if (profile.breed.status === 'selected') {
      const hasBreed = profile.breed.ids.length || profile.breed.custom.length || profile.breed.legacyText;
      if (hasBreed) animal.breed = text(profile.breed.labels.join(' × '),160);
    }
    // Preserve unsplit historical free text; do not guess a catalogue selection.
    else if (!pet.characteristics && typeof pet.breed === 'string' && pet.breed.trim()) animal.breed = text(pet.breed,160);
    const age = ages.ageParts(pet,today);
    if (age) {
      if (!Number.isSafeInteger(age.years) || age.years < 0 || age.years > 200) invalid();
      animal.age = {years:age.years,months:age.months,estimated:age.estimated};
    }
    const payload = {animal,anecdote:text(anecdote,2000),language,rubric,tone};
    if (amusing(tone)) payload.humorVariant = humorVariant || 'funny';
    return payload;
  }
  const api = Object.freeze({fromProfile});
  root.AniMoiReformulationInput = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
