/* Interface language is independent from the original language of a post. */
(function (root) {
  'use strict';
  const catalogs = new Map();
  let locale = 'fr';
  function register(code, messages) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) throw new Error('Invalid locale');
    catalogs.set(code, Object.freeze({...messages}));
  }
  function t(key, variables = {}) {
    const message = catalogs.get(locale)?.[key] ?? catalogs.get('fr')?.[key] ?? key;
    return message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(variables, name) ? String(variables[name]) : match);
  }
  function bind(node, key, attribute) {
    node.setAttribute(attribute ? 'data-i18n-'+attribute : 'data-i18n', key);
    if (attribute) node.setAttribute(attribute, t(key)); else node.textContent = t(key);
    return node;
  }
  function apply(scope = root.document) {
    for (const node of scope.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const attribute of ['placeholder', 'aria-label', 'title']) {
      for (const node of scope.querySelectorAll('[data-i18n-'+attribute+']')) node.setAttribute(attribute, t(node.getAttribute('data-i18n-'+attribute)));
    }
  }
  function setLocale(code) {
    locale = catalogs.has(code) ? code : 'fr';
    if (root.document) {
      root.document.documentElement.lang = locale;
      apply();
      root.document.dispatchEvent(new CustomEvent('animoi:locale-changed', {detail:{locale}}));
    }
    return locale;
  }
  const api = {register,t,bind,apply,setLocale,get locale(){return locale;},get languages(){return [...catalogs.keys()];},
    date(value){return new Intl.DateTimeFormat(locale).format(new Date(value));}};
  root.AniMoiI18n = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
