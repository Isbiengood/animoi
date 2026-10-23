/* Four local universes share the publication renderer and existing owner guards.
 * This browser repository is not a multiuser network or a published Gazette.
 */
(() => {
  'use strict';
  const main = document.querySelector('main'), navigation = window.AniMoiNavigation, i18n = AniMoiI18n;
  if (!main || !navigation) return;
  const rubrics = AniMoiRubrics;
  const groups = [
    { id: 'all', key: 'network.all', emoji: '🌍' },
    { id: 'chien', key: 'network.dog', emoji: '🐶' },
    { id: 'chat', key: 'network.cat', emoji: '🐱' },
    { id: 'oiseau', key: 'network.bird', emoji: '🐦' },
    { id: 'poisson', key: 'network.fish', emoji: '🐠' },
    { id: 'cheval', key: 'network.horse', emoji: '🐴' },
    { id: 'hamster', key: 'network.hamster', emoji: '🐹' },
    { id: 'lapin', key: 'network.rabbit', emoji: '🐰' },
    { id: 'other', key: 'network.other', emoji: '🐾' }
  ];
  const symbols = {pawbook:'🐾', sav:'📨', linkedin:'💼', potins:'📰'};
  function category(species) {
    const value = String(species || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (['chien', 'chat', 'hamster', 'lapin', 'poisson', 'oiseau', 'cheval'].includes(value)) return value;
    if (value === 'poissons') return 'poisson'; if (value === 'oiseaux') return 'oiseau';
    return 'other';
  }
  function el(tag, text, cls) {
    const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node;
  }
  function ui(tag, key, cls) { return i18n.bind(el(tag, null, cls), key); }
  function button(key, handler, id) {
    const node = ui('button', key, 'secondary'); node.type = 'button'; node.onclick = handler;
    if (id) node.id = id;
    return node;
  }
  const board = el('section', null, 'panel community-screen'); board.id = 'networkScreen'; board.hidden = true;
  main.insertBefore(board, main.querySelector('section.panel'));
  const title = ui('h1', 'network.title');
  const intro = ui('p', 'rubrics.networkIntro', 'v2-muted');
  const universes = el('div', null, 'universe-grid'); universes.setAttribute('role', 'group');
  i18n.bind(universes, 'rubrics.label', 'aria-label');
  const tools = el('div', null, 'network-tools');
  const all = button('rubrics.all', () => selectRubric('all'), 'networkAll');
  const historical = button('rubrics.historical', () => selectRubric('historical'), 'networkHistorical');
  const start = button('pet.newStory', () => window.AniMoiPostActions.newStory(rubrics.get(selectedRubric)?.id || 'pawbook'), 'newNetworkStory');
  start.className = 'new-network-story'; tools.append(all, historical, start);
  const heading = el('h2'); heading.id = 'networkRubricTitle';
  const tabs = el('div', null, 'community-tabs'); tabs.setAttribute('role', 'group'); i18n.bind(tabs, 'network.filter', 'aria-label');
  const count = el('p', null, 'v2-muted'); count.setAttribute('aria-live', 'polite');
  const gazette = el('div', null, 'gazette-header'); gazette.hidden = true;
  const masthead = ui('h2', 'rubrics.gazetteTitle');
  const published = ui('p', 'rubrics.gazetteEmpty', 'gazette-empty'); published.id = 'gazettePublished';
  gazette.append(masthead, ui('p', 'rubrics.gazetteSubtitle', 'gazette-subtitle'), published, ui('p', 'rubrics.editorialNotice', 'v2-muted'), ui('p', 'rubrics.editorialDisabled', 'v2-muted'));
  const proposalSection = el('section', null, 'gazette-proposals'); proposalSection.id = 'gazetteProposals';
  const proposalTitle = ui('h3', 'rubrics.localProposals'); proposalTitle.hidden = true;
  const feed = el('div'); feed.id = 'networkFeed'; proposalSection.append(proposalTitle, feed);
  const ownerNotice = ui('p', 'rubrics.ownerNotice', 'v2-muted network-owner-notice');
  board.append(title, intro, universes, tools, heading, tabs, count, gazette, proposalSection, ownerNotice);
  let selectedRubric = 'all', selectedSpecies = 'all';
  const views = [];
  function selectRubric(value) {
    selectedRubric = value; selectedSpecies = 'all'; render();
  }
  function render() {
    for (const view of views.splice(0)) view.destroy();
    board.dataset.rubric = selectedRubric;
    universes.replaceChildren();
    for (const rubric of rubrics.list) {
      const node = el('button', null, 'universe-button'); node.type = 'button'; node.dataset.rubric = rubric.id;
      const icon = el('span', symbols[rubric.id], 'universe-icon'); icon.setAttribute('aria-hidden', 'true');
      node.append(icon, ui('span', 'rubrics.short.' + rubric.id));
      node.setAttribute('aria-pressed', String(selectedRubric === rubric.id));
      node.onclick = () => selectRubric(rubric.id); universes.append(node);
    }
    all.setAttribute('aria-pressed', String(selectedRubric === 'all'));
    historical.setAttribute('aria-pressed', String(selectedRubric === 'historical'));
    heading.textContent = selectedRubric === 'all' ? i18n.t('rubrics.all') : selectedRubric === 'historical' ? i18n.t('rubrics.historical') : rubrics.label(selectedRubric, i18n.locale);
    const isGazette = selectedRubric === 'potins';
    gazette.hidden = !isGazette; proposalTitle.hidden = !isGazette; heading.hidden = isGazette;
    proposalSection.classList.toggle('gazette-proposals', isGazette);
    i18n.bind(start, isGazette ? 'rubrics.newProposal' : 'pet.newStory');
    tabs.replaceChildren();
    for (const group of groups) {
      const node = el('button', group.emoji + ' ' + i18n.t(group.key)); node.type = 'button'; node.dataset.community = group.id;
      node.setAttribute('aria-pressed', String(selectedSpecies === group.id));
      node.onclick = () => { selectedSpecies = group.id; render(); }; tabs.append(node);
    }
    const state = AniMoiData.read(), byId = new Map(state.pets.map(pet => [pet.id, pet]));
    const visible = state.posts.filter(post => byId.has(post.petId)).filter(post => {
      if (selectedRubric === 'potins') return post.rubric === 'potins';
      // All shows this local owner's accessible stories, including clearly
      // labelled private proposals. This list is never the published Gazette;
      // imported editorial metadata cannot populate its public edition above.
      if (selectedRubric === 'all') return true;
      if (selectedRubric === 'historical') return rubrics.isUnclassified(post);
      return post.rubric === selectedRubric;
    }).filter(post => selectedSpecies === 'all' || category(byId.get(post.petId).species) === selectedSpecies).sort((a, b) => b.date - a.date);
    count.textContent = i18n.t('network.count', {count:visible.length}); feed.replaceChildren();
    if (!visible.length) { feed.append(ui('p', selectedRubric === 'historical' && selectedSpecies === 'all' ? 'classify.empty' : 'rubrics.empty', 'community-empty')); return; }
    for (const post of visible) {
      const view = window.AniMoiPostActions.createCard(post, byId.get(post.petId), 'network');
      feed.append(view.element); views.push(view);
    }
  }
  navigation.registerNetwork(board, render);
  document.addEventListener('animoi:locale-changed', () => { if (!board.hidden) render(); });
  render();
})();
