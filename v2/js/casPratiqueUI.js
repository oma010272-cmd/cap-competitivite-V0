/* ============================================================
   Module "Cas pratique" — rendu UI
   ============================================================ */

const CP_TABS = [
  { key: 'configuration', label: 'Configuration' },
  { key: 'simulation', label: 'Simulation' },
  { key: 'suivi', label: 'Suivi cumulé' }
];

let cpUiState = { engagementFocus: null, affaireASelectionner: '' };

function renderCasPratique(container, subtab) {
  container.appendChild(h('div', { class: 'affaire-header' }, [
    h('div', {}, [
      h('h1', {}, 'Cas pratique — 3ᵉ demi-journée'),
      h('div', { class: 'sub' }, "Simulation pédagogique indépendante des affaires réelles — portefeuille, taux de réussite, tirage de résolution.")
    ])
  ]));

  const tabs = h('div', { class: 'tabs' });
  CP_TABS.forEach(t => {
    tabs.appendChild(h('button', {
      class: 'tab-btn' + (t.key === subtab ? ' active' : ''),
      onclick: () => navigate(`/cas-pratique/${t.key}`)
    }, t.label));
  });
  container.appendChild(tabs);

  const panel = h('div', { class: 'panel' });
  container.appendChild(panel);

  if (subtab === 'simulation') renderCpSimulation(panel);
  else if (subtab === 'suivi') renderCpSuivi(panel);
  else renderCpConfiguration(panel);
}

/* ==================================================================
   CONFIGURATION (organisateur)
   ================================================================== */

function renderCpConfiguration(panel) {
  const params = CasPratiqueStore.getParams();
  panel.appendChild(hint("À préparer avant la séance par l'organisateur : ajuster les paramètres si besoin, puis constituer le portefeuille d'affaires du dernier mois. Exportez ensuite la configuration pour la distribuer à toutes les tables (chaque poste l'importe une fois, en début de séance)."));

  panel.appendChild(sectionTitle('Coefficients €/h par couleur'));
  panel.appendChild(hint('Convertit le montant estimé d\'une affaire en heures nécessaires à son chiffrage.'));
  panel.appendChild(grid(CP_COULEURS.map(c => field({
    label: c, value: params.coeffHeure[c], type: 'number',
    onChange: v => CasPratiqueStore.updateParams(p => { p.coeffHeure[c] = Number(v) || 0; })
  }))));

  panel.appendChild(sectionTitle('Taux de réussite — bonus et malus'));
  panel.appendChild(grid([
    field({
      label: 'Points de taux par heure supplémentaire', value: params.ptsParHeureSupp, type: 'number',
      help: "Bonus appliqué par heure investie au-delà du minimum requis pour chiffrer.",
      onChange: v => CasPratiqueStore.updateParams(p => { p.ptsParHeureSupp = Number(v) || 0; })
    }),
    field({
      label: 'Plafond heures supplémentaires (h)', value: params.plafondHeuresSupp, type: 'number',
      help: "Au-delà de ce nombre d'heures, aucun bonus supplémentaire n'est comptabilisé.",
      onChange: v => CasPratiqueStore.updateParams(p => { p.plafondHeuresSupp = Number(v) || 0; })
    }),
    field({
      label: 'Points de taux par point de marge baissé', value: params.ptsParPointMarge, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.ptsParPointMarge = Number(v) || 0; })
    }),
    field({
      label: 'Malus par concurrent (%)', value: params.malusParConcurrent * 100, type: 'number',
      help: "Coefficient concurrents = 1 − (ce % × nombre de concurrents).",
      onChange: v => CasPratiqueStore.updateParams(p => { p.malusParConcurrent = (Number(v) || 0) / 100; })
    })
  ]));

  panel.appendChild(sectionTitle('Coefficient maintenance actuelle du site'));
  panel.appendChild(grid(CP_MAINTENANCE_OPTIONS.map(o => field({
    label: o.label, value: params.coefMaintenance[o.value], type: 'number',
    onChange: v => CasPratiqueStore.updateParams(p => { p.coefMaintenance[o.value] = Number(v) || 0; })
  }))));

  panel.appendChild(sectionTitle('Score 40 → lancers supplémentaires'));
  panel.appendChild(grid([
    field({ label: 'Score < 20 → lancers supp.', value: params.lancersSupp[0].supp, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.lancersSupp[0].supp = Number(v) || 0; }) }),
    field({ label: 'Score 20 à 29 → lancers supp.', value: params.lancersSupp[1].supp, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.lancersSupp[1].supp = Number(v) || 0; }) }),
    field({ label: 'Score 30 à 40 → lancers supp.', value: params.lancersSupp[2].supp, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.lancersSupp[2].supp = Number(v) || 0; }) })
  ]));

  panel.appendChild(sectionTitle('Seuil de réussite au dé et objectifs de séance'));
  panel.appendChild(grid([
    field({
      label: 'Seuil de réussite', value: params.seuilReussite, type: 'select',
      options: ['strict', 'souple'],
      help: { text: 'À choisir avant la séance :', list: ['strict = un seul lancer à 6 suffit', 'souple = un seul lancer à 5 ou 6 suffit — beaucoup plus permissif, à tester avant la séance si besoin d\'ajuster.'] },
      onChange: v => CasPratiqueStore.updateParams(p => { p.seuilReussite = v; })
    }),
    field({
      label: 'Reste à commander visé (RAC, €)', value: params.racVise, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.racVise = Number(v) || 0; })
    }),
    field({
      label: 'Capacité totale du dernier mois (h)', value: params.capaciteTotale, type: 'number',
      onChange: v => CasPratiqueStore.updateParams(p => { p.capaciteTotale = Number(v) || 0; })
    })
  ]));
  panel.appendChild(h('div', { style: 'margin-top:8px' }, actionButton({
    cls: 'btn btn-light btn-sm',
    onclick: () => { if (confirm('Réinitialiser tous les paramètres à leurs valeurs de départ ?')) { CasPratiqueStore.resetParams(); render(); } },
    label: 'Réinitialiser les paramètres par défaut',
    help: "Remet les coefficients, bonus/malus, seuil et objectifs aux valeurs de départ proposées dans le cahier des charges."
  })));

  panel.appendChild(sectionTitle('Portefeuille d\'affaires du dernier mois'));
  panel.appendChild(hint('Liste proposée à toutes les tables — à constituer avant la séance.'));
  const table = h('table', { class: 'data-table' });
  table.appendChild(h('tr', {}, [
    h('th', {}, 'Nom de l\'affaire'), h('th', {}, 'Couleur'), h('th', {}, 'Montant estimé (€)'),
    h('th', {}, 'Concurrents'), h('th', {}, 'Maintenance actuelle'), h('th', {}, 'Heures requises'), h('th', {})
  ]));
  function renderRows() {
    Array.from(table.querySelectorAll('tr')).slice(1).forEach(tr => tr.remove());
    CasPratiqueStore.listPortefeuille().forEach(a => {
      const nomInput = h('input', { type: 'text', value: a.nom });
      nomInput.addEventListener('input', () => CasPratiqueStore.updateAffairePortefeuille(a.id, x => { x.nom = nomInput.value; }));
      const couleurSel = h('select');
      CP_COULEURS.forEach(c => couleurSel.appendChild(h('option', { value: c }, c)));
      couleurSel.value = a.couleur;
      couleurSel.addEventListener('change', () => { CasPratiqueStore.updateAffairePortefeuille(a.id, x => { x.couleur = couleurSel.value; }); renderRows(); });
      const montantInput = h('input', { type: 'number', value: a.montant });
      montantInput.addEventListener('input', () => { CasPratiqueStore.updateAffairePortefeuille(a.id, x => { x.montant = montantInput.value; }); renderRows(); });
      const concInput = h('input', { type: 'number', value: a.nbConcurrents, min: '0' });
      concInput.addEventListener('input', () => CasPratiqueStore.updateAffairePortefeuille(a.id, x => { x.nbConcurrents = concInput.value; }));
      const maintSel = h('select');
      CP_MAINTENANCE_OPTIONS.forEach(o => maintSel.appendChild(h('option', { value: o.value }, o.label)));
      maintSel.value = a.maintenance;
      maintSel.addEventListener('change', () => CasPratiqueStore.updateAffairePortefeuille(a.id, x => { x.maintenance = maintSel.value; }));
      const heures = cpHeuresRequises(a, params);
      const rmBtn = actionButton({
        cls: 'btn btn-danger btn-sm', label: '✕', title: 'Supprimer cette affaire du portefeuille',
        onclick: () => { CasPratiqueStore.removeAffairePortefeuille(a.id); renderRows(); }
      });
      table.appendChild(h('tr', {}, [
        h('td', {}, nomInput), h('td', {}, couleurSel), h('td', {}, montantInput),
        h('td', {}, concInput), h('td', {}, maintSel),
        h('td', {}, heures ? heures.toFixed(1) + ' h' : '—'), h('td', {}, rmBtn)
      ]));
    });
  }
  renderRows();
  panel.appendChild(h('div', { class: 'table-scroll' }, table));
  panel.appendChild(h('div', { class: 'repeat-table-actions' }, actionButton({
    cls: 'btn btn-light btn-sm',
    onclick: () => { CasPratiqueStore.addAffairePortefeuille(); renderRows(); },
    label: '+ Ajouter une affaire',
    help: "Ajoute une ligne vide au portefeuille d'affaires proposé à toutes les tables."
  })));

  panel.appendChild(sectionTitle('Partager cette configuration avec toutes les tables'));
  panel.appendChild(hint("Chaque poste stocke ses données localement — pour que toutes les tables partent du même portefeuille, exportez la configuration ici et faites-la importer sur chaque poste avant la séance. L'import ne touche pas aux affaires déjà engagées par la table qui importe."));
  const cpActions = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
  cpActions.appendChild(actionButton({
    cls: 'btn btn-light btn-sm',
    onclick: () => saveFile('cas-pratique-config.json', CasPratiqueStore.exportConfig(), 'application/json'),
    label: 'Exporter la configuration',
    help: "Télécharge un fichier JSON avec les paramètres et le portefeuille — à distribuer (clé USB, email, drive partagé) à toutes les tables avant la séance."
  }));
  const cpFileInput = h('input', { type: 'file', accept: 'application/json', hidden: true });
  cpFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { CasPratiqueStore.importConfig(reader.result); showToast('Configuration importée.'); render(); }
      catch (err) { alert('Fichier invalide : ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  cpActions.appendChild(actionButton({
    cls: 'btn btn-light btn-sm',
    onclick: () => cpFileInput.click(),
    label: 'Importer une configuration',
    help: "Charge un fichier de configuration (paramètres + portefeuille) reçu de l'organisateur — remplace les paramètres et le portefeuille actuels de ce poste, sans toucher aux affaires déjà engagées."
  }));
  cpActions.appendChild(cpFileInput);
  panel.appendChild(cpActions);
}

/* ==================================================================
   SIMULATION (table / groupe pendant la séance)
   ================================================================== */

function renderCpSimulation(panel) {
  const params = CasPratiqueStore.getParams();
  const portefeuille = CasPratiqueStore.listPortefeuille();
  panel.appendChild(hint("Étape 3 : engagez une affaire du portefeuille, saisissez le taux de base trouvé par votre table à l'étape 1, les efforts consentis, puis le Score 40 donné par le médiateur. Étape 4 : une fois les champs remplis, lancez le dé — le nombre de lancers est calculé automatiquement et ne peut pas être dépassé."));

  if (!portefeuille.length) {
    panel.appendChild(h('div', { class: 'empty-state' }, "Aucun portefeuille d'affaires n'est chargé sur ce poste. Importez la configuration transmise par l'organisateur depuis l'onglet « Configuration »."));
    return;
  }

  panel.appendChild(sectionTitle('Engager une affaire'));
  const selectRow = h('div', { class: 'field-grid' });
  const sel = h('select');
  sel.appendChild(h('option', { value: '' }, '— Choisir une affaire du portefeuille —'));
  portefeuille.forEach(a => sel.appendChild(h('option', { value: a.id }, `${a.nom || '(sans nom)'} — ${a.couleur} — ${fmtMoney(a.montant)}`)));
  sel.value = cpUiState.affaireASelectionner;
  sel.addEventListener('change', () => { cpUiState.affaireASelectionner = sel.value; });
  selectRow.appendChild(h('div', { class: 'field span-2' }, [h('label', {}, 'Affaire du portefeuille'), sel]));
  panel.appendChild(selectRow);
  panel.appendChild(h('div', { style: 'margin-top:8px' }, actionButton({
    cls: 'btn btn-primary btn-sm',
    onclick: () => {
      if (!cpUiState.affaireASelectionner) { showToast('Choisissez une affaire.'); return; }
      const eng = CasPratiqueStore.engagerAffaire(cpUiState.affaireASelectionner);
      cpUiState.affaireASelectionner = '';
      cpUiState.engagementFocus = eng.id;
      render();
    },
    label: 'Engager cette affaire',
    help: "Crée une fiche de simulation pour cette affaire — vous pourrez ensuite y saisir le taux de base, les efforts consentis et le Score 40, puis lancer le dé."
  })));

  const engagements = CasPratiqueStore.listEngagements().slice().reverse();
  if (!engagements.length) {
    panel.appendChild(hint('Aucune affaire engagée pour l\'instant sur ce poste.'));
    return;
  }

  panel.appendChild(sectionTitle('Affaires engagées par cette table'));
  engagements.forEach(eng => renderCpEngagementCard(panel, eng, params));
}

function renderCpEngagementCard(panel, eng, params) {
  const card = h('div', { class: 'controle-card' });

  const headerBox = h('div', {});
  card.appendChild(headerBox);

  const updE = (k) => (v) => { CasPratiqueStore.updateEngagement(eng.id, e => { e[k] = v; }); refreshComputed(); };
  const fieldTaux = field({ label: 'Taux de base (%, résultat de l\'étape 1 pour cette couleur)', value: eng.tauxBase, type: 'number', onChange: updE('tauxBase') });
  const fieldHeures = field({
    label: 'Heures supplémentaires investies', value: eng.heuresSupp, type: 'number',
    help: `+${params.ptsParHeureSupp} pts de taux par heure, plafonné à ${params.plafondHeuresSupp} h (soit +${params.ptsParHeureSupp * params.plafondHeuresSupp} pts max).`,
    onChange: updE('heuresSupp')
  });
  const fieldMarge = field({
    label: 'Baisse de marge nette consentie (points)', value: eng.baisseMarge, type: 'number',
    help: `+${params.ptsParPointMarge} pts de taux par point de marge baissé.`,
    onChange: updE('baisseMarge')
  });
  const fieldScore = field({
    label: 'Score 40 (saisi par le médiateur)', value: eng.score40, type: 'number', min: 0, max: 40,
    help: 'Détermine les lancers de dé supplémentaires : +0 sous 20, +1 de 20 à 29, +2 de 30 à 40.',
    onChange: updE('score40')
  });
  const lockableInputs = [fieldTaux, fieldHeures, fieldMarge, fieldScore].map(f => f.querySelector('input'));
  card.appendChild(grid([fieldTaux, fieldHeures, fieldMarge, fieldScore]));
  const lockHint = hint('Saisies verrouillées : le premier lancer de dé a été effectué, les valeurs ne peuvent plus être modifiées.');
  lockHint.hidden = eng.lancers.length === 0;
  card.appendChild(lockHint);

  const computedBox = h('div', {});
  card.appendChild(computedBox);

  card.appendChild(h('div', { style: 'margin-top:10px' }, actionButton({
    cls: 'btn btn-danger btn-sm',
    onclick: () => { if (confirm('Retirer cette affaire engagée (irréversible, y compris les lancers déjà faits) ?')) { CasPratiqueStore.removeEngagement(eng.id); render(); } },
    label: 'Retirer cette affaire',
    help: "Supprime définitivement cette fiche de simulation (saisies et lancers compris) — utile en cas d'erreur d'engagement."
  })));

  function refreshComputed() {
    const cur = CasPratiqueStore.getEngagement(eng.id);
    if (!cur) return;
    const totaux = cpLancersTotaux(cur, cur, params);
    const detail = cpDetailTauxReussite(cur, cur, params);
    const resultat = cpResultatEngagement(cur, totaux, params);
    const locked = cur.lancers.length > 0;

    clear(headerBox);
    headerBox.appendChild(h('div', { class: 'controle-header' }, [
      h('h3', {}, `${cur.nomAffaire || '(sans nom)'} — ${fmtMoney(cur.montant)}`),
      h('div', {}, [
        badge(cur.couleur, 'badge-' + cur.couleur),
        resultat === 'gagnee' ? badge('Gagnée', 'badge-VERT') : resultat === 'perdue' ? badge('Perdue', 'badge-ROSE') : badge('En cours', 'badge-neutral')
      ])
    ]));

    lockHint.hidden = !locked;
    lockableInputs.forEach(inp => { inp.readOnly = locked; inp.tabIndex = locked ? -1 : 0; inp.closest('.field').classList.toggle('locked', locked); });

    clear(computedBox);
    computedBox.appendChild(h('div', { class: 'suggestion-box' }, [
      `Taux de base ${detail.tauxBase.toFixed(0)} + bonus heures ${detail.bonusHeures.toFixed(0)} (${detail.heuresSuppEff} h retenues) + bonus marge ${detail.bonusMarge.toFixed(0)} = ${detail.sousTotal.toFixed(1)} pts. `,
      `× coef. concurrents ${detail.coefConcurrents.toFixed(2)} × coef. maintenance ${detail.coefMaintenance.toFixed(2)} = `,
      h('strong', {}, `${detail.final.toFixed(1)} %`),
      detail.plafonne ? ' (plafonné à 95 %)' : ''
    ]));
    computedBox.appendChild(h('div', { class: 'controle-condition' }, `Lancers de base : ${cpLancersBase(detail.final)} — Lancers supplémentaires (Score 40) : ${cpLancersSupplementaires(cur.score40, params)} — Lancers totaux : ${totaux}`));

    const diceRow = h('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px' });
    cur.lancers.forEach(v => diceRow.appendChild(h('span', { class: 'badge badge-neutral' }, `🎲 ${v}`)));
    if (cur.lancers.length < totaux) {
      diceRow.appendChild(actionButton({
        cls: 'btn btn-primary btn-sm',
        onclick: () => { CasPratiqueStore.lancerDe(cur.id); refreshComputed(); },
        label: `Lancer le dé (${cur.lancers.length + 1}/${totaux})`,
        help: `Tire un nombre de 1 à 6 et l'ajoute au résultat de cette affaire. Actionnable exactement ${totaux} fois au total pour cette affaire — le résultat (gagnée ou perdue) se détermine une fois tous les lancers effectués, selon le seuil paramétré (${params.seuilReussite === 'strict' ? 'un 6' : 'un 5 ou un 6'}).`
      }));
    } else {
      diceRow.appendChild(badge(resultat === 'gagnee' ? 'Affaire gagnée' : 'Affaire perdue', resultat === 'gagnee' ? 'badge-VERT' : 'badge-ROSE'));
    }
    computedBox.appendChild(diceRow);
  }

  refreshComputed();
  panel.appendChild(card);
}

/* ==================================================================
   SUIVI CUMULÉ (débrief)
   ================================================================== */

function renderCpSuivi(panel) {
  const params = CasPratiqueStore.getParams();
  const engagements = CasPratiqueStore.listEngagements();

  panel.appendChild(hint("Vue de synthèse pour le débrief — mise à jour automatiquement à mesure que la table engage des affaires et lance le dé."));

  let heuresParCouleur = { VERT: 0, ORANGE: 0, ROSE: 0 };
  let montantGagne = 0;
  engagements.forEach(eng => {
    const heures = cpHeuresRequises(eng, params) + Math.min(Number(eng.heuresSupp) || 0, params.plafondHeuresSupp);
    if (heuresParCouleur[eng.couleur] !== undefined) heuresParCouleur[eng.couleur] += heures;
    const totaux = cpLancersTotaux(eng, eng, params);
    const resultat = cpResultatEngagement(eng, totaux, params);
    if (resultat === 'gagnee') montantGagne += Number(eng.montant) || 0;
  });
  const heuresTotales = heuresParCouleur.VERT + heuresParCouleur.ORANGE + heuresParCouleur.ROSE;

  const kpiRow = h('div', { class: 'kpi-row' });
  [
    ['Heures engagées', `${heuresTotales.toFixed(1)} / ${params.capaciteTotale} h`],
    ['Montant gagné', `${fmtMoney(montantGagne)} / ${fmtMoney(params.racVise)}`],
    ['Affaires engagées', String(engagements.length)]
  ].forEach(([label, val]) => kpiRow.appendChild(h('div', { class: 'kpi-card' }, [
    h('div', { class: 'kpi-value' }, val), h('div', { class: 'kpi-label' }, label)
  ])));
  panel.appendChild(kpiRow);

  panel.appendChild(sectionTitle('Heures engagées par couleur'));
  panel.appendChild(grid(CP_COULEURS.map(c => field({ label: c, value: heuresParCouleur[c].toFixed(1) + ' h', auto: true }))));

  panel.appendChild(sectionTitle('Détail des affaires engagées'));
  if (!engagements.length) {
    panel.appendChild(hint('Aucune affaire engagée pour l\'instant.'));
    return;
  }
  const table = h('table', { class: 'data-table' });
  table.appendChild(h('tr', {}, [
    h('th', {}, 'Affaire'), h('th', {}, 'Couleur'), h('th', {}, 'Montant'), h('th', {}, 'Taux final'),
    h('th', {}, 'Lancers'), h('th', {}, 'Résultats des dés'), h('th', {}, 'Résultat')
  ]));
  engagements.forEach(eng => {
    const totaux = cpLancersTotaux(eng, eng, params);
    const taux = cpTauxReussite(eng, eng, params);
    const resultat = cpResultatEngagement(eng, totaux, params);
    table.appendChild(h('tr', {}, [
      h('td', {}, eng.nomAffaire || '—'),
      h('td', {}, couleurBadge(eng.couleur)),
      h('td', {}, fmtMoney(eng.montant)),
      h('td', {}, taux.toFixed(1) + ' %'),
      h('td', {}, `${eng.lancers.length} / ${totaux}`),
      h('td', {}, eng.lancers.map(v => '🎲' + v).join(' ') || '—'),
      h('td', {}, resultat === 'gagnee' ? badge('Gagnée', 'badge-VERT') : resultat === 'perdue' ? badge('Perdue', 'badge-ROSE') : badge('En cours', 'badge-neutral'))
    ]));
  });
  panel.appendChild(h('div', { class: 'table-scroll' }, table));
}
