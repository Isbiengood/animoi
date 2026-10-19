/* Local repository boundary: replace this adapter when a server API is introduced. */
(function (root) {
  'use strict';
  const PETS = 'animoi-pets-v1', POSTS = 'animoi-posts-v2', JOURNAL = 'animoi-transaction-v1', SETTINGS = 'animoi-settings-v1';
  const defaults = () => ({language:'fr',learningConsent:false});
  const languageTag = value => typeof value==='string' && /^(?:und|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(value);
  function createRepository(storage) {
    function recover() {
      const pending = storage.getItem(JOURNAL);
      if (!pending) return;
      const old = JSON.parse(pending);
      for (const key of [PETS, POSTS, SETTINGS]) {
        if (!Object.hasOwn(old,key)) continue;
        if (old[key] === null) storage.removeItem(key); else storage.setItem(key, old[key]);
      }
      storage.removeItem(JOURNAL);
    }
    function read() {
      recover();
      const state = {pets: JSON.parse(storage.getItem(PETS) || '[]'), posts: JSON.parse(storage.getItem(POSTS) || '[]'), settings: JSON.parse(storage.getItem(SETTINGS) || JSON.stringify(defaults()))};
      validate(state);
      return state;
    }
    function write(state) {
      validate(state); recover();
      const old = {[PETS]: storage.getItem(PETS), [POSTS]: storage.getItem(POSTS), [SETTINGS]:storage.getItem(SETTINGS)};
      storage.setItem(JOURNAL, JSON.stringify(old));
      try {
        storage.setItem(PETS, JSON.stringify(state.pets));
        storage.setItem(POSTS, JSON.stringify(state.posts));
        storage.setItem(SETTINGS, JSON.stringify(state.settings || defaults()));
        storage.removeItem(JOURNAL);
      } catch (error) {
        try { recover(); } catch { throw new Error('Écriture interrompue. Données sauvegardées dans le journal de récupération ; libère de l’espace puis recharge.'); }
        throw error;
      }
    }
    return {read, write, validate, exportData() {return JSON.stringify({app:'AniMoi',version:2,exportedAt:new Date().toISOString(),...read()},null,2);},
      restore(text) {const data=JSON.parse(text);if(data.app!=='AniMoi'||![1,2].includes(data.version))throw new Error('Format de sauvegarde non reconnu.');validate(data);write({pets:data.pets,posts:data.posts,settings:{...(data.settings || read().settings),learningConsent:false}});},
      deletePet(id) {const state=read();state.pets=state.pets.filter(p=>p.id!==id);state.posts=state.posts.filter(p=>p.petId!==id);write(state);}
    };
  }
  function validate(state) {
    if (!state || typeof state!=='object') throw new Error('Données invalides.');
    if (state.settings!==undefined && (!state.settings || !languageTag(state.settings.language) || typeof state.settings.learningConsent!=='boolean')) throw new Error('Préférences invalides.');
    for (const key of ['pets','posts']) {
      if (!Array.isArray(state[key])) throw new Error('Données invalides : '+key);
      const ids=new Set();
      for (const item of state[key]) {
        if (!item || typeof item.id!=='string' || !item.id || ids.has(item.id)) throw new Error('Identifiant absent ou dupliqué.');
        ids.add(item.id);
        const fields=key==='pets'?['name','species','breed','traits','photo']:['petId','text'];
        if(fields.some(field=>typeof item[field]!=='string'))throw new Error('Champs invalides : '+key);
        if(key==='posts'&&item.originalLanguage!==undefined&&!languageTag(item.originalLanguage))throw new Error('Langue originale invalide.');
        if(key==='posts'&&(!Number.isFinite(item.date)||item.date<0||item.date>8640000000000000))throw new Error('Date invalide.');
      }
    }
    // Legacy orphan posts are preserved in backups; never discard them during validation.
  }
  const api={createRepository,validate};
  if(typeof module!=='undefined')module.exports=api;
  if(root.document) {
    root.AniMoiData=createRepository(root.localStorage);
    try {root.AniMoiData.read();} catch(error) {
      document.addEventListener('DOMContentLoaded',()=>{document.querySelector('main').replaceChildren(Object.assign(document.createElement('p'),{textContent:'Données locales illisibles. Aucun remplacement automatique. '+error.message}));});
      throw error;
    }
  }
})(globalThis);
