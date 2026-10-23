(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const i18n = AniMoiI18n;
  const main = document.querySelector('main');
  const initial = [...main.querySelectorAll(':scope > section.panel')];
  if (initial.length < 3) return;
  const [profile, composer, preview] = initial;
  let currentScreen, draftPetId = null, editingPost = null, draftHashtags = null, draftLanguage = i18n.locale, networkScreen = null, renderNetwork = null;
  let draftPhoto = '', postPhotoEpoch = 0, postPhotoPending = false;
  let nextStoryRubric = null;
  const humor = AniMoiHumor.mount(composer, 'composerHumor');
  $('tones').after(humor.element);
  AniMoiHumor.composer = humor;
  function refreshHumor(reset = false) {
    const amusing = AniMoiHumor.isAmusing(document.querySelector('#tones input:checked')?.value);
    humor.element.hidden = !amusing;
    if (reset && amusing) humor.value = 'funny';
  }
  $('tones').addEventListener('change', () => refreshHumor(true));
  refreshHumor();


  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function ui(tag, key, cls) { return i18n.bind(el(tag, null, cls), key); }
  function action(key, handler, secondary = false, id) {
    const node = ui('button', key, secondary ? 'secondary' : '');
    node.type = 'button'; node.onclick = handler;
    if (id) node.id = id;
    return node;
  }
  function section(id) {
    const node = el('section', null, 'panel v2-screen');
    node.id = id; node.hidden = true; main.insertBefore(node, profile);
    return node;
  }
  const home = section('homeScreen');
  const animal = section('animalScreen');
  const account = section('accountScreen');
  const chooser = section('adventureChooser');
  for (const screen of initial) screen.classList.add('v2-screen');

  const nav = el('nav', null, 'v2-nav');
  i18n.bind(nav, 'nav.label', 'aria-label');
  const primaryNav = el('div', null, 'primary-nav');
  function navAction(icon, key, handler, id) {
    const button = el('button', null, 'secondary'); button.type = 'button'; button.id = id;
    const symbol = el('span', icon, 'nav-icon'); symbol.setAttribute('aria-hidden', 'true');
    button.append(symbol, ui('span', key, 'nav-label')); button.onclick = handler;
    return button;
  }
  const homeButton = navAction('🐾', 'nav.animals', () => { renderHome(); show(home); }, 'openHome');
  const networkButton = navAction('👥', 'nav.network', () => { if (networkScreen) { renderNetwork(); show(networkScreen); } }, 'openNetwork');
  networkButton.disabled = true;
  const accountButton = navAction('👤', 'nav.profile', openAccount, 'openAccount');
  primaryNav.append(homeButton, networkButton, accountButton);
  const languageDock = el('div', null, 'language-dock');
  nav.append(primaryNav, languageDock); main.insertBefore(nav, home);

  const languageNames = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano' };
  const flags = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹' };
  const languageBar = el('div', null, 'language-bar');
  languageBar.setAttribute('role', 'group'); i18n.bind(languageBar, 'language.label', 'aria-label');
  for (const code of i18n.languages) {
    const button = el('button', null, 'language-button'); button.type = 'button';
    button.dataset.language = code; button.lang = code;
    button.setAttribute('aria-label', languageNames[code] || code); button.title = languageNames[code] || code;
    const flag = el('span', flags[code] || '🌐', 'language-flag'); flag.setAttribute('aria-hidden', 'true');
    const short = el('span', code.toUpperCase(), 'language-code'); short.setAttribute('aria-hidden', 'true');
    button.append(flag, short); button.onclick = () => changeLanguage(code); languageBar.append(button);
  }
  languageDock.append(languageBar);
  function updateFlags() {
    for (const button of languageBar.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.language === i18n.locale));
  }
  function changeLanguage(code) {
    try {
      const state = AniMoiData.read();
      AniMoiData.write({ ...state, settings: { ...state.settings, language: code } });
      i18n.setLocale(code);
    } catch (error) { alert(i18n.t('error.languageSave', { error: error.message })); }
    updateFlags();
  }
  updateFlags();

  const homeLead = el('div', null, 'home-lead');
  const homeTitle = el('div', null, 'home-title-row');
  homeTitle.append(ui('h1', 'home.animals'), action('home.addShort', addAnimal, true, 'addAnimal'));
  homeLead.append(homeTitle, ui('p', 'home.subtitle', 'v2-muted'));
  const cards = el('div', null, 'v2-grid'); cards.id = 'petCards';
  const homeActions = el('div', null, 'home-actions');
  homeActions.append(action('home.adventure', tellAdventure, false, 'tellAdventure'));
  home.append(homeLead, cards, homeActions, ui('p', 'home.local', 'v2-muted home-storage'));

  animal.append(action('pet.back', () => show(home), true));
  const summary = el('div', null, 'animal-summary');
  const animalActions = el('div', null, 'buttons');
  animalActions.append(action('pet.newStory', startStory, false, 'newStory'), action('pet.edit', openEditProfile, true));
  const historyTitle = ui('h2', 'pet.posts'); historyTitle.id = 'historyTitle'; historyTitle.tabIndex = -1;
  const historyCount = el('p', null, 'v2-muted'); historyCount.id = 'petPostCount'; historyCount.setAttribute('aria-live', 'polite');
  const classificationStatus = el('p', null, 'v2-muted'); classificationStatus.id = 'classificationStatus'; classificationStatus.setAttribute('aria-live', 'polite');
  const history = el('div'); history.id = 'petHistory';
  const historyTranslations = [];
  animal.append(summary, animalActions, historyTitle, historyCount, classificationStatus, history);
  chooser.append(ui('h1', 'home.chooseAnimal'), ui('p', 'home.chooseHint', 'v2-muted'));
  const adventurePets = el('div', null, 'adventure-pets'); adventurePets.id = 'adventurePets';
  chooser.append(adventurePets, action('pet.back', () => show(home), true));
  const composerAnimal = el('p', null, 'composer-animal'); composerAnimal.id = 'composerAnimal';
  composer.querySelector('h2').after(composerAnimal);
  composer.prepend(action('composer.back', () => { renderAnimal(); show(animal); }, true));
  preview.prepend(action('preview.back', () => { if (editingPost) { renderAnimal(); show(animal); } else show(composer); }, true));
  $('copy').before(action('post.save', savePost, false, 'savePost'));

  const photoFields = el('div', null, 'post-photo-fields'); photoFields.id = 'postPhotoFields';
  const photoLabel = ui('label', 'postPhoto.label'); photoLabel.htmlFor = 'postPhotoFile';
  const photoInput = el('input'); photoInput.type = 'file'; photoInput.id = 'postPhotoFile'; photoInput.accept = 'image/*';
  photoInput.setAttribute('aria-describedby', 'postPhotoHint postPhotoFeedback');
  const photoHint = ui('p', 'postPhoto.hint', 'v2-muted'); photoHint.id = 'postPhotoHint';
  const photoPreview = el('img', null, 'post-photo'); photoPreview.id = 'postAttachmentPreview'; photoPreview.hidden = true;
  i18n.bind(photoPreview, 'postPhoto.preview', 'alt');
  const removePhoto = action('postPhoto.remove', () => setDraftPhoto(''), true, 'removePostPhoto'); removePhoto.hidden = true;
  const photoFeedback = el('p', null, 'v2-muted'); photoFeedback.id = 'postPhotoFeedback'; photoFeedback.setAttribute('aria-live', 'polite');
  photoFields.append(photoLabel, photoInput, photoHint, photoPreview, removePhoto, photoFeedback);
  $('editPost').after(photoFields);
  const hashtagRecovery = el('div', null, 'hashtag-recovery');
  const restoreHashtags = action('hashtags.restore', () => {
    const pet = pets().find(p => p.id === draftPetId);
    if (!pet || draftPetId !== activeId()) return alert(i18n.t('hashtags.restoreMissingAnimal'));
    $('editPost').value = AniMoiPublications.restoreSuggestedHashtags($('editPost').value, pet.species, i18n.locale);
    // Explicitly restored tokens belong to the author, including in a new draft.
    $('editPost').dispatchEvent(new Event('input'));
    $('feedback').textContent = i18n.t('hashtags.restored');
  }, true, 'restoreHashtags');
  const recoveryHint = ui('p', 'hashtags.restoreHint', 'v2-muted'); recoveryHint.id = 'hashtagRecoveryHint';
  restoreHashtags.setAttribute('aria-describedby', recoveryHint.id);
  hashtagRecovery.append(restoreHashtags, recoveryHint); photoFields.before(hashtagRecovery);
  AniMoiPublicationFields.mount(preview, photoFields);
  function updatePhotoControls() {
    const visible = AniMoiPostPhoto.isRenderable(draftPhoto);
    photoPreview.hidden = !visible;
    if (visible) photoPreview.src = draftPhoto; else photoPreview.removeAttribute('src');
    removePhoto.hidden = !draftPhoto && !postPhotoPending;
    photoFields.setAttribute('aria-busy', String(postPhotoPending));
    $('savePost').disabled = postPhotoPending; $('share').disabled = postPhotoPending;
  }
  function photoMessage(key) {
    photoFeedback.removeAttribute('data-i18n');
    if (key) i18n.bind(photoFeedback, key); else photoFeedback.textContent = '';
  }
  function setDraftPhoto(value) {
    postPhotoEpoch++; postPhotoPending = false; draftPhoto = value || ''; photoInput.value = '';
    photoMessage(); updatePhotoControls(); resetImage();
    document.dispatchEvent(new Event('animoi:post-photo-changed'));
  }
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0], epoch = ++postPhotoEpoch, owner = draftPetId, editingId = editingPost?.id;
    postPhotoPending = !!file; photoMessage(file ? 'postPhoto.loading' : null); updatePhotoControls();
    if (!file) return;
    try {
      const photo = await AniMoiPostPhoto.prepare(file);
      if (epoch !== postPhotoEpoch || owner !== draftPetId || editingId !== editingPost?.id) return;
      draftPhoto = photo; photoMessage(); resetImage();
      document.dispatchEvent(new Event('animoi:post-photo-changed'));
    } catch (error) {
      if (epoch === postPhotoEpoch) photoMessage({'photo.invalid':'postPhoto.invalid', 'photo.tooLarge':'postPhoto.tooLarge'}[error.code] || 'postPhoto.unreadable');
    } finally {
      if (epoch === postPhotoEpoch) { postPhotoPending = false; photoInput.value = ''; updatePhotoControls(); }
    }
  });

  // One local personal field; no account credentials or server identity are collected.
  account.append(ui('h1', 'account.title'), ui('p', 'account.local', 'v2-muted'));
  const accountForm = el('form', null, 'account-section');
  accountForm.append(ui('h2', 'account.personal'));
  const nameLabel = ui('label', 'account.name'); nameLabel.htmlFor = 'accountName';
  const nameInput = el('input'); nameInput.id = 'accountName'; nameInput.maxLength = 80; nameInput.autocomplete = 'nickname';
  const saveAccount = action('account.save', null, false, 'saveAccount'); saveAccount.type = 'submit';
  const accountFeedback = el('p', null, 'v2-muted'); accountFeedback.id = 'accountFeedback'; accountFeedback.setAttribute('aria-live', 'polite');
  accountForm.append(nameLabel, nameInput, saveAccount, accountFeedback);
  accountForm.onsubmit = event => {
    event.preventDefault();
    try {
      const state = AniMoiData.read();
      AniMoiData.write({ ...state, settings: { ...state.settings, account: { displayName: nameInput.value.trim() } } });
      i18n.bind(accountFeedback, 'account.saved');
    } catch (error) {
      accountFeedback.removeAttribute('data-i18n'); accountFeedback.textContent = i18n.t('account.saveError', { error: error.message });
    }
  };
  const settings = el('section', null, 'account-section');
  settings.append(ui('h2', 'account.preferences'), ui('p', 'language.label', 'setting-label'));
  const accountLanguages = el('div', null, 'account-languages'); settings.append(accountLanguages, ui('p', 'account.preferencesHint', 'v2-muted'));
  const translationPreference = el('label', null, 'translation-preference'); translationPreference.htmlFor = 'autoTranslate';
  const autoTranslate = el('input'); autoTranslate.type = 'checkbox'; autoTranslate.id = 'autoTranslate';
  autoTranslate.checked = AniMoiData.read().settings.autoTranslate === true;
  const translationPreferenceHint = ui('p', 'translation.preferenceHint', 'v2-muted'); translationPreferenceHint.id = 'translationPreferenceHint';
  autoTranslate.setAttribute('aria-describedby', translationPreferenceHint.id);
  const translationPreferenceFeedback = el('p', null, 'v2-muted'); translationPreferenceFeedback.id = 'translationPreferenceFeedback'; translationPreferenceFeedback.setAttribute('aria-live', 'polite');
  translationPreference.append(autoTranslate, ui('span', 'translation.preference'));
  settings.append(translationPreference, translationPreferenceHint, translationPreferenceFeedback);
  autoTranslate.onchange = () => {
    const state = AniMoiData.read();
    try {
      AniMoiData.write({ ...state, settings: { ...state.settings, autoTranslate: autoTranslate.checked } });
      if (autoTranslate.checked && !AniMoiTranslation.available) i18n.bind(translationPreferenceFeedback, 'translation.unavailable');
      else { translationPreferenceFeedback.textContent = ''; translationPreferenceFeedback.removeAttribute('data-i18n'); }
      renderAnimal(); if (renderNetwork) renderNetwork();
    } catch (error) {
      autoTranslate.checked = state.settings.autoTranslate === true;
      translationPreferenceFeedback.removeAttribute('data-i18n');
      translationPreferenceFeedback.textContent = i18n.t('translation.preferenceError', { error: error.message });
    }
  };
  const backupSection = el('section', null, 'account-section');
  backupSection.append(ui('h2', 'account.data'), ui('p', 'account.backupHint', 'v2-muted'));
  const backupActions = el('div', null, 'buttons');
  const restoreInput = el('input'); restoreInput.id = 'restoreFile'; restoreInput.type = 'file'; restoreInput.accept = '.json,application/json'; restoreInput.hidden = true;
  backupActions.append(action('nav.export', () => { try { downloadBackup(); } catch (error) { alert(error.message); } }, true), action('nav.restore', () => restoreInput.click(), true));
  backupSection.append(backupActions, restoreInput);
  const privacy = el('section', null, 'account-section');
  privacy.append(ui('h2', 'account.privacy'), ui('p', 'account.privacyBody', 'v2-muted'));
  privacy.append(ui('p', 'rubrics.ownerNotice', 'v2-muted'));
  account.append(accountForm, settings, backupSection, privacy);
  function openAccount() {
    nameInput.value = AniMoiData.read().settings.account?.displayName || '';
    autoTranslate.checked = AniMoiData.read().settings.autoTranslate === true;
    translationPreferenceFeedback.textContent = ''; translationPreferenceFeedback.removeAttribute('data-i18n');
    accountFeedback.textContent = ''; accountFeedback.removeAttribute('data-i18n'); show(account);
  }

  function setDraftLanguage(language) {
    draftLanguage = language || i18n.locale;
    $('output').lang = draftLanguage; $('editPost').lang = draftLanguage;
  }
  function resetImage() {
    $('cardCanvas').style.display = 'none'; $('downloadArea').style.display = 'none';
    if ($('imageTools')) $('imageTools').open = false;
  }
  function updateComposerAnimal() {
    const pet = pets().find(p => p.id === activeId());
    composerAnimal.textContent = pet ? i18n.t('composer.selectedAnimal', { name: pet.name }) : '';
  }
  function fitEditor() {
    if (preview.hidden) return;
    const editor = $('editPost');
    editor.style.height = 'auto';
    editor.style.height = Math.max(340, editor.scrollHeight + 4) + 'px';
  }

  function pets() { return AniMoiData.read().pets; }
  function activeId() { return $('animalSelect').value; }
  function selectPet(pet) { $('animalSelect').value = pet.id; $('animalSelect').dispatchEvent(new Event('change')); }
  function addAnimal() { beginAnimal(); setProfileMode('new'); show(profile); $('petName').focus(); }
  function choose(pet) { selectPet(pet); renderAnimal(); show(animal); }
  function startStory() {
    if (!pets().some(p => p.id === activeId())) return tellAdventure();
    draftPetId = activeId(); editingPost = null; draftHashtags = null; setDraftLanguage(i18n.locale);
    i18n.bind($('savePost'), 'post.save');
    $('story').value = ''; $('editPost').value = ''; refreshHumor(true);
    $('rubric').value = nextStoryRubric || 'pawbook'; nextStoryRubric = null;
    setDraftPhoto('');
    $('output').textContent = i18n.t('home.storyPrompt'); $('feedback').textContent = '';
    resetImage(); updateComposerAnimal(); show(composer);
  }
  function tellAdventure(preserveRubric = false) {
    if (preserveRubric !== true) nextStoryRubric = null;
    const list = pets();
    if (!list.length) { renderHome(); show(home); $('addAnimal').focus(); return; }
    if (list.length === 1) { selectPet(list[0]); return startStory(); }
    adventurePets.replaceChildren();
    for (const pet of list) {
      const button = el('button', null, 'adventure-pet secondary'); button.type = 'button'; button.dataset.petId = pet.id;
      if (pet.photo) { const img = el('img'); img.src = pet.photo; img.alt = ''; button.append(img); }
      else { const icon = el('span', '🐾', 'chooser-emoji'); icon.setAttribute('aria-hidden', 'true'); button.append(icon); }
      button.append(el('span', pet.name)); button.onclick = () => { selectPet(pet); startStory(); }; adventurePets.append(button);
    }
    show(chooser);
  }
  const profileTitle = profile.querySelector('h2');
  const selectLabel = profile.querySelector('label[for="animalSelect"]');
  function setProfileMode(mode) {
    const creating = mode === 'new';
    i18n.bind(profileTitle, creating ? 'profile.new' : 'profile.edit'); i18n.bind(selectLabel, 'profile.choose');
    selectLabel.hidden = creating; selectLabel.style.display = creating ? 'none' : '';
    $('animalSelect').hidden = creating; $('deletePet').hidden = creating;
    i18n.bind($('savePet'), creating ? 'profile.create' : 'profile.save');
  }
  function openEditProfile() {
    const existing = pets().find(p => p.id === activeId()) || pets()[0];
    if (!existing) { renderHome(); show(home); $('addAnimal').focus(); return; }
    selectPet(existing); setProfileMode('edit'); show(profile);
  }
  function show(screen) {
    if (screen === home) nextStoryRubric = null;
    const changing = currentScreen !== screen;
    currentScreen = screen;
    for (const section of main.querySelectorAll(':scope > section.panel')) section.hidden = section !== screen;
    if (screen === preview) fitEditor();
    const languageTarget = screen === account ? accountLanguages : languageDock;
    if (languageBar.parentNode !== languageTarget) languageTarget.append(languageBar);
    homeButton.setAttribute('aria-current', screen !== account && screen !== networkScreen ? 'page' : 'false');
    networkButton.setAttribute('aria-current', screen === networkScreen ? 'page' : 'false');
    accountButton.setAttribute('aria-current', screen === account ? 'page' : 'false');
    window.scrollTo(0, 0);
    if (changing) { const heading = screen.querySelector('h1,h2'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }
  }
  // Shared screen navigation keeps communities and account settings from hiding each other.
  window.AniMoiNavigation = { open: show, registerNetwork(screen, render) { networkScreen = screen; renderNetwork = render; networkButton.disabled = false; } };
  function renderHome() {
    cards.replaceChildren();
    const state = AniMoiData.read();
    const orphans = state.posts.filter(post => !state.pets.some(pet => pet.id === post.petId));
    if (orphans.length) cards.append(el('p', i18n.t('home.orphans', { count: orphans.length }), 'v2-muted full-width'));
    if (!state.pets.length) {
      const empty = el('div', null, 'empty-pets'); const paw = el('div', '🐾', 'empty-paw'); paw.setAttribute('aria-hidden', 'true');
      empty.append(paw, ui('h2', 'home.emptyTitle'), ui('p', 'home.emptyHint', 'v2-muted')); cards.append(empty);
    }
    for (const pet of state.pets) {
      const card = el('article', null, 'v2-card'); card.dataset.petId = pet.id;
      const open = el('button', null, 'pet-open'); open.type = 'button'; open.setAttribute('aria-label', i18n.t('home.openPet', { name: pet.name }));
      if (pet.photo) { const img = el('img'); img.src = pet.photo; img.alt = ''; open.append(img); }
      else { const icon = el('div', '🐾', 'v2-emoji'); icon.setAttribute('aria-hidden', 'true'); open.append(icon); }
      const caption = el('div', null, 'pet-caption'); const cardName = el('strong', pet.name); cardName.id = 'pet-card-name-' + cards.childElementCount; caption.append(cardName, el('small', [pet.species, pet.characteristics ? AniMoiCharacteristics.display(pet, i18n.locale).breed : pet.breed].filter(Boolean).join(' · '))); open.append(caption);
      appendAge(caption, pet);
      if (AniMoiPetAge.isBirthday(pet)) caption.append(el('small', i18n.t('age.birthday', { name: pet.name }), 'pet-birthday'));
      open.onclick = () => choose(pet);
      const actions = el('div', null, 'card-actions');
      const edit = action('home.edit', () => { selectPet(pet); openEditProfile(); }, true); edit.classList.add('pet-edit'); edit.setAttribute('aria-label', i18n.t('home.editPet', { name: pet.name }));
      const count = state.posts.filter(post => post.petId === pet.id).length;
      const posts = el('button', i18n.t('home.publications', { count }), 'secondary pet-posts'); posts.type = 'button'; posts.setAttribute('aria-label', i18n.t('home.petPublications', { name: pet.name }));
      posts.onclick = () => { choose(pet); historyTitle.focus(); historyTitle.scrollIntoView({ block: 'start' }); };
      actions.append(edit, posts); card.append(open, actions); cards.append(card);
    }
  }
  function renderAnimal() {
    for (const controller of historyTranslations.splice(0)) controller.destroy();
    const pet = pets().find(p => p.id === activeId()); if (!pet) return;
    summary.replaceChildren(); const head = el('div', null, 'animal');
    if (pet.photo) { const img = el('img', null, 'avatar'); img.src = pet.photo; img.alt = pet.name; head.append(img); }
    else head.append(el('div', '🐾', 'avatar'));
    const display = pet.characteristics ? AniMoiCharacteristics.display(pet, i18n.locale) : pet;
    const details = el('div', null, 'animal-details'); details.append(el('h2', pet.name), el('p', [pet.species, display.breed].filter(Boolean).join(' · '), 'v2-muted')); head.append(details); summary.append(head);
    appendAge(details, pet);
    history.replaceChildren(); const mine = AniMoiData.read().posts.filter(post => post.petId === activeId()).sort((a, b) => b.date - a.date);
    historyCount.textContent = i18n.t('home.publications', { count: mine.length });
    if (!mine.length) history.append(ui('p', 'post.empty', 'v2-muted'));
    for (const post of mine) {
      const view = createPublicationCard(post, pet, 'history');
      history.append(view.element); historyTranslations.push(view);
    }
  }
  function canEditLocalPost(post) {
    return post.rubric !== 'potins' || !post.editorial || post.editorial.status === 'draft';
  }
  function localProposalContext() {
    // Explicit prototype scope only. No hosting identity or real account is inferred.
    return {role:'owner', actorId:'local-prototype', ownerId:'local-prototype', source:'local-prototype'};
  }
  function currentCardPost(post, pet, view, context) {
    const state = AniMoiData.read(), current = state.posts.find(p => p.id === post.id && p.petId === pet.id);
    if (!current || !AniMoiPermissions.localOwner(current, pet, state) || (context === 'history' && activeId() !== pet.id)) {
      view.feedback.textContent = i18n.t('error.postMissing'); return null;
    }
    if (JSON.stringify(current) !== JSON.stringify(post)) {
      view.feedback.textContent = i18n.t('error.postChanged'); return null;
    }
    return current;
  }
  function createPublicationCard(post, pet, context = 'network') {
    const owned = AniMoiPermissions.localOwner(post, pet, AniMoiData.read());
    const actions = owned ? {
      edit: view => {
        const current = currentCardPost(post, pet, view, context); if (!current) return;
        if (!canEditLocalPost(current)) { view.feedback.textContent = i18n.t('rubrics.pendingReadOnly'); return; }
        if (activeId() !== pet.id) selectPet(pet);
        editExistingPost(current.id, pet.id);
      },
      share: view => {
        const current = currentCardPost(post, pet, view, context); if (!current) return;
        view.translation?.showOriginal();
        return AniMoiPublications.shareText(current.text, {feedback:view.feedback, editor:view.text, photo:current.photo});
      },
      remove: view => {
        if (!currentCardPost(post, pet, view, context)) return;
        requestPostDeletion(post.id, pet.id, view.element.querySelector('.post-delete'));
      }
    } : {};
    if (owned && post.rubric !== 'potins') actions.classify = view => {
      const current = currentCardPost(post, pet, view, context); if (!current) return;
      if (activeId() !== pet.id) selectPet(pet);
      editExistingPost(current.id, pet.id);
      $('postRubric').focus();
    };
    const view = AniMoiPublicationCard.create({post, pet, context, actions});
    if (post.rubric === 'potins' && post.editorial) {
      const controls = el('div', null, 'buttons editorial-controls');
      const ownerContext = localProposalContext();
      for (const [target, key, cls] of [['pending','rubrics.submitProposal','proposal-submit'], ['draft','rubrics.returnDraft','proposal-return-draft'], ['archived','rubrics.archiveProposal','proposal-archive']]) {
        if (!owned || !AniMoiGazette.canTransition(post, target, ownerContext)) continue;
        const button = action(key, () => {
          const current = currentCardPost(post, pet, view, context); if (!current) return;
          try {
            const state = AniMoiData.read(), index = state.posts.findIndex(p => p.id === current.id && p.petId === pet.id);
            if (index < 0 || JSON.stringify(state.posts[index]) !== JSON.stringify(current)) throw new Error(i18n.t('error.postChanged'));
            state.posts[index] = AniMoiGazette.transition(current, target, ownerContext);
            AniMoiData.write(state);
            renderHome(); renderAnimal(); if (renderNetwork) renderNetwork();
          } catch (error) { view.feedback.textContent = i18n.t('rubrics.gazetteChangeFailed', {error:error.message}); }
        }, true);
        button.classList.add(cls); controls.append(button);
      }
      for (const key of ['rubrics.gazetteReview','rubrics.gazettePublish']) {
        const button = action(key, null, true); button.disabled = true;
        button.title = i18n.t('rubrics.editorialDisabled'); controls.append(button);
      }
      view.element.append(controls);
    }
    return view;
  }

  function appendAge(target, pet) {
    const age = AniMoiPetAge.display(pet, i18n.locale);
    if (age) target.append(el('small', i18n.t(pet.estimatedAge && !pet.birthDate ? 'age.estimated' : 'age.calculated', { age }), 'pet-age'));
  }
  function editExistingPost(id, petId) {
    const post = AniMoiData.read().posts.find(p => p.id === id && p.petId === petId);
    if (!post || activeId() !== petId) return alert(i18n.t('error.postMissing'));
    if (!canEditLocalPost(post)) return alert(i18n.t(post.editorial?.status === 'archived' ? 'rubrics.gazetteArchivedReadOnly' : 'rubrics.pendingReadOnly'));
    editingPost = { id: post.id, petId, snapshot: JSON.stringify(post), text: post.text, originalLanguage: post.originalLanguage };
    draftPetId = petId; draftHashtags = null; setDraftLanguage(post.originalLanguage || 'und');
    $('editPost').value = post.text; $('output').textContent = post.text; $('feedback').textContent = '';
    editingPost.editorText = $('editPost').value;
    setDraftPhoto(post.photo);
    AniMoiPublicationFields.load(post);
    i18n.bind($('savePost'), 'post.update');
    resetImage(); updateByline(); $('editPost').dispatchEvent(new Event('input')); show(preview);
  }
  function savePost() {
    if (postPhotoPending) return photoMessage('postPhoto.wait');
    const rawText = $('editPost').value;
    // Classification or photo-only edits never normalize a historical original.
    const originalUnchanged = editingPost && rawText === editingPost.editorText;
    const text = originalUnchanged ? editingPost.text : AniMoiPublications.dedupeHashtags(rawText).trim();
    if (!text && !originalUnchanged) return alert(i18n.t('error.emptyPost'));
    if (draftPetId !== activeId()) return alert(i18n.t('error.draftAnimal'));
    if (!pets().some(p => p.id === activeId())) return alert(i18n.t('error.selectPet'));
    const classificationChanged = !!editingPost && !!AniMoiPublicationFields.rubric && AniMoiPublicationFields.rubric !== JSON.parse(editingPost.snapshot).rubric;
    try {
      const state = AniMoiData.read();
      const metadata = AniMoiPublicationFields.values();
      if (editingPost) {
        const index = state.posts.findIndex(post => post.id === editingPost.id && post.petId === draftPetId);
        if (index < 0 || editingPost.petId !== draftPetId) return alert(i18n.t('error.postMissing'));
        const existing = state.posts[index];
        if (!canEditLocalPost(existing)) return alert(i18n.t('rubrics.pendingReadOnly'));
        if (JSON.stringify(existing) !== editingPost.snapshot) return alert(i18n.t('error.postChanged'));
        const metadataChanged = Object.keys(metadata).some(key => JSON.stringify(metadata[key]) !== JSON.stringify(existing[key]));
        if (text !== existing.text || draftPhoto !== (existing.photo || '') || metadataChanged) {
          const updated = { ...existing, ...metadata, text, editedAt: Date.now() };
          if (text !== existing.text) updated.originalLanguage = AniMoiPublications.detectLanguage(text, existing.originalLanguage || i18n.locale);
          if (draftPhoto) updated.photo = draftPhoto; else delete updated.photo;
          state.posts[index] = updated;
        }
        AniMoiData.write(state);
      } else {
        let post = { id: 'post-' + crypto.randomUUID(), petId: draftPetId, text, originalLanguage: draftLanguage, date: Date.now(), ...metadata };
        if (draftPhoto) post.photo = draftPhoto;
        if (post.rubric === 'potins') post = AniMoiGazette.start(post);
        AniMoiData.write({ ...state, posts: [...state.posts, post] });
      }
    } catch (error) { return alert(classificationChanged ? i18n.t('classify.error', {error:error.message}) : 'Enregistrement annulé : ' + error.message); }
    editingPost = null; draftPetId = null; draftHashtags = null; renderAnimal(); renderHome(); if (renderNetwork) renderNetwork(); show(animal);
    if (classificationChanged) i18n.bind(classificationStatus, 'classify.saved');
    else { classificationStatus.removeAttribute('data-i18n'); classificationStatus.textContent = ''; }
  }
  // Capture runs before the base generator: a changed selection cannot retarget a draft.
  $('generate').addEventListener('click', event => {
    if (!draftPetId || draftPetId !== activeId() || !pets().some(p => p.id === draftPetId)) {
      event.stopImmediatePropagation(); alert(i18n.t('error.draftAnimal'));
    }
  }, true);
  $('generate').addEventListener('click', () => {
    if ($('story').value.trim() && $('editPost').value.trim()) {
      const pet = pets().find(p => p.id === draftPetId);
      $('editPost').value = AniMoiPublications.withDefaultHashtags($('editPost').value, pet.species, i18n.locale);
      $('output').textContent = $('editPost').value;
      editingPost = null; setDraftLanguage(AniMoiPublications.detectLanguage($('story').value, i18n.locale));
      AniMoiPublicationFields.load(null, {isNew:true, rubric:$('rubric').value, tone:document.querySelector('#tones input:checked')?.value, humorVariant:humor.value});
      draftHashtags = AniMoiPublications.createHashtagDraft($('editPost').value, pet.species, i18n.locale, $('story').value);
      updateSaveLabel(); resetImage(); show(preview);
      $('feedback').textContent = i18n.t('composer.ready');
    }
  });
  function updateSaveLabel() {
    i18n.bind($('savePost'), editingPost ? 'post.update' : AniMoiPublicationFields.rubric === 'potins' ? 'rubrics.saveProposal' : 'post.save');
  }
  $('postRubric').addEventListener('change', updateSaveLabel);
  $('editPost').addEventListener('input', () => {
    if (!editingPost && draftHashtags) draftHashtags = AniMoiPublications.observeHashtagDraft($('editPost').value, draftHashtags);
    fitEditor();
  });
  window.addEventListener('resize', fitEditor);
  $('copy').onclick = () => AniMoiPublications.copyText($('editPost').value, { feedback: $('feedback'), editor: $('editPost') });
  $('share').onclick = () => {
    if (postPhotoPending) return photoMessage('postPhoto.wait');
    if (draftPetId !== activeId() || !pets().some(p => p.id === draftPetId)) return alert(i18n.t('error.draftAnimal'));
    return AniMoiPublications.shareText($('editPost').value, { feedback: $('feedback'), editor: $('editPost'), photo: draftPhoto });
  };
  $('animalSelect').addEventListener('change', () => { renderAnimal(); updateComposerAnimal(); });
  document.addEventListener('animoi:pet-saved', () => { renderHome(); const pet = pets().find(p => p.id === activeId()); if (pet) choose(pet); else show(home); });
  // The destructive operation is reachable only through an open confirmation dialog.
  const deleteDialog = el('dialog', null, 'delete-dialog'); deleteDialog.id = 'deleteAnimalDialog';
  deleteDialog.setAttribute('aria-labelledby', 'deleteAnimalTitle'); deleteDialog.setAttribute('aria-describedby', 'deleteAnimalMessage');
  const deleteTitle = ui('h2', 'delete.title'); deleteTitle.id = 'deleteAnimalTitle';
  const deleteMessage = el('p'); deleteMessage.id = 'deleteAnimalMessage';
  const backupHint = ui('p', 'delete.backupHint', 'v2-muted');
  const deleteFeedback = el('p', null, 'v2-muted'); deleteFeedback.id = 'deleteFeedback'; deleteFeedback.setAttribute('aria-live', 'polite');
  const backupBeforeDelete = action('delete.backup', () => {
    if (!deleteDialog.open || !pendingDeleteId) return;
    try { downloadBackup(); i18n.bind(deleteFeedback, 'delete.backupStarted'); }
    catch (error) { deleteFeedback.removeAttribute('data-i18n'); deleteFeedback.textContent = i18n.t('delete.backupError', { error: error.message }); }
  }, true, 'backupBeforeDelete');
  const deleteChoices = el('div', null, 'delete-choices');
  const cancelDelete = action('delete.cancel', () => deleteDialog.close('cancel'), true, 'cancelDelete'); cancelDelete.autofocus = true;
  const confirmDelete = action('delete.confirm', () => {
    if (!deleteDialog.open || !pendingDeleteId) return;
    confirmDelete.disabled = true;
    try {
      if (!pets().some(p => p.id === pendingDeleteId)) {
        i18n.bind(deleteFeedback, 'delete.missing'); return;
      }
      AniMoiData.deletePet(pendingDeleteId);
    } catch (error) {
      deleteFeedback.removeAttribute('data-i18n'); deleteFeedback.textContent = i18n.t('delete.error', { error: error.message });
      confirmDelete.disabled = false; return;
    }
    deleteDialog.close('deleted'); location.reload();
  }, false, 'confirmDelete'); confirmDelete.className = 'danger';
  deleteChoices.append(cancelDelete, confirmDelete);
  deleteDialog.append(deleteTitle, deleteMessage, backupHint, backupBeforeDelete, deleteFeedback, deleteChoices); document.body.append(deleteDialog);
  let pendingDeleteId = null, deletionTrigger = null;
  function requestDeletion(id, trigger) {
    if (deleteDialog.open) return;
    const pet = pets().find(p => p.id === id); if (!pet) return;
    pendingDeleteId = id; deletionTrigger = trigger;
    deleteMessage.textContent = i18n.t('delete.message', { name: pet.name });
    deleteFeedback.textContent = ''; deleteFeedback.removeAttribute('data-i18n'); confirmDelete.disabled = false;
    deleteDialog.showModal(); cancelDelete.focus();
  }
  deleteDialog.addEventListener('close', () => {
    pendingDeleteId = null; deleteFeedback.textContent = ''; deleteFeedback.removeAttribute('data-i18n');
    if (deletionTrigger?.isConnected) deletionTrigger.focus(); else homeButton.focus();
    deletionTrigger = null;
  });
  deleteDialog.addEventListener('cancel', () => { pendingDeleteId = null; });
  i18n.bind($('deletePet'), 'delete.label');
  $('deletePet').onclick = () => requestDeletion(activeId(), $('deletePet'));
  // This confirmation has its own fixed publication target and never calls deletePet.
  const postDeleteDialog = el('dialog', null, 'delete-dialog'); postDeleteDialog.id = 'deletePostDialog';
  postDeleteDialog.setAttribute('aria-labelledby', 'postDeleteTitle'); postDeleteDialog.setAttribute('aria-describedby', 'postDeleteMessage');
  const postDeleteTitle = ui('h2', 'postDelete.title'); postDeleteTitle.id = 'postDeleteTitle';
  const postDeleteMessage = el('p'); postDeleteMessage.id = 'postDeleteMessage';
  const postDeleteExcerpt = el('blockquote', null, 'post-delete-excerpt'); postDeleteExcerpt.id = 'postDeleteExcerpt';
  const postDeleteFeedback = el('p', null, 'v2-muted'); postDeleteFeedback.id = 'postDeleteFeedback'; postDeleteFeedback.setAttribute('aria-live', 'polite');
  let pendingPostDelete = null, postDeleteTrigger = null;
  const backupBeforePostDelete = action('postDelete.backup', () => {
    if (!postDeleteDialog.open || !pendingPostDelete) return;
    try { downloadBackup(); i18n.bind(postDeleteFeedback, 'delete.backupStarted'); }
    catch (error) { postDeleteFeedback.removeAttribute('data-i18n'); postDeleteFeedback.textContent = i18n.t('delete.backupError', { error: error.message }); }
  }, true, 'backupBeforePostDelete');
  const cancelPostDelete = action('postDelete.cancel', () => postDeleteDialog.close('cancel'), true, 'cancelPostDelete'); cancelPostDelete.autofocus = true;
  const confirmPostDelete = action('postDelete.confirm', () => {
    if (!postDeleteDialog.open || !pendingPostDelete) return;
    confirmPostDelete.disabled = true;
    try { AniMoiData.deletePost(pendingPostDelete.id, pendingPostDelete.petId, pendingPostDelete.snapshot); }
    catch (error) {
      postDeleteFeedback.removeAttribute('data-i18n');
      const key = error.code === 'post.missing' ? 'postDelete.missing' : error.code === 'post.changed' ? 'postDelete.changed' : 'postDelete.failed';
      postDeleteFeedback.textContent = i18n.t(key, { error: error.message });
      confirmPostDelete.disabled = key !== 'postDelete.failed'; return;
    }
    postDeleteDialog.close('deleted');
    renderHome(); renderAnimal(); if (renderNetwork) renderNetwork();
    const target = currentScreen === networkScreen ? networkScreen.querySelector('h1,h2') : historyTitle;
    if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }, false, 'confirmPostDelete'); confirmPostDelete.className = 'danger';
  const postDeleteChoices = el('div', null, 'delete-choices'); postDeleteChoices.append(cancelPostDelete, confirmPostDelete);
  postDeleteDialog.append(postDeleteTitle, postDeleteMessage, postDeleteExcerpt, backupBeforePostDelete, postDeleteFeedback, postDeleteChoices); document.body.append(postDeleteDialog);
  function requestPostDeletion(id, petId, trigger) {
    if (postDeleteDialog.open) return;
    const state = AniMoiData.read(), pet = state.pets.find(pet => pet.id === petId);
    const post = state.posts.find(post => post.id === id && post.petId === petId);
    // Every currently rendered post belongs to this browser's local repository.
    // A future server adapter must enforce authenticated ownership separately.
    if (!pet || !post) return;
    pendingPostDelete = { id, petId, name: pet.name, snapshot: JSON.stringify(post) }; postDeleteTrigger = trigger;
    postDeleteMessage.textContent = i18n.t('postDelete.message', { name: pet.name }); postDeleteExcerpt.textContent = post.text;
    postDeleteFeedback.textContent = ''; postDeleteFeedback.removeAttribute('data-i18n'); confirmPostDelete.disabled = false;
    postDeleteDialog.showModal(); cancelPostDelete.focus();
  }
  postDeleteDialog.addEventListener('close', () => {
    pendingPostDelete = null;
    if (postDeleteTrigger?.isConnected) postDeleteTrigger.focus(); else homeButton.focus();
    postDeleteTrigger = null;
  });
  postDeleteDialog.addEventListener('cancel', () => { pendingPostDelete = null; });
  window.AniMoiPostActions = {
    requestDelete: requestPostDeletion,
    createCard: createPublicationCard,
    newStory(rubric) { nextStoryRubric = AniMoiRubrics.get(rubric)?.id || 'pawbook'; tellAdventure(true); }
  };
  function downloadBackup() {
    const blob = new Blob([AniMoiData.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = 'animoi-sauvegarde-' + Date.now() + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  restoreInput.onchange = async () => {
    const file = restoreInput.files[0]; if (!file) return;
    try {
      const text = await file.text(), data = JSON.parse(text);
      if (data.app !== 'AniMoi' || ![1, 2].includes(data.version)) throw new Error('Format de sauvegarde non reconnu.');
      AniMoiData.validate(data);
      if (!confirm(`Restaurer ${data.pets.length} profil(s) et ${data.posts.length} publication(s) ? Cela remplace les données locales. Une sauvegarde de l’état actuel sera téléchargée avant remplacement.`)) return;
      downloadBackup(); AniMoiData.restore(text); location.reload();
    } catch (error) { alert('Restauration annulée : ' + error.message); } finally { restoreInput.value = ''; }
  };
  document.addEventListener('animoi:locale-changed', () => {
    // Proposals in a new draft follow the UI. Saved/edited posts and author-owned
    // tags are never translated, including tags that look like a species name.
    if (!editingPost && draftHashtags && draftPetId === activeId()) {
      const updated = AniMoiPublications.updateHashtagDraft($('editPost').value, draftHashtags, i18n.locale);
      draftHashtags = updated.draft;
      if (updated.text !== $('editPost').value) {
        $('editPost').value = updated.text; $('output').textContent = updated.text;
        $('editPost').dispatchEvent(new Event('input'));
      }
    }
    renderHome(); renderAnimal(); updateFlags(); updateComposerAnimal(); fitEditor();
    if (deleteDialog.open && pendingDeleteId) { const pet = pets().find(p => p.id === pendingDeleteId); if (pet) deleteMessage.textContent = i18n.t('delete.message', { name: pet.name }); }
    if (postDeleteDialog.open && pendingPostDelete) postDeleteMessage.textContent = i18n.t('postDelete.message', { name: pendingPostDelete.name });
    if (currentScreen === chooser) tellAdventure();
  });
  // Refresh calendar-only labels without writing age values or birthday flags to storage.
  let calendarDay = AniMoiPetAge.todayString(), calendarTimer;
  function refreshCalendar() {
    const day = AniMoiPetAge.todayString();
    if (day !== calendarDay) { calendarDay = day; renderHome(); renderAnimal(); AniMoiPetAgeFields.refresh(); }
    clearTimeout(calendarTimer);
    const next = new Date(); next.setHours(24, 0, 0, 50);
    calendarTimer = setTimeout(refreshCalendar, Math.max(50, next.getTime() - Date.now()));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCalendar(); });
  window.addEventListener('pageshow', refreshCalendar);
  refreshCalendar();
  renderHome(); show(home);
})();
