/* ============================================================
   UI — routage, rendu des vues, liaison des formulaires
   ============================================================ */

const $main = document.getElementById('main');

/* ---------------- Helpers DOM ---------------- */

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return el;
}

function clear(el) { el.innerHTML = ''; }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

/**
 * Enregistre un fichier généré côté client. Utilise la capacité "downloads"
 * de l'hôte Artifact quand elle est disponible (le clic-sur-lien classique y
 * est bloqué) ; sinon retombe sur le téléchargement navigateur habituel
 * (fichier ouvert en local, GitHub Pages, etc.).
 */
async function saveFile(filename, data, mime) {
  let downloads = null;
  if (window.claude && typeof window.claude.use === 'function') {
    try { downloads = await window.claude.use('downloads'); } catch (e) { downloads = null; }
  }
  if (downloads) {
    try {
      await downloads.save({ filename, data });
      showToast(`« ${filename} » enregistré.`);
      return;
    } catch (err) {
      if (err && err.code === 'declined') return;
      console.warn('downloads.save a échoué, tentative de téléchargement classique.', err);
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function fmtMoney(v) {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || isNaN(n)) return '';
  return n.toLocaleString('fr-FR') + ' €';
}

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return (v * 100).toFixed(0) + ' %';
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('fr-FR');
}

/* ---------------- Champ générique ---------------- */

function field({ label, value, onChange, type = 'text', auto = false, options = null, span2 = false, placeholder = '', min, max }) {
  const wrap = h('div', { class: 'field' + (auto ? ' auto' : '') + (span2 ? ' span-2' : '') });
  wrap.appendChild(h('label', {}, label));
  let input;
  if (type === 'textarea') {
    input = h('textarea');
  } else if (type === 'select') {
    input = h('select');
    input.appendChild(h('option', { value: '' }, '—'));
    (options || []).forEach(o => input.appendChild(h('option', { value: o }, o)));
  } else {
    input = h('input', { type });
    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
  }
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  if (auto) {
    input.readOnly = true;
    input.tabIndex = -1;
  } else if (onChange) {
    input.addEventListener('input', () => onChange(input.value, input));
  }
  wrap.appendChild(input);
  return wrap;
}

function sectionTitle(text) { return h('div', { class: 'section-title' }, text); }
function hint(text) { return h('div', { class: 'hint' }, text); }

function repeatList({ title, hint: hintText, values, onChange }) {
  const box = h('div', { class: 'repeat-list' });
  values.forEach((v, i) => {
    const row = h('div', { class: 'repeat-item' });
    row.appendChild(h('span', { class: 'idx' }, String(i + 1)));
    const input = h('input', { type: 'text', value: v || '', placeholder: title });
    input.addEventListener('input', () => onChange(i, input.value));
    row.appendChild(input);
    box.appendChild(row);
  });
  const wrap = h('div', {}, [hintText ? hint(hintText) : null, box]);
  return wrap;
}

function checkboxRow({ options, selected, onChange }) {
  const box = h('div', { class: 'checkbox-row' });
  options.forEach(opt => {
    const id = 'cb_' + Math.random().toString(36).slice(2);
    const cb = h('input', { type: 'checkbox', id });
    cb.checked = selected.includes(opt);
    cb.addEventListener('change', () => {
      const set = new Set(selected);
      if (cb.checked) set.add(opt); else set.delete(opt);
      onChange(Array.from(set));
    });
    const item = h('label', { class: 'checkbox-item', for: id }, [cb, document.createTextNode(opt)]);
    box.appendChild(item);
  });
  return box;
}

function badge(text, cls) { return h('span', { class: 'badge ' + cls }, text); }
function couleurBadge(c) {
  if (!c) return badge('Non qualifiée', 'badge-neutral');
  return badge(c, 'badge-' + c);
}

/* ---------------- Routeur ---------------- */

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return parts;
}

function navigate(path) { location.hash = path; }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  bindGlobalActions();
  render();
});

function bindGlobalActions() {
  document.getElementById('btn-export').addEventListener('click', () => {
    saveFile(`agent-ceng-affaires-${todayISODate()}.json`, Store.exportJSON(), 'application/json');
  });
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        showToast('Import réussi.');
        render();
      } catch (err) {
        alert('Fichier invalide : ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

function setActiveNav(section) {
  document.querySelectorAll('.topbar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === section);
  });
}

function render() {
  const parts = parseHash();
  clear($main);
  if (parts[0] === 'affaire' && parts[1]) {
    setActiveNav('dashboard');
    renderAffaireEditor($main, parts[1], parts[2] || 'identite');
  } else if (parts[0] === 'pilotage') {
    setActiveNav('pilotage');
    renderPilotage($main);
  } else if (parts[0] === 'reperes') {
    setActiveNav('reperes');
    renderReperes($main);
  } else {
    setActiveNav('dashboard');
    renderDashboard($main);
  }
}

/* ==================================================================
   DASHBOARD
   ================================================================== */

let dashboardFilters = { q: '', couleur: '', statut: '', showArchived: false };

function currentCouleur(a) {
  return a.qualification.couleurRetenue || computeCouleurSuggeree(a).couleur;
}

function renderDashboard(container) {
  const all = Store.listAffaires(true);

  const toolbar = h('div', { class: 'toolbar' });
  const search = h('input', { type: 'search', placeholder: 'Rechercher un client, un site, une référence…', value: dashboardFilters.q });
  search.addEventListener('input', () => { dashboardFilters.q = search.value; renderList(); });
  toolbar.appendChild(search);

  const selCouleur = h('select');
  [['', 'Toutes couleurs'], ['VERT', 'Vert'], ['ORANGE', 'Orange'], ['ROSE', 'Rose'], ['NONE', 'Non qualifiée']]
    .forEach(([v, l]) => selCouleur.appendChild(h('option', { value: v }, l)));
  selCouleur.value = dashboardFilters.couleur;
  selCouleur.addEventListener('change', () => { dashboardFilters.couleur = selCouleur.value; renderList(); });
  toolbar.appendChild(selCouleur);

  const selStatut = h('select');
  ['', 'En cours', 'Gagnée', 'Perdue', 'Sans suite'].forEach(v => selStatut.appendChild(h('option', { value: v }, v || 'Tous statuts')));
  selStatut.value = dashboardFilters.statut;
  selStatut.addEventListener('change', () => { dashboardFilters.statut = selStatut.value; renderList(); });
  toolbar.appendChild(selStatut);

  const archToggle = h('label', { class: 'checkbox-item' });
  const archCb = h('input', { type: 'checkbox' });
  archCb.checked = dashboardFilters.showArchived;
  archCb.addEventListener('change', () => { dashboardFilters.showArchived = archCb.checked; renderList(); });
  archToggle.appendChild(archCb);
  archToggle.appendChild(document.createTextNode(' Afficher les affaires archivées'));
  toolbar.appendChild(archToggle);

  toolbar.appendChild(h('div', { class: 'spacer' }));
  toolbar.appendChild(h('button', {
    class: 'btn btn-primary',
    onclick: () => { const a = Store.createAffaire(); navigate(`/affaire/${a.id}/identite`); }
  }, '+ Nouvelle affaire'));
  container.appendChild(toolbar);

  const kpiRow = h('div', { class: 'kpi-row' });
  const active = all.filter(a => !a.archived);
  const kpis = [
    ['Affaires actives', active.length],
    ['Vert', active.filter(a => currentCouleur(a) === 'VERT').length],
    ['Orange', active.filter(a => currentCouleur(a) === 'ORANGE').length],
    ['Rose', active.filter(a => currentCouleur(a) === 'ROSE').length],
    ['Archivées', all.filter(a => a.archived).length],
  ];
  kpis.forEach(([label, val]) => {
    kpiRow.appendChild(h('div', { class: 'kpi-card' }, [
      h('div', { class: 'kpi-value' }, String(val)),
      h('div', { class: 'kpi-label' }, label)
    ]));
  });
  container.appendChild(kpiRow);

  const listWrap = h('div', { class: 'affaire-list' });
  container.appendChild(listWrap);

  function renderList() {
    clear(listWrap);
    let items = Store.listAffaires(true).filter(a => dashboardFilters.showArchived || !a.archived);
    if (dashboardFilters.q) {
      const q = dashboardFilters.q.toLowerCase();
      items = items.filter(a => [a.identite.client, a.identite.site, a.identite.reference, a.identite.commercial]
        .join(' ').toLowerCase().includes(q));
    }
    if (dashboardFilters.couleur === 'NONE') {
      items = items.filter(a => !currentCouleur(a));
    } else if (dashboardFilters.couleur) {
      items = items.filter(a => currentCouleur(a) === dashboardFilters.couleur);
    }
    if (dashboardFilters.statut) items = items.filter(a => a.statutPipeline === dashboardFilters.statut);

    if (items.length === 0) {
      listWrap.appendChild(h('div', { class: 'empty-state' }, 'Aucune affaire ne correspond à ces critères.'));
      return;
    }

    items.forEach(a => {
      const couleur = currentCouleur(a);
      const card = h('div', { class: 'affaire-card' + (couleur ? ' couleur-' + couleur : '') + (a.archived ? ' archived' : '') });
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        navigate(`/affaire/${a.id}/identite`);
      });
      card.appendChild(h('div', { class: 'affaire-main' }, [
        h('div', { class: 'affaire-title' }, a.identite.client || '(Client non renseigné)'),
        h('div', { class: 'affaire-sub' }, [
          a.identite.site || '—', ' · ', a.identite.reference || 'sans réf.', ' · ',
          a.identite.commercial || 'commercial non renseigné',
          a.identite.montant ? ' · ' + fmtMoney(a.identite.montant) : ''
        ].join(''))
      ]));
      const meta = h('div', { class: 'affaire-meta' }, [
        couleurBadge(couleur),
        badge(a.statutPipeline, 'badge-statut'),
        a.archived ? badge('Archivée', 'badge-neutral') : null
      ]);
      card.appendChild(meta);
      const actions = h('div', { class: 'affaire-actions' });
      actions.appendChild(h('button', {
        class: 'btn btn-light btn-sm', title: 'Dupliquer',
        onclick: () => { const c = Store.duplicateAffaire(a.id); navigate(`/affaire/${c.id}/identite`); }
      }, 'Dupliquer'));
      actions.appendChild(h('button', {
        class: 'btn btn-light btn-sm', title: 'Exporter en Excel',
        onclick: () => exportAffaireToXlsx(a)
      }, 'Excel'));
      actions.appendChild(h('button', {
        class: 'btn btn-light btn-sm',
        onclick: () => { Store.setArchived(a.id, !a.archived); renderList(); showToast(a.archived ? 'Désarchivée' : 'Archivée'); }
      }, a.archived ? 'Désarchiver' : 'Archiver'));
      actions.appendChild(h('button', {
        class: 'btn btn-danger btn-sm',
        onclick: () => {
          if (confirm(`Supprimer définitivement l'affaire "${a.identite.client || 'sans nom'}" ?`)) {
            Store.removeAffaire(a.id); renderList();
          }
        }
      }, 'Supprimer'));
      card.appendChild(actions);
      listWrap.appendChild(card);
    });
  }

  renderList();
}

/* ==================================================================
   EDITEUR D'AFFAIRE
   ================================================================== */

const AFFAIRE_TABS = [
  { key: 'identite', label: "Identité affaire" },
  { key: 'rdv', label: '1. Fiche RDV' },
  { key: 'score40', label: '2. Score 40' },
  { key: 'qualification', label: '3. Qualification' },
  { key: 'mission', label: '4. Fiche Mission' }
];

function renderAffaireEditor(container, id, tab) {
  const a = Store.getAffaire(id);
  if (!a) {
    container.appendChild(h('div', { class: 'empty-state' }, [
      "Cette affaire n'existe pas ou a été supprimée. ",
      h('a', { href: '#/' }, "Retour à la liste.")
    ]));
    return;
  }

  const header = h('div', { class: 'affaire-header' });
  header.appendChild(h('div', {}, [
    h('h1', {}, a.identite.client || '(Client non renseigné)'),
    h('div', { class: 'sub' }, [
      a.identite.site || '—', ' · ', a.identite.reference || 'sans réf.',
      ' · Mise à jour ', fmtDate(a.updatedAt)
    ].join('')),
    h('div', { style: 'margin-top:8px' }, [couleurBadge(currentCouleur(a)), ' ', badge(a.statutPipeline, 'badge-statut')])
  ]));
  const actions = h('div', { class: 'affaire-header-actions' });
  const statutSel = h('select');
  ['En cours', 'Gagnée', 'Perdue', 'Sans suite'].forEach(v => statutSel.appendChild(h('option', { value: v }, v)));
  statutSel.value = a.statutPipeline;
  statutSel.addEventListener('change', () => {
    Store.updateAffaire(id, aff => { aff.statutPipeline = statutSel.value; });
  });
  actions.appendChild(statutSel);
  actions.appendChild(h('button', { class: 'btn btn-light', onclick: () => exportAffaireToXlsx(a) }, 'Exporter en Excel'));
  actions.appendChild(h('button', {
    class: 'btn btn-light',
    onclick: () => { Store.setArchived(id, !a.archived); render(); }
  }, a.archived ? 'Désarchiver' : 'Archiver'));
  actions.appendChild(h('a', { href: '#/', class: 'btn btn-light' }, '↩ Retour à la liste'));
  header.appendChild(actions);
  container.appendChild(header);

  const tabs = h('div', { class: 'tabs' });
  AFFAIRE_TABS.forEach(t => {
    tabs.appendChild(h('button', {
      class: 'tab-btn' + (t.key === tab ? ' active' : ''),
      onclick: () => navigate(`/affaire/${id}/${t.key}`)
    }, t.label));
  });
  container.appendChild(tabs);

  const panel = h('div', { class: 'panel' });
  container.appendChild(panel);

  const renderers = {
    identite: renderTabIdentite, rdv: renderTabRdv, score40: renderTabScore40,
    qualification: renderTabQualification, mission: renderTabMission
  };
  (renderers[tab] || renderTabIdentite)(panel, a, id);
}

function grid(children, cols1 = false) {
  return h('div', { class: 'field-grid' + (cols1 ? ' cols-1' : '') }, children);
}

/* ---- Onglet Identité ---- */
function renderTabIdentite(panel, a, id) {
  const upd = (k) => (v) => Store.updateAffaire(id, aff => { aff.identite[k] = v; });
  panel.appendChild(hint("Une seule saisie ici suffit pour tous les outils : client, site, référence, commercial, date, montant et déclencheur ne se retapent nulle part ailleurs."));
  panel.appendChild(grid([
    field({ label: 'Client / Prospect', value: a.identite.client, onChange: upd('client') }),
    field({ label: 'Site / Agence', value: a.identite.site, onChange: upd('site') }),
    field({ label: 'N° affaire / opportunité (Réf. CRM)', value: a.identite.reference, onChange: upd('reference') }),
    field({ label: 'Commercial en charge', value: a.identite.commercial, onChange: upd('commercial') }),
    field({ label: 'Date du rendez-vous', value: a.identite.dateRdv, onChange: upd('dateRdv'), type: 'date' }),
    field({ label: 'Montant estimé (ordre de grandeur, €)', value: a.identite.montant, onChange: upd('montant'), type: 'number' }),
    field({ label: 'Déclencheur / contexte en une phrase', value: a.identite.declencheur, onChange: upd('declencheur'), type: 'textarea', span2: true })
  ]));
}

/* ---- Onglet Fiche RDV ---- */
function renderTabRdv(panel, a, id) {
  const r = a.rdv;
  const upd = (k) => (v) => Store.updateAffaire(id, aff => { aff.rdv[k] = v; });

  panel.appendChild(sectionTitle('1 — Identification'));
  panel.appendChild(grid([
    field({ label: 'Date du rendez-vous', value: fmtDate(a.identite.dateRdv), auto: true }),
    field({ label: 'Type de rendez-vous', value: r.typeRdv, onChange: upd('typeRdv') }),
    field({ label: 'Commercial en charge', value: a.identite.commercial, auto: true }),
    field({ label: 'Ce RDV est le coup n°', value: r.coupNumero, onChange: upd('coupNumero') }),
    field({ label: 'Client / Prospect', value: a.identite.client, auto: true }),
    field({ label: 'Couleur pressentie (avant RDV)', value: r.couleurPressentie, onChange: upd('couleurPressentie'), type: 'select', options: COULEURS }),
    field({ label: 'Site / Agence', value: a.identite.site, auto: true }),
    field({ label: 'Couleur confirmée (après RDV)', value: r.couleurConfirmee, onChange: upd('couleurConfirmee'), type: 'select', options: COULEURS }),
    field({ label: 'N° affaire / opportunité liée', value: a.identite.reference, auto: true }),
    field({ label: 'Statut du RDV', value: r.statutRdv, onChange: upd('statutRdv'), type: 'select', options: ['Planifié', 'Réalisé', 'Reporté', 'Annulé'] })
  ]));

  panel.appendChild(sectionTitle("2 — L'interlocuteur (analyse à compléter)"));
  panel.appendChild(grid([
    field({ label: 'Nom et prénom', value: r.interNom, onChange: upd('interNom') }),
    field({ label: "Niveau d'influence perçu", value: r.interInfluence, onChange: upd('interInfluence'), type: 'select', options: ['Faible', 'Moyen', 'Fort'] }),
    field({ label: "Fonction dans l'organisation", value: r.interFonction, onChange: upd('interFonction') }),
    field({ label: 'Posture pressentie', value: r.interPosture, onChange: upd('interPosture'), type: 'select', options: ['Allié', 'Neutre', 'Opposant'] }),
    field({ label: 'Rôle réel dans la décision', value: r.interRole, onChange: upd('interRole') }),
    field({ label: "Pièce de l'échiquier associée", value: r.interPiece, onChange: upd('interPiece'), type: 'select', options: PIECES_ECHIQUIER }),
    field({ label: "Statut de l'identification", value: r.interStatut, onChange: upd('interStatut') })
  ]));

  panel.appendChild(sectionTitle('3 — Pourquoi ce rendez-vous ?'));
  panel.appendChild(grid([
    field({ label: 'Déclencheur du RDV', value: a.identite.declencheur, auto: true, span2: true }),
    field({ label: 'Axe de développement commercial', value: r.axeDev, onChange: upd('axeDev'), span2: true }),
    field({ label: "En quoi ce RDV s'inscrit-il dans notre stratégie ? (le coup recherché)", value: r.strategieCoup, onChange: upd('strategieCoup'), type: 'textarea', span2: true })
  ]));

  panel.appendChild(sectionTitle('4 — Enjeux supposés du client (hypothèses — jamais de « besoin », 3 maximum)'));
  panel.appendChild(repeatList({
    title: 'Enjeu supposé', values: r.enjeux,
    onChange: (i, v) => Store.updateAffaire(id, aff => { aff.rdv.enjeux[i] = v; })
  }));

  panel.appendChild(sectionTitle("5 — Objectifs de l'entretien (3 maximum)"));
  panel.appendChild(repeatList({
    title: 'Objectif recherché', values: r.objectifs,
    onChange: (i, v) => Store.updateAffaire(id, aff => { aff.rdv.objectifs[i] = v; })
  }));

  panel.appendChild(sectionTitle('6 — Informations à obtenir / valider (5 maximum)'));
  panel.appendChild(repeatList({
    title: 'Information à obtenir', values: r.infos,
    onChange: (i, v) => Store.updateAffaire(id, aff => { aff.rdv.infos[i] = v; })
  }));

  panel.appendChild(sectionTitle('7 — Résultat attendu et prochaine étape'));
  panel.appendChild(grid([
    field({ label: 'Résultat minimum acceptable (sinon le RDV a échoué)', value: r.resultatMin, onChange: upd('resultatMin'), type: 'textarea', span2: true }),
    field({ label: 'Prochaine étape proposée (action)', value: r.prochaineEtape, onChange: upd('prochaineEtape') }),
    field({ label: 'Date de la prochaine étape', value: r.dateProchaineEtape, onChange: upd('dateProchaineEtape'), type: 'date' })
  ]));

  panel.appendChild(sectionTitle('8 — À chaud, juste après le RDV'));
  panel.appendChild(grid([
    field({ label: 'Impressions libres (ressenti, ambiance, signaux faibles)', value: r.impressions, onChange: upd('impressions'), type: 'textarea', span2: true }),
    field({ label: 'Mots-clés retenus', value: r.motsCles, onChange: upd('motsCles'), span2: true })
  ]));
}

/* ---- Onglet Score 40 ---- */
function renderTabScore40(panel, a, id) {
  const s = a.score40;

  panel.appendChild(grid([
    field({ label: 'Client / Affaire', value: a.identite.client, auto: true }),
    field({ label: 'Commercial', value: a.identite.commercial, auto: true }),
    field({ label: "Date de l'évaluation", value: fmtDate(a.identite.dateRdv), auto: true }),
    field({ label: "Phase de l'affaire", value: s.phaseAffaire, onChange: v => Store.updateAffaire(id, aff => { aff.score40.phaseAffaire = v; }) })
  ]));

  panel.appendChild(sectionTitle('Grille de notation — 0 à 5 par critère (5 = la meilleure situation)'));
  const table = h('table', { class: 'data-table' });
  table.appendChild(h('tr', {}, [h('th', {}, 'Pièce'), h('th', {}, 'Critère'), h('th', {}, 'Description'), h('th', {}, 'Note /5')]));
  const totalValueEl = h('span', { class: 'value' }, String(computeScore40Total(a)));

  CRITERES_SCORE40.forEach((c, i) => {
    const numInput = h('input', { type: 'number', min: 0, max: 5, value: String(s.notes[i] ?? 0) });
    numInput.addEventListener('input', () => {
      let v = Number(numInput.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, Math.min(5, v));
      Store.updateAffaire(id, aff => { aff.score40.notes[i] = v; });
      totalValueEl.textContent = String(computeScore40Total(Store.getAffaire(id)));
    });
    table.appendChild(h('tr', {}, [
      h('td', { class: 'label-cell' }, c.piece),
      h('td', {}, c.critere),
      h('td', { class: 'desc-cell' }, c.description),
      h('td', {}, numInput)
    ]));
  });
  panel.appendChild(h('div', { class: 'table-scroll' }, table));

  panel.appendChild(h('div', { class: 'score-total-box' }, [
    h('span', {}, 'SCORE SUR 40 :'), totalValueEl,
    h('span', { class: 'note' }, "Ce score ne détermine jamais la couleur : il calibre le niveau d'étude et l'effort de chiffrage. La couleur se détermine avec l'onglet Qualification.")
  ]));

  panel.appendChild(sectionTitle('Éléments triangulés'));
  panel.appendChild(grid([
    field({ label: 'Décideurs', value: s.decideurs, onChange: v => Store.updateAffaire(id, aff => { aff.score40.decideurs = v; }) }),
    field({ label: 'Enjeux généraux (en dehors du prix)', value: s.enjeuxGeneraux, onChange: v => Store.updateAffaire(id, aff => { aff.score40.enjeuxGeneraux = v; }) }),
    field({ label: 'Budget validé', value: s.budgetValide, onChange: v => Store.updateAffaire(id, aff => { aff.score40.budgetValide = v; }) }),
    field({ label: 'Date de démarrage et délai', value: s.dateDemarrageDelai, onChange: v => Store.updateAffaire(id, aff => { aff.score40.dateDemarrageDelai = v; }) }),
    field({ label: 'Organigramme', value: s.organigramme, onChange: v => Store.updateAffaire(id, aff => { aff.score40.organigramme = v; }), span2: true })
  ]));

  panel.appendChild(sectionTitle('Identification des pièces'));
  panel.appendChild(grid(PIECES_ECHIQUIER.map(p => field({
    label: p, value: s.pieces[p], onChange: v => Store.updateAffaire(id, aff => { aff.score40.pieces[p] = v; })
  }))));

  panel.appendChild(sectionTitle('Stratégie / actions'));
  panel.appendChild(repeatList({
    title: 'Action', values: s.strategieActions,
    onChange: (i, v) => Store.updateAffaire(id, aff => { aff.score40.strategieActions[i] = v; })
  }));
}

/* ---- Onglet Qualification ---- */
function renderTabQualification(panel, a, id) {
  const q = a.qualification;

  panel.appendChild(grid([field({ label: 'Client / Affaire', value: a.identite.client, auto: true })]));

  // Créée en amont (mais insérée dans le DOM plus bas) pour que refreshSuggestion()
  // puisse être appelée en toute sécurité dès les tout premiers champs (garde-fou, étape 1).
  const suggestionBox = h('div', { class: 'suggestion-box' });
  function refreshSuggestion() {
    const s = computeCouleurSuggeree(Store.getAffaire(id));
    clear(suggestionBox);
    suggestionBox.appendChild(h('strong', {}, 'Suggestion : '));
    suggestionBox.appendChild(s.couleur ? couleurBadge(s.couleur) : document.createTextNode('—'));
    suggestionBox.appendChild(document.createTextNode(' — ' + s.motif));
  }

  panel.appendChild(sectionTitle('🛑 Garde-fou éliminatoire'));
  panel.appendChild(grid([
    field({ label: 'Litige actif avec ASI ?', value: q.litige, type: 'select', options: ['Oui', 'Non'], onChange: v => { Store.updateAffaire(id, aff => { aff.qualification.litige = v; }); refreshSuggestion(); } })
  ]));
  panel.appendChild(hint('Si Oui → ROSE forcé, quel que soit le score des étapes suivantes.'));

  panel.appendChild(sectionTitle('Étape 1 — Filtre initial (2 déclencheurs directs vers VERT)'));
  const etape1ResultEl = h('div', { class: 'note' }, computeResultatEtape1(a).texte);
  panel.appendChild(grid([
    field({
      label: 'Client déjà connu / référencé (CRM, historique) ?', value: q.clientConnu, type: 'select', options: ['Oui', 'Non'],
      onChange: v => { Store.updateAffaire(id, aff => { aff.qualification.clientConnu = v; }); etape1ResultEl.textContent = computeResultatEtape1(Store.getAffaire(id)).texte; refreshSuggestion(); }
    }),
    field({ label: "Estimation du % de chance de réussite de l'affaire", value: q.pctReussite, type: 'number', onChange: v => Store.updateAffaire(id, aff => { aff.qualification.pctReussite = v; }) }),
    field({
      label: 'Contrat cadre ou maintenance annuelle déjà en cours avec ce client ?', value: q.contratCadre, type: 'select', options: ['Oui', 'Non'],
      onChange: v => { Store.updateAffaire(id, aff => { aff.qualification.contratCadre = v; }); etape1ResultEl.textContent = computeResultatEtape1(Store.getAffaire(id)).texte; refreshSuggestion(); }
    }),
    h('div', { class: 'field' }, [h('label', {}, 'Résultat Étape 1'), etape1ResultEl])
  ]));
  panel.appendChild(hint("Un seul des deux déclencheurs suffit → VERT automatique. Sinon : passer à l'Étape 2."));

  panel.appendChild(sectionTitle("Étape 2 — Grille de qualification (si l'Étape 1 n'aboutit pas au Vert)"));
  const table = h('table', { class: 'data-table' });
  table.appendChild(h('tr', {}, [h('th', {}, 'N°'), h('th', {}, 'Question'), h('th', {}, 'Réponse'), h('th', {}, 'Pts Orange'), h('th', {}, 'Pts Rose')]));
  const totalOrangeEl = h('span', {}, '0');
  const totalRoseEl = h('span', {}, '0');

  function refreshTotaux() {
    const { orange, rose } = computeQualiTotaux(Store.getAffaire(id));
    totalOrangeEl.textContent = String(orange);
    totalRoseEl.textContent = String(rose);
    refreshSuggestion();
  }

  QUESTIONS_QUALIFICATION.forEach((question, i) => {
    const row = q.grille[i];
    const repInput = h('input', { type: 'text', value: row.reponse || '' });
    repInput.addEventListener('input', () => Store.updateAffaire(id, aff => { aff.qualification.grille[i].reponse = repInput.value; }));
    const orangeInput = h('input', { type: 'number', value: String(row.ptsOrange || 0) });
    orangeInput.addEventListener('input', () => {
      Store.updateAffaire(id, aff => { aff.qualification.grille[i].ptsOrange = Number(orangeInput.value) || 0; });
      refreshTotaux();
    });
    const roseInput = h('input', { type: 'number', value: String(row.ptsRose || 0) });
    roseInput.addEventListener('input', () => {
      Store.updateAffaire(id, aff => { aff.qualification.grille[i].ptsRose = Number(roseInput.value) || 0; });
      refreshTotaux();
    });
    table.appendChild(h('tr', {}, [
      h('td', {}, String(i + 1)), h('td', {}, question), h('td', {}, repInput), h('td', {}, orangeInput), h('td', {}, roseInput)
    ]));
  });
  table.appendChild(h('tr', { class: 'total-row' }, [
    h('td', {}, ''), h('td', {}, 'TOTAUX'), h('td', {}, ''), h('td', {}, totalOrangeEl), h('td', {}, totalRoseEl)
  ]));
  panel.appendChild(h('div', { class: 'table-scroll' }, table));
  refreshTotaux();

  panel.appendChild(suggestionBox);
  refreshSuggestion();

  panel.appendChild(sectionTitle('Étape 3 — Classification finale'));
  panel.appendChild(grid([
    field({
      label: 'Couleur retenue', value: q.couleurRetenue, type: 'select', options: COULEURS,
      onChange: v => Store.updateAffaire(id, aff => { aff.qualification.couleurRetenue = v; })
    }),
    field({ label: 'Justification en une phrase', value: q.justification, onChange: v => Store.updateAffaire(id, aff => { aff.qualification.justification = v; }), span2: true })
  ]));
}

/* ---- Onglet Fiche Mission ---- */
function renderTabMission(panel, a, id) {
  const m = a.mission;
  const upd = (k) => (v) => Store.updateAffaire(id, aff => { aff.mission[k] = v; });

  panel.appendChild(sectionTitle("0. Identité de l'affaire"));
  panel.appendChild(grid([
    field({ label: 'Affaire / Projet', value: m.affaireProjet, onChange: upd('affaireProjet') }),
    field({ label: 'Réf. CRM', value: a.identite.reference, auto: true }),
    field({ label: 'Client', value: a.identite.client, auto: true }),
    field({ label: 'Montant estimé', value: fmtMoney(a.identite.montant), auto: true }),
    field({ label: 'Site', value: a.identite.site, auto: true }),
    field({ label: 'Date remise souhaitée', value: m.dateRemiseSouhaitee, onChange: upd('dateRemiseSouhaitee'), type: 'date' }),
    field({ label: 'Commercial', value: a.identite.commercial, auto: true }),
    field({ label: 'Date RDV client', value: fmtDate(a.identite.dateRdv), auto: true })
  ]));

  panel.appendChild(sectionTitle('1. Contexte & enjeu réel'));
  panel.appendChild(grid([
    field({ label: 'Déclencheur', value: a.identite.declencheur, auto: true, span2: true }),
    field({ label: 'Enjeu dominant', value: m.enjeuDominant, onChange: upd('enjeuDominant'), span2: true })
  ]));
  panel.appendChild(h('div', { class: 'field span-2' }, [
    h('label', {}, 'Contraintes site'),
    checkboxRow({ options: CONTRAINTES_SITE_OPTIONS, selected: m.contraintesSite, onChange: v => Store.updateAffaire(id, aff => { aff.mission.contraintesSite = v; }) })
  ]));

  panel.appendChild(sectionTitle('2. Position commerciale'));
  panel.appendChild(grid([
    field({ label: 'Couleur (classification Qualification)', value: a.qualification.couleurRetenue || computeCouleurSuggeree(a).couleur, auto: true }),
    field({ label: 'Probabilité (%)', value: m.probabilite, onChange: upd('probabilite'), type: 'number' }),
    field({ label: 'Initiateur', value: m.initiateur, onChange: upd('initiateur') }),
    field({ label: 'Concurrents', value: m.concurrents, onChange: upd('concurrents') }),
    field({ label: 'Budget client', value: m.budgetClient, onChange: upd('budgetClient') }),
    field({ label: 'Pourquoi gagner ?', value: m.pourquoiGagner, onChange: upd('pourquoiGagner') })
  ]));

  panel.appendChild(sectionTitle('3. Périmètre technique'));
  panel.appendChild(grid([
    field({ label: 'Type de projet', value: m.typeProjet, onChange: upd('typeProjet') }),
    field({ label: 'Activité', value: m.activite, onChange: upd('activite') }),
    field({ label: 'Référentiel', value: m.referentiel, onChange: upd('referentiel') }),
    field({ label: 'Documents dispo', value: m.documentsDispo, onChange: upd('documentsDispo') }),
    field({ label: 'Planning client', value: m.planningClient, onChange: upd('planningClient'), span2: true })
  ]));

  panel.appendChild(sectionTitle('4. Commande au chiffreur'));
  panel.appendChild(grid([
    field({ label: 'Niveau demandé', value: m.niveauDemande, type: 'select', options: ['N1 — Enveloppe', 'N2 — Semi-détaillé', 'N3 — Détaillé'], onChange: upd('niveauDemande') }),
    field({ label: "Indice d'effort", value: m.indiceEffort, onChange: upd('indiceEffort') })
  ]));

  panel.appendChild(sectionTitle('5. Analyse de risques transmise au chiffreur'));
  panel.appendChild(grid([
    field({ label: 'Risques identifiés (impact, commentaire)', value: m.risques, onChange: upd('risques'), type: 'textarea', span2: true })
  ]));

  panel.appendChild(sectionTitle('Validation'));
  panel.appendChild(grid([
    field({ label: 'Commercial — Nom', value: m.commercialNom, onChange: upd('commercialNom') }),
    field({ label: 'Date', value: m.commercialDate, onChange: upd('commercialDate'), type: 'date' }),
    field({ label: 'Responsable commercial — Nom', value: m.respCommercialNom, onChange: upd('respCommercialNom') }),
    field({ label: 'Date', value: m.respCommercialDate, onChange: upd('respCommercialDate'), type: 'date' }),
    field({ label: 'Activation CENG', value: m.activationCENG, type: 'select', options: ['Oui', 'Non'], onChange: upd('activationCENG') })
  ]));
  panel.appendChild(hint(`Seuil CENG : activation obligatoire au-delà de 1,5 M€ HT.${isActivationCENGRequise(a) ? ' ⚠ Le montant estimé de cette affaire dépasse le seuil.' : ''}`));
}

/* ==================================================================
   PILOTAGE AGENCE (Plan Action)
   ================================================================== */

function renderPilotage(container) {
  container.appendChild(h('div', { class: 'affaire-header' }, [
    h('div', {}, [
      h('h1', {}, "♟ Plan d'action commercial & pilotage des ressources BE"),
      h('div', { class: 'sub' }, "Contexte d'agence, indépendant des affaires — historique des points de suivi.")
    ]),
    h('button', {
      class: 'btn btn-primary',
      onclick: () => { const s = Store.createSnapshot(); render(); showToast('Nouveau point de suivi créé.'); }
    }, '+ Nouveau point de suivi')
  ]));

  const snapshots = Store.listPlanAction();
  if (snapshots.length === 0) {
    container.appendChild(h('div', { class: 'empty-state' }, 'Aucun point de suivi enregistré pour le moment.'));
    return;
  }

  snapshots.forEach(s => container.appendChild(renderSnapshotCard(s)));
}

function renderSnapshotCard(s) {
  const card = h('div', { class: 'snapshot-card' });
  const labelInput = h('input', { type: 'text', placeholder: 'ex. T1 2026', value: s.label || '' });
  labelInput.addEventListener('input', () => Store.updateSnapshot(s.id, sn => { sn.label = labelInput.value; }));
  const dateInput = h('input', { type: 'date', value: s.date || '' });
  dateInput.addEventListener('input', () => Store.updateSnapshot(s.id, sn => { sn.date = dateInput.value; }));

  card.appendChild(h('div', { class: 'snapshot-card-header' }, [
    h('div', { style: 'display:flex;gap:8px;align-items:center' }, [labelInput, dateInput]),
    h('button', {
      class: 'btn btn-danger btn-sm',
      onclick: () => { if (confirm('Supprimer ce point de suivi ?')) { Store.removeSnapshot(s.id); render(); } }
    }, 'Supprimer')
  ]));

  card.appendChild(sectionTitle("Chiffre d'affaires de l'agence"));
  const restEl = h('b', {}, '');
  const pctEl = h('b', {}, '');
  function refreshCA() {
    const cur = Store.getSnapshot(s.id);
    const reste = computeReste(cur);
    const pct = computePct(cur);
    restEl.textContent = reste === null ? '—' : fmtMoney(reste);
    pctEl.textContent = pct === null ? '—' : fmtPct(pct);
  }
  card.appendChild(grid([
    field({
      label: 'Objectif de commande annuel (€)', value: s.objectifAnnuel ?? '', type: 'number',
      onChange: v => { Store.updateSnapshot(s.id, sn => { sn.objectifAnnuel = v; }); refreshCA(); }
    }),
    field({
      label: 'Réalisé à date (€)', value: s.realiseADate ?? '', type: 'number',
      onChange: v => { Store.updateSnapshot(s.id, sn => { sn.realiseADate = v; }); refreshCA(); }
    })
  ]));

  card.appendChild(h('div', { class: 'stat-line' }, [
    h('span', {}, ['Reste à engager : ', restEl]),
    h('span', {}, ['% réalisé : ', pctEl])
  ]));
  refreshCA();

  card.appendChild(sectionTitle("Heures Bureau d'Études par couleur"));
  const table = h('table', { class: 'data-table' });
  table.appendChild(h('tr', {}, [h('th', {}, 'Couleur'), h('th', {}, 'Heures prévues (trim.)'), h('th', {}, 'Heures engagées'), h('th', {}, 'Restantes / % engagé')]));
  ['ORANGE', 'VERT', 'ROSE'].forEach(couleur => {
    const entry = s.heures[couleur];
    const resultEl = h('span', {}, '—');
    function refreshHeures() {
      const cur = Store.getSnapshot(s.id).heures[couleur];
      const r = computeHeures(cur);
      resultEl.textContent = r === null ? '—' : `${r.restantes} h restantes (${fmtPct(r.pct)} engagé)`;
    }
    const prevInput = h('input', { type: 'number', value: entry.prevues ?? '' });
    prevInput.addEventListener('input', () => { Store.updateSnapshot(s.id, sn => { sn.heures[couleur].prevues = prevInput.value; }); refreshHeures(); });
    const engInput = h('input', { type: 'number', value: entry.engagees ?? '' });
    engInput.addEventListener('input', () => { Store.updateSnapshot(s.id, sn => { sn.heures[couleur].engagees = engInput.value; }); refreshHeures(); });
    refreshHeures();
    table.appendChild(h('tr', {}, [
      h('td', {}, badge(couleur, 'badge-' + couleur)), h('td', {}, prevInput), h('td', {}, engInput), h('td', {}, resultEl)
    ]));
  });
  card.appendChild(table);

  return card;
}

/* ==================================================================
   PAGES DE RÉFÉRENCE
   ================================================================== */

const ECHIQUIER_ROLES = [
  ['♔', 'Roi', "Le décideur final — PDG, DG. Rarement en contact direct : sa signature est ultime, on l'atteint via la Reine ou le Cavalier."],
  ['♕', 'Reine', "Le vrai pouvoir de décision. Budget ou signature : c'est souvent elle qui fait basculer l'affaire."],
  ['♖', 'Tour', 'La force structurelle — achats, juridique, technique. Un droit de veto par son rôle dans le déploiement.'],
  ['♗', 'Fou', "Il cherche à faire échouer la vente pour des raisons personnelles. Ne jamais l'affronter : on le neutralise en le valorisant."],
  ['♘', 'Cavalier', 'Le sponsor qui ouvre les portes, capable de sauter les obstacles hiérarchiques.'],
  ['♙', 'Pion', 'Le premier contact, nombreux et modeste en apparence — mais qui peut se transformer en pièce majeure.']
];

const REFERENTIEL_COULEURS = {
  criteres: ['OBJECTIF', 'POSTURE', 'DÉFINITION', 'CARACTÉRISTIQUES', 'ACTIONS CLÉS'],
  VERT: ['Fidélisation', 'Défensive', 'Partenaire stratégique fiable et récurrent', 'Forte récurrence • Transparence • Historique positif • Peu de concurrence', 'Référent + binôme • Visite trimestrielle • Accompagnement technique • CRM à jour'],
  ORANGE: ['Conquête', 'Développement', 'Client à potentiel à sécuriser', "Fort potentiel • Compétition forte • Besoin d'accompagnement", 'Construire un échiquier • Équipe dédiée • Visite diagnostic • Proposition différenciante'],
  ROSE: ['Volume maîtrisé', 'Opportuniste', 'Client peu fidélisé / faible visibilité', 'Commandes rares • Risque marge • Forte concurrence', 'Travail au ratio • Standardiser les offres • Challenger les coûts • Limiter le temps de chiffrage']
};

function renderReperes(container) {
  container.appendChild(h('div', { class: 'affaire-header' }, h('div', {}, [
    h('h1', {}, 'Repères — Échiquier & couleurs'),
    h('div', { class: 'sub' }, 'Fiches mémo — identiques au classeur original.')
  ])));

  container.appendChild(sectionTitleStandalone("Les six pièces de l'échiquier commercial"));
  ECHIQUIER_ROLES.forEach(([symbol, name, desc]) => {
    container.appendChild(h('div', { class: 'piece-card' }, [
      h('div', { class: 'piece-symbol' }, symbol),
      h('div', {}, [h('div', { class: 'piece-name' }, name), h('div', {}, desc)])
    ]));
  });

  container.appendChild(sectionTitleStandalone('Référentiel — méthode de segmentation commerciale'));
  const table = h('table', { class: 'ref-table' });
  table.appendChild(h('tr', {}, [h('th', {}, 'Critère'), h('th', {}, 'Client Vert'), h('th', {}, 'Client Orange'), h('th', {}, 'Client Rose')]));
  REFERENTIEL_COULEURS.criteres.forEach((crit, i) => {
    table.appendChild(h('tr', {}, [
      h('td', { class: 'crit' }, crit),
      h('td', {}, REFERENTIEL_COULEURS.VERT[i]),
      h('td', {}, REFERENTIEL_COULEURS.ORANGE[i]),
      h('td', {}, REFERENTIEL_COULEURS.ROSE[i])
    ]));
  });
  container.appendChild(h('div', { class: 'ref-table-wrap' }, table));

  container.appendChild(h('div', { class: 'rule-box' },
    "Règle de bascule : si le client est connu ET présente plus de 50 % de chance de réussite, OU s'il existe un contrat-cadre / maintenance en cours → CLIENT VERT. Sinon, la grille de qualification détermine l'orientation Orange (Must Win) ou Rose (Prospect à transformer). Un litige actif est éliminatoire et impose ROSE quel que soit le score."
  ));
}

function sectionTitleStandalone(text) {
  const el = h('div', { class: 'section-title' }, text);
  el.style.marginTop = '22px';
  return el;
}
