const {test} = require('node:test');
const assert = require('node:assert/strict');
const age = require('../v2-preview/pet-age.js');

test('calendar parsing rejects impossible, incomplete and ambiguous dates', () => {
  for (const value of ['2025-02-29', '2024-02-30', '2024-13-01', '2024-00-01', '2024-01-00', '0000-01-01', '2024-1-1', '29/02/2024', '2024-01-01T00:00:00Z', '', 2024]) assert.equal(age.parseDate(value), null);
  assert.deepEqual(age.parseDate('2024-02-29'), {year: 2024, month: 2, day: 29});
  assert.deepEqual(age.parseDate('0001-01-01'), {year: 1, month: 1, day: 1});
});
test('local today does not convert the browser calendar day to UTC', () => {
  const local = new Date(2026, 0, 2, 0, 5);
  assert.equal(age.todayString(local), '2026-01-02');
  assert.equal(age.todayString('2024-02-29'), '2024-02-29');
  assert.throws(() => age.todayString('2025-02-29'));
});
test('optional unknown dates and ages do not require or invent fields', () => {
  for (const profile of [{}, {birthDate: null, estimatedAge: null}]) {
    assert.equal(age.validate(profile), true); assert.equal(age.display(profile, 'fr', '2026-06-01'), '');
    assert.equal(age.isBirthday(profile, '2026-06-01'), false);
  }
  const estimate = {estimatedAge: {years: 3, months: 2, recordedOn: '2026-01-01'}};
  age.validate(estimate); age.display(estimate, 'fr', '2026-06-01');
  assert.equal(Object.hasOwn(estimate, 'birthDate'), false);
});
test('new dates reject future birthdays but stored calendar dates can be read after clock changes', () => {
  assert.throws(() => age.validate({birthDate: '2026-06-02'}, {today: '2026-06-01'}), error => error.code === 'age.futureDate');
  assert.equal(age.validate({birthDate: '2026-06-02'}, {today: '2026-06-01', allowFuture: true}), true);
  assert.equal(age.validate({birthDate: '2026-06-01'}, {today: '2026-06-01'}), true);
  assert.equal(age.display({birthDate: '2026-06-02'}, 'fr', '2026-06-01'), '');
  assert.equal(age.isBirthday({birthDate: '2027-06-01'}, '2026-06-01'), false);
});
test('computed age progresses with the calendar without mutating the original profile', () => {
  const profile = {birthDate: '2024-04-20'}, before = JSON.stringify(profile);
  assert.deepEqual(age.ageParts(profile, '2025-04-19'), {years: 0, months: 11, days: 364, estimated: false});
  assert.deepEqual(age.ageParts(profile, '2025-04-20'), {years: 1, months: 0, days: 365, estimated: false});
  assert.deepEqual(age.ageParts(profile, '2025-10-20'), {years: 1, months: 6, days: 548, estimated: false});
  assert.equal(JSON.stringify(profile), before);
});
test('young animals show months and days where relevant, adults years', () => {
  assert.equal(age.display({birthDate: '2026-05-31'}, 'fr', '2026-06-01'), '1\u00a0jour');
  assert.equal(age.display({birthDate: '2026-05-31'}, 'fr', '2026-06-30'), '1\u00a0mois');
  assert.equal(age.display({birthDate: '2025-01-10'}, 'fr', '2026-04-10'), '1\u00a0an 3\u00a0mois');
  assert.equal(age.display({birthDate: '2023-01-10'}, 'fr', '2026-04-10'), '3 ans');
  assert.equal(age.display({birthDate: '2026-06-01'}, 'fr', '2026-06-01'), '0\u00a0jour');
});
test('unit translations use native pluralization for all five interface languages', () => {
  const profile = {birthDate: '2025-01-10'};
  const expected = {fr: '1\u00a0an 3\u00a0mois', en: '1 year 3 months', es: '1 año 3 meses', de: '1 Jahr 3 Monate', it: '1 anno 3 mesi'};
  for (const [locale, text] of Object.entries(expected)) assert.equal(age.display(profile, locale, '2026-04-10'), text);
});
test('estimated age stays an explicitly entered estimate, without a fictitious birthday', () => {
  const profile = {estimatedAge: {years: 1, months: 7, recordedOn: '2025-01-01', extra: 'keep'}};
  const before = JSON.stringify(profile);
  assert.equal(age.display(profile, 'en', '2026-06-01'), '1 year 7 months');
  assert.equal(age.isBirthday(profile, '2026-01-01'), false);
  assert.equal(JSON.stringify(profile), before);
});
test('estimated age validates whole years, months and recording calendar day', () => {
  const valid = {years: 0, months: 0, recordedOn: '2026-01-01'};
  age.validate({estimatedAge: valid});
  for (const patch of [{years: -1}, {years: 1.2}, {years: '1'}, {years: Number.MAX_SAFE_INTEGER + 1}, {months: 12}, {months: -1}, {months: 1.2}, {recordedOn: '2026-02-30'}, {recordedOn: null}]) assert.throws(() => age.validate({estimatedAge: {...valid, ...patch}}), error => error.code === 'age.invalidEstimate');
  for (const estimatedAge of [[], false, '2', {}]) assert.throws(() => age.validate({estimatedAge}));
  assert.throws(() => age.validate({birthDate: '2020-01-01', estimatedAge: valid}), /Choisis/);
});
test('birthday banner is restricted to the matching local calendar day', () => {
  const profile = {birthDate: '2020-07-12'};
  assert.equal(age.isBirthday(profile, '2026-07-11'), false);
  assert.equal(age.isBirthday(profile, '2026-07-12'), true);
  assert.equal(age.isBirthday(profile, '2026-07-13'), false);
  assert.equal(age.isBirthday(profile, new Date(2026, 6, 12, 0, 1)), true);
});
test('February 29 birthdays use February 28 only in non-leap years', () => {
  const profile = {birthDate: '2020-02-29'};
  for (const [date, expected] of [['2024-02-28', false], ['2024-02-29', true], ['2024-03-01', false], ['2025-02-28', true], ['2025-03-01', false], ['2100-02-28', true], ['2400-02-28', false], ['2400-02-29', true]]) assert.equal(age.isBirthday(profile, date), expected, date);
  assert.equal(age.ageParts(profile, '2021-02-28').years, 1);
});
