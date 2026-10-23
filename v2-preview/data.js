/* Local repository boundary: replace this adapter when a server API is introduced. */
(function (root) {
  'use strict';
  const PETS = 'animoi-pets-v1', POSTS = 'animoi-posts-v2', JOURNAL = 'animoi-transaction-v1', SETTINGS = 'animoi-settings-v1';
  const characteristics = root.AniMoiCharacteristics || (typeof module !== 'undefined' ? require('./characteristics.js') : null);
  const petAge = root.AniMoiPetAge || (typeof module !== 'undefined' ? require('./pet-age.js') : null);
  const rubrics = root.AniMoiRubrics || (typeof module !== 'undefined' ? require('./rubrics.js') : null);
  const gazette = root.AniMoiGazette || (typeof module !== 'undefined' ? require('./gazette.js') : null);
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
      validate(state, {allowFutureBirthDates: true});
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
      deletePet(id) {const state=read();state.pets=state.pets.filter(p=>p.id!==id);state.posts=state.posts.filter(p=>p.petId!==id);write(state);},
      // The confirmation UI may pass JSON.stringify(post) to reject a stale deletion.
      // The expected animal is part of the lookup; an id alone cannot retarget it.
      deletePost(id, petId, expectedPost) {
        const state=read(),index=state.posts.findIndex(post=>post.id===id&&post.petId===petId);
        if(index<0)throw Object.assign(new Error('Cette publication est introuvable pour cet animal.'),{code:'post.missing'});
        const deleted=state.posts[index];
        if(expectedPost!==undefined&&expectedPost!==JSON.stringify(deleted))throw Object.assign(new Error('Cette publication a changé. Relisez-la avant de confirmer sa suppression.'),{code:'post.changed'});
        state.posts.splice(index,1);write(state);return deleted;
      }
    };
  }
  function validate(state, {allowFutureBirthDates = false} = {}) {
    if (!state || typeof state!=='object') throw new Error('Données invalides.');
    if (state.settings!==undefined && (!state.settings || !languageTag(state.settings.language) || typeof state.settings.learningConsent!=='boolean')) throw new Error('Préférences invalides.');
    if (state.settings?.autoTranslate!==undefined && typeof state.settings.autoTranslate!=='boolean') throw Object.assign(new Error('Préférence de traduction automatique invalide.'),{code:'settings.autoTranslate'});
    if (state.settings?.account!==undefined && (!state.settings.account || Array.isArray(state.settings.account) || typeof state.settings.account.displayName!=='string' || state.settings.account.displayName.length>80)) throw new Error('Informations personnelles invalides.');
    for (const key of ['pets','posts']) {
      if (!Array.isArray(state[key])) throw new Error('Données invalides : '+key);
      const ids=new Set();
      for (const item of state[key]) {
        if (!item || typeof item.id!=='string' || !item.id || ids.has(item.id)) throw new Error('Identifiant absent ou dupliqué.');
        ids.add(item.id);
        const fields=key==='pets'?['name','species','breed','traits','photo']:['petId','text'];
        if(fields.some(field=>typeof item[field]!=='string'))throw new Error('Champs invalides : '+key);
        if(key==='pets'&&(item.birthDate!==undefined||item.estimatedAge!==undefined)) {
          if(!petAge)throw new Error('Module des âges indisponible.');
          petAge.validate(item, {allowFuture: allowFutureBirthDates});
        }
        if(key==='pets'&&item.characteristics!==undefined) {
          if(!characteristics)throw new Error('Catalogue des caractéristiques indisponible.');
          characteristics.validate(item.characteristics);
        }
        if(key==='posts'&&item.originalLanguage!==undefined&&!languageTag(item.originalLanguage))throw new Error('Langue originale invalide.');
        if(key==='posts'&&(!Number.isFinite(item.date)||item.date<0||item.date>8640000000000000))throw new Error('Date invalide.');
        if(key==='posts') { rubrics?.validate(item); gazette?.validate(item); }
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
