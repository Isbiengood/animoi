/* Optional profile metadata. Reading a legacy profile never writes or migrates it. */
(function (root) {
  'use strict';
  const languages = ['fr', 'en', 'es', 'de', 'it'];
  const traitRows = [
    ['playful', 'Joueur', 'Playful', 'Juguetón', 'Verspielt', 'Giocherellone'],
    ['affectionate', 'Affectueux', 'Affectionate', 'Cariñoso', 'Zuneigungsvoll', 'Affettuoso'],
    ['curious', 'Curieux', 'Curious', 'Curioso', 'Neugierig', 'Curioso'],
    ['calm', 'Calme', 'Calm', 'Tranquilo', 'Ruhig', 'Calmo'],
    ['mischievous', 'Espiègle', 'Mischievous', 'Travieso', 'Lausbübisch', 'Birichino'],
    ['fearful', 'Craintif', 'Fearful', 'Temeroso', 'Ängstlich', 'Pauroso'],
    ['sociable', 'Sociable', 'Sociable', 'Sociable', 'Gesellig', 'Socievole'],
    ['independent', 'Indépendant', 'Independent', 'Independiente', 'Unabhängig', 'Indipendente'],
    ['food-loving', 'Gourmand', 'Food-loving', 'Goloso', 'Naschhaft', 'Goloso'],
    ['energetic', 'Énergique', 'Energetic', 'Enérgico', 'Energisch', 'Energico'],
    ['stubborn', 'Têtu', 'Stubborn', 'Terco', 'Stur', 'Testardo'],
    ['protective', 'Protecteur', 'Protective', 'Protector', 'Beschützend', 'Protettivo'],
    ['gentle', 'Doux', 'Gentle', 'Dulce', 'Sanft', 'Dolce'],
    ['shy', 'Timide', 'Shy', 'Tímido', 'Schüchtern', 'Timido'],
    ['bold', 'Audacieux', 'Bold', 'Audaz', 'Mutig', 'Audace'],
    ['cautious', 'Prudent', 'Cautious', 'Prudente', 'Vorsichtig', 'Prudente'],
    ['adventurous', 'Aventureux', 'Adventurous', 'Aventurero', 'Abenteuerlustig', 'Avventuroso'],
    ['loyal', 'Fidèle', 'Loyal', 'Leal', 'Treu', 'Fedele'],
    ['patient', 'Patient', 'Patient', 'Paciente', 'Geduldig', 'Paziente'],
    ['sensitive', 'Sensible', 'Sensitive', 'Sensible', 'Sensibel', 'Sensibile'],
    ['intelligent', 'Intelligent', 'Intelligent', 'Inteligente', 'Intelligent', 'Intelligente'],
    ['clever', 'Malin', 'Clever', 'Astuto', 'Pfiffig', 'Astuto'],
    ['obedient', 'Obéissant', 'Obedient', 'Obediente', 'Gehorsam', 'Obbediente'],
    ['vocal', 'Bavard', 'Vocal', 'Comunicativo', 'Mitteilungsfreudig', 'Chiacchierone'],
    ['quiet', 'Discret', 'Quiet', 'Discreto', 'Still', 'Discreto'],
    ['territorial', 'Territorial', 'Territorial', 'Territorial', 'Territorial', 'Territoriale'],
    ['watchful', 'Vigilant', 'Watchful', 'Vigilante', 'Wachsam', 'Vigile'],
    ['cuddly', 'Câlin', 'Cuddly', 'Mimoso', 'Kuschelig', 'Coccolone'],
    ['reserved', 'Réservé', 'Reserved', 'Reservado', 'Zurückhaltend', 'Riservato'],
    ['confident', 'Sûr de lui', 'Confident', 'Seguro de sí mismo', 'Selbstbewusst', 'Sicuro di sé'],
    ['anxious', 'Anxieux', 'Anxious', 'Ansioso', 'Nervös', 'Ansioso'],
    ['adaptable', 'Adaptable', 'Adaptable', 'Adaptable', 'Anpassungsfähig', 'Adattabile'],
    ['excitable', 'Facilement enthousiaste', 'Excitable', 'Entusiasta', 'Leicht begeisterbar', 'Entusiasta'],
    ['relaxed', 'Détendu', 'Relaxed', 'Relajado', 'Entspannt', 'Rilassato'],
    ['active', 'Actif', 'Active', 'Activo', 'Aktiv', 'Attivo'],
    ['sleepy', 'Gros dormeur', 'Sleepy', 'Dormilón', 'Schlafmützig', 'Dormiglione'],
    ['agile', 'Agile', 'Agile', 'Ágil', 'Flink', 'Agile'],
    ['clumsy', 'Maladroit', 'Clumsy', 'Torpe', 'Tollpatschig', 'Goffo'],
    ['determined', 'Déterminé', 'Determined', 'Decidido', 'Entschlossen', 'Determinato'],
    ['distractible', 'Facilement distrait', 'Easily distracted', 'Distraído', 'Leicht ablenkbar', 'Facilmente distratto'],
    ['attentive', 'Attentif', 'Attentive', 'Atento', 'Aufmerksam', 'Attento'],
    ['competitive', 'Compétitif', 'Competitive', 'Competitivo', 'Wetteifernd', 'Competitivo'],
    ['cooperative', 'Coopératif', 'Cooperative', 'Cooperativo', 'Kooperativ', 'Collaborativo'],
    ['tolerant', 'Tolérant', 'Tolerant', 'Tolerante', 'Tolerant', 'Tollerante'],
    ['possessive', 'Possessif', 'Possessive', 'Posesivo', 'Besitzergreifend', 'Possessivo'],
    ['exploratory', 'Explorateur', 'Exploratory', 'Explorador', 'Erkundungsfreudig', 'Esploratore'],
    ['routine-loving', 'Attaché à ses habitudes', 'Routine-loving', 'Amante de la rutina', 'Gewohnheitsliebend', 'Amante della routine'],
    ['water-loving', 'Amateur d’eau', 'Water-loving', 'Amante del agua', 'Wasserliebend', 'Amante dell’acqua'],
    ['clingy', 'Très attaché à son humain', 'Very attached to their human', 'Muy apegado a su humano', 'Sehr menschenbezogen', 'Molto legato al suo umano'],
    ['proud', 'Fier', 'Proud', 'Orgulloso', 'Stolz', 'Fiero'],
    ['trusting', 'Confiant', 'Trusting', 'Confiado', 'Zutraulich', 'Fiducioso'],
    ['unpredictable', 'Imprévisible', 'Unpredictable', 'Impredecible', 'Unberechenbar', 'Imprevedibile']
  ];
  // These short labels and translations are authored for Ani’Moi, independently of breed sources.
  const traits = Object.freeze(traitRows.map(([id, ...values]) => Object.freeze({
    id, labels: Object.freeze(Object.fromEntries(languages.map((code, index) => [code, values[index]])))
  })));
  const statuses = {
    other: ['Autre', 'Other', 'Otra', 'Andere', 'Altra'],
    unknown: ['Inconnue', 'Unknown', 'Desconocida', 'Unbekannt', 'Sconosciuta'],
    none: ['Sans race définie', 'No defined breed', 'Sin raza definida', 'Keine bestimmte Rasse', 'Senza razza definita'],
    'not-applicable': ['Race non applicable', 'Breed not applicable', 'Raza no aplicable', 'Rasse nicht zutreffend', 'Razza non applicabile']
  };
  const validStatuses = new Set(['selected', ...Object.keys(statuses)]);
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
  const customControls = /[\u0000-\u001f\u007f]/;
  const localeCode = locale => {
    const code = String(locale || root.AniMoiI18n?.locale || 'fr').toLowerCase().split('-')[0];
    return languages.includes(code) ? code : 'fr';
  };
  function label(entry, locale) {
    if (typeof entry === 'string') entry = traits.find(trait => trait.id === entry) || {id: entry};
    if (!entry) return '';
    const labels = entry.labels;
    return labels && (labels[localeCode(locale)] || labels.fr) || entry.id || '';
  }
  function statusLabel(status, locale) {
    return statuses[status]?.[languages.indexOf(localeCode(locale))] || '';
  }
  function breedChoice(breed) {
    const status = typeof breed === 'string' ? breed : breed?.status;
    if (status === 'other') return 'selected';
    if (status === 'none') return 'unknown';
    return ['selected', 'unknown', 'not-applicable'].includes(status) ? status : 'unknown';
  }
  function validate(value) {
    const fail = () => { throw new Error('Caractéristiques du profil invalides.'); };
    if (!isObject(value) || value.version !== 1 || !isObject(value.breed) || !isObject(value.temperament)) fail();
    function ids(items, limit) {
      if (!Array.isArray(items) || items.length > limit || items.some(id => typeof id !== 'string' || !idPattern.test(id)) || new Set(items).size !== items.length) fail();
    }
    function custom(items, limit) {
      if (!Array.isArray(items) || items.length > limit || items.some(text => typeof text !== 'string' || !text.trim() || text.length > 200 || customControls.test(text)) || new Set(items).size !== items.length) fail();
    }
    const {breed, temperament} = value;
    // Imported historical text follows the original unrestricted string contract;
    // it must remain editable alongside new bounded catalogue choices.
    if (temperament.legacyText !== undefined && typeof temperament.legacyText !== 'string') fail();
    function validateBreed(selection, archived = false) {
      if (!isObject(selection) || !validStatuses.has(selection.status)) fail();
      if (selection.legacyText !== undefined && typeof selection.legacyText !== 'string') fail();
      ids(selection.ids, 20); custom(selection.custom, 20);
      if (selection.primaryId !== null && (typeof selection.primaryId !== 'string' || !selection.ids.includes(selection.primaryId))) fail();
      if (selection.status !== 'selected' && (selection.ids.length || selection.primaryId !== null)) fail();
      if (selection.status !== 'selected' && selection.status !== 'other' && selection.custom.length) fail();
      if (selection.legacyText !== undefined && selection.status !== 'selected' && selection.status !== 'other') fail();
      if (archived && Object.hasOwn(selection, 'retainedSelection')) fail();
      if (!archived && selection.retainedSelection !== undefined) {
        if (breedChoice(selection) === 'selected') fail();
        validateBreed(selection.retainedSelection, true);
      }
    }
    validateBreed(breed);
    ids(temperament.ids, 80); custom(temperament.custom, 40);
    if (temperament.dominant !== undefined) {
      const choices = new Set([...temperament.ids.map(id => 'id:' + id), ...temperament.custom.map(text => 'custom:' + text), ...(temperament.legacyText ? ['legacy'] : [])]);
      if (!Array.isArray(temperament.dominant) || temperament.dominant.length > 3 || new Set(temperament.dominant).size !== temperament.dominant.length || temperament.dominant.some(ref => !choices.has(ref))) fail();
    }
    if (value.speciesDetail !== undefined && (!isObject(value.speciesDetail) || typeof value.speciesDetail.species !== 'string' || typeof value.speciesDetail.text !== 'string' || value.speciesDetail.text.length > 200 || customControls.test(value.speciesDetail.text))) fail();
    if (value.speciesDetail?.catalogueId !== undefined && (typeof value.speciesDetail.catalogueId !== 'string' || !idPattern.test(value.speciesDetail.catalogueId))) fail();
    return true;
  }
  function setBreedChoice(value, choice) {
    validate(value);
    if (!['selected', 'unknown', 'not-applicable'].includes(choice)) throw new Error('Choix de race invalide.');
    const result = JSON.parse(JSON.stringify(value));
    if (breedChoice(result.breed) === choice) return result;
    if (choice === 'selected') {
      const previous = result.breed.retainedSelection;
      if (previous) result.breed = {...result.breed, ...previous, status: 'selected'};
      else result.breed.status = 'selected';
      delete result.breed.retainedSelection;
    } else {
      if (breedChoice(result.breed) === 'selected') {
        const snapshot = {...result.breed};
        delete snapshot.retainedSelection;
        result.breed.retainedSelection = snapshot;
      }
      result.breed.status = choice;
      result.breed.ids = [];
      result.breed.primaryId = null;
      result.breed.custom = [];
      delete result.breed.legacyText;
    }
    validate(result);
    return result;
  }
  function read(pet) {
    if (pet?.characteristics !== undefined) {
      validate(pet.characteristics);
      // Clone rather than mutate, including unknown extension fields from a future compatible client.
      return JSON.parse(JSON.stringify(pet.characteristics));
    }
    const breed = typeof pet?.breed === 'string' ? pet.breed : '';
    const temperament = typeof pet?.traits === 'string' ? pet.traits : '';
    function legacyChoice(text) {
      if (!text.trim()) return {custom: []};
      if (text.length > 200 || customControls.test(text)) return {custom: [], legacyText: text};
      return {custom: [text]};
    }
    return {
      version: 1,
      breed: {status: breed.trim() ? 'other' : 'unknown', ids: [], primaryId: null, ...legacyChoice(breed)},
      temperament: {ids: [], ...legacyChoice(temperament)}
    };
  }
  function breedEntries(species) {
    const catalogue = root.AniMoiBreeds;
    if (!catalogue) return [];
    const group = typeof catalogue.forSpecies === 'function' ? catalogue.forSpecies(species) : catalogue.species?.[species];
    const current = Array.isArray(group) ? group : group?.entries || [];
    // Keep an intelligible label after a species correction or an imported catalogue extension.
    const others = Object.values(catalogue.species || {}).flatMap(item => Array.isArray(item) ? item : item?.entries || []);
    return [...current, ...others];
  }
  function breedLabels(pet, locale) {
    const {breed} = read(pet), entries = breedEntries(pet?.species);
    const detail = speciesDetail(pet, locale);
    if (detail) return [detail];
    const ids = breed.primaryId ? [breed.primaryId, ...breed.ids.filter(id => id !== breed.primaryId)] : breed.ids;
    const labels = [...ids.map(id => label(entries.find(entry => entry.id === id) || {id}, locale)), ...breed.custom, ...(breed.legacyText ? [breed.legacyText] : [])];
    return labels.length ? labels : [statusLabel(breed.status, locale)].filter(Boolean);
  }
  function traitLabels(pet, locale) {
    return traitChoices(pet, locale).map(choice => choice.label);
  }
  function activeSpeciesDetail(pet) {
    const value = read(pet), detail = value.speciesDetail;
    return detail && detail.species === pet?.species && breedChoice(value.breed) === 'not-applicable' ? detail : null;
  }
  function speciesEntry(pet) {
    const detail = activeSpeciesDetail(pet);
    if (!detail?.catalogueId) return null;
    const group = root.AniMoiSpecies?.species?.[detail.species];
    const entries = Array.isArray(group) ? group : group?.entries || [];
    return entries.find(entry => entry.id === detail.catalogueId) || null;
  }
  function speciesDetail(pet, locale) {
    const detail = activeSpeciesDetail(pet);
    if (!detail) return '';
    const entry = speciesEntry(pet);
    return entry ? label(entry, locale) : detail.text;
  }
  function traitChoices(pet, locale) {
    const {temperament} = read(pet);
    return [
      ...temperament.ids.map(id => ({key: 'id:' + id, label: label(id, locale)})),
      ...temperament.custom.map(text => ({key: 'custom:' + text, label: text})),
      ...(temperament.legacyText ? [{key: 'legacy', label: temperament.legacyText}] : [])
    ];
  }
  function dominantLabels(pet, locale) {
    const {temperament} = read(pet), choices = traitChoices(pet, locale);
    return (temperament.dominant || []).map(ref => choices.find(choice => choice.key === ref).label);
  }
  function prioritizedLabels(pet, locale) {
    const {temperament} = read(pet), choices = traitChoices(pet, locale), dominant = temperament.dominant || [];
    return [...dominant.map(ref => choices.find(choice => choice.key === ref)), ...choices.filter(choice => !dominant.includes(choice.key))].map(choice => choice.label);
  }
  function display(pet, locale) {
    return {breed: breedLabels(pet, locale).join(' × '), traits: traitLabels(pet, locale).join(', ')};
  }
  function toAIContext(pet, locale) {
    const value = read(pet);
    const activeBreed = {...value.breed};
    delete activeBreed.retainedSelection;
    const detail = activeSpeciesDetail(pet), entry = speciesEntry(pet);
    return {
      version: 1,
      locale: localeCode(locale),
      species: typeof pet?.species === 'string' ? pet.species : '',
      speciesDetail: speciesDetail(pet, locale),
      speciesDetailSelection: detail ? {species: detail.species, catalogueId: detail.catalogueId || null, label: speciesDetail(pet, locale), text: detail.text, kind: entry?.kind || null, scientificName: entry?.scientificName || null} : null,
      breed: {...activeBreed, status: breedChoice(value.breed), labels: breedLabels(pet, locale)},
      temperament: {...value.temperament, labels: traitLabels(pet, locale), dominantLabels: dominantLabels(pet, locale), prioritizedLabels: prioritizedLabels(pet, locale)},
      legacy: {breed: typeof pet?.breed === 'string' ? pet.breed : '', traits: typeof pet?.traits === 'string' ? pet.traits : ''}
    };
  }
  const api = {traits, validate, read, normalize: read, label, statusLabel, breedChoice, setBreedChoice, breedLabels, traitLabels, speciesDetail, speciesEntry, traitChoices, dominantLabels, prioritizedLabels, display, toAIContext};
  root.AniMoiCharacteristics = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
