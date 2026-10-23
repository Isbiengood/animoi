/* Calendar-only pet ages. Never derive a date of birth from an estimated age. */
(function (root) {
  'use strict';
  const leapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = (year, month) => [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= monthDays(year, month) ? {year, month, day} : null;
  }
  function todayString(today = new Date()) {
    if (typeof today === 'string') {
      if (!parseDate(today)) throw new Error('Invalid calendar day');
      return today;
    }
    if (!(today instanceof Date) || !Number.isFinite(today.getTime())) throw new Error('Invalid calendar day');
    return [String(today.getFullYear()).padStart(4, '0'), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  }
  function problem(code, message) { const error = new Error(message); error.code = code; return error; }
  function validate(pet, {allowFuture = false, today = new Date()} = {}) {
    const birthday = pet.birthDate;
    if (birthday !== undefined && birthday !== null) {
      if (!parseDate(birthday)) throw problem('age.invalidDate', 'Date de naissance invalide.');
      if (!allowFuture && birthday > todayString(today)) throw problem('age.futureDate', 'La date de naissance ne peut pas être dans le futur.');
    }
    const estimate = pet.estimatedAge;
    if (estimate !== undefined && estimate !== null) {
      if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate) ||
          !Number.isSafeInteger(estimate.years) || estimate.years < 0 ||
          !Number.isInteger(estimate.months) || estimate.months < 0 || estimate.months > 11 ||
          !parseDate(estimate.recordedOn)) throw problem('age.invalidEstimate', 'Âge estimé invalide : indique des années entières et de 0 à 11 mois.');
      if (birthday) throw problem('age.invalidEstimate', 'Choisis une date de naissance ou un âge estimé.');
    }
    return true;
  }
  function ordinal({year, month, day}) {
    const date = new Date(0); date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(year, month - 1, day);
    return Math.floor(date.getTime() / 86400000);
  }
  function ageParts(pet, today = new Date()) {
    const current = parseDate(todayString(today)), birthday = parseDate(pet.birthDate);
    if (birthday) {
      if (pet.birthDate > todayString(today)) return null;
      let totalMonths = (current.year - birthday.year) * 12 + current.month - birthday.month;
      // End-of-month births reach the next month on that month's last calendar day.
      if (current.day < Math.min(birthday.day, monthDays(current.year, current.month))) totalMonths--;
      return {years: Math.floor(totalMonths / 12), months: totalMonths % 12,
        days: ordinal(current) - ordinal(birthday), estimated: false};
    }
    if (pet.estimatedAge) {
      try { validate({estimatedAge: pet.estimatedAge}); } catch { return null; }
      return {years: pet.estimatedAge.years, months: pet.estimatedAge.months, estimated: true};
    }
    return null;
  }
  function display(pet, locale = 'fr', today = new Date()) {
    const age = ageParts(pet, today);
    if (!age) return '';
    const unit = (value, name) => new Intl.NumberFormat(locale, {style: 'unit', unit: name, unitDisplay: 'long', maximumFractionDigits: 0}).format(value);
    if (!age.years) return !age.months && !age.estimated ? unit(age.days, 'day') : unit(age.months, 'month');
    const parts = [unit(age.years, 'year')];
    if (age.years < 2 && age.months) parts.push(unit(age.months, 'month'));
    return parts.join(' ');
  }
  function isBirthday(pet, today = new Date()) {
    const birthday = parseDate(pet.birthDate), currentString = todayString(today), current = parseDate(currentString);
    if (!birthday || pet.birthDate > currentString) return false;
    const day = birthday.month === 2 && birthday.day === 29 && !leapYear(current.year) ? 28 : birthday.day;
    return current.month === birthday.month && current.day === day;
  }
  const api = {parseDate, todayString, validate, ageParts, display, isBirthday, leapYear};
  root.AniMoiPetAge = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
