/* ============================================================
   Export Excel (.xlsx) d'une affaire — via SheetJS (vendor/xlsx.full.min.js)
   Reproduit la structure du classeur "CAP Compétitivité" V1,
   un onglet par outil, avec formules pour les totaux calculés.
   ============================================================ */

function sheetFromAoa(aoa, colWidths, merges) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));
  if (merges) ws['!merges'] = merges;
  return ws;
}

function buildIdentiteSheet(a) {
  const id = a.identite;
  const aoa = [
    ["IDENTITÉ DE L'AFFAIRE"],
    [],
    ['Client / Prospect', id.client],
    ['Site / Agence', id.site],
    ['N° affaire / opportunité (Réf. CRM)', id.reference],
    ['Commercial en charge', id.commercial],
    ['Montant estimé (ordre de grandeur)', Number(id.montant) || id.montant],
    ['Montant confirmé', Number(id.montantConfirme) || id.montantConfirme],
    ['Déclencheur / contexte en une phrase', id.declencheur]
  ];
  return sheetFromAoa(aoa, [38, 50]);
}

function buildRdvSheet(a) {
  const id = a.identite;
  const aoa = [
    ['FICHE DE PRÉPARATION ET DE SUIVI DE RENDEZ-VOUS CLIENT'],
    [`${a.rdvs.length} rendez-vous enregistré(s) pour cette affaire`],
    []
  ];
  a.rdvs.forEach((r, i) => {
    const relScore = computeRelationScore(r);
    aoa.push(
      [`RDV N°${i + 1}`],
      ['1 — IDENTIFICATION'],
      ['Date du rendez-vous', r.date, 'Type de rendez-vous', r.typeRdv],
      ['Commercial en charge', id.commercial, "Ce RDV est le coup n°", r.coupNumero],
      ['Client / Prospect', id.client, 'Couleur pressentie (avant RDV)', r.couleurPressentie],
      ['Site / Agence', id.site, 'Couleur confirmée (après RDV)', r.couleurConfirmee],
      ['N° affaire / opportunité liée', id.reference, 'Statut du RDV', r.statutRdv],
      [],
      ["2 — L'INTERLOCUTEUR"],
      ['Nom et prénom', r.interNom, "Niveau d'influence perçu", r.interInfluence],
      ["Fonction dans l'organisation", r.interFonction, 'Posture pressentie', r.interPosture],
      ['Rôle réel dans la décision', r.interRole, "Pièce de l'échiquier associée", r.interPiece],
      ["Statut de l'identification", r.interStatut],
      [],
      ['3 — POURQUOI CE RENDEZ-VOUS ?'],
      ['Déclencheur du RDV', id.declencheur],
      ['Axe de développement commercial', r.axeDev],
      ["En quoi ce RDV s'inscrit-il dans notre stratégie ?", r.strategieCoup],
      [],
      ['4 — ENJEUX SUPPOSÉS DU CLIENT (3 max)'],
      ['N°', 'Enjeu supposé (avant RDV)'],
      ...r.enjeux.map((v, k) => [k + 1, v]),
      [],
      ["5 — OBJECTIFS DE L'ENTRETIEN (3 max)"],
      ['N°', 'Objectif recherché'],
      ...r.objectifs.map((v, k) => [k + 1, v]),
      [],
      ['6 — INFORMATIONS À OBTENIR / VALIDER (5 max)'],
      ['N°', 'Information à obtenir'],
      ...r.infos.map((v, k) => [k + 1, v]),
      [],
      ['7 — RÉSULTAT ATTENDU ET PROCHAINE ÉTAPE'],
      ['Résultat minimum acceptable', r.resultatMin],
      ['Prochaine étape proposée', r.prochaineEtape],
      ['Date de la prochaine étape', r.dateProchaineEtape],
      [],
      ['8 — À CHAUD, JUSTE APRÈS LE RDV'],
      ['Impressions libres', r.impressions],
      ['Mots-clés retenus', r.motsCles],
      [],
      ['9 — ÉVALUATION DE LA RELATION (note subjective /20)'],
      ...RELATION_CRITERES.map(c => [c.label, r.relation[c.key]]),
      ['Note subjective /20', relScore === null ? '' : relScore],
      [],
      []
    );
  });
  if (!a.rdvs.length) aoa.push(['(Aucun rendez-vous enregistré)']);
  return sheetFromAoa(aoa, [34, 24, 34, 20]);
}

function buildScore40Sheet(a) {
  const id = a.identite;
  const aoa = [
    ["SCORING ÉCHIQUIER — MÉTHODE DE L'ÉCHIQUIER"],
    [`${a.score40Evaluations.length} évaluation(s) enregistrée(s) pour cette affaire`],
    []
  ];

  if (a.score40Evaluations.length) {
    aoa.push(["HISTORIQUE D'ÉVOLUTION DU SCORE"], ['Date', 'Score /40', 'Actions menées', 'Commentaire']);
    a.score40Evaluations.slice().sort((x, y) => (x.date || '').localeCompare(y.date || '')).forEach(ev => {
      aoa.push([ev.date, computeScore40Total(ev), ev.actionsMenees, ev.commentaire]);
    });
    aoa.push([], []);
  }

  a.score40Evaluations.forEach((ev, i) => {
    const head = [
      [`ÉVALUATION N°${i + 1}`],
      ['Client / Affaire', id.client, 'Commercial', id.commercial],
      ["Date de l'évaluation", ev.date, "Phase de l'affaire", ev.phaseAffaire],
      [],
      ['Pièce associée', 'Critère', 'Description', 'Note /5']
    ];
    const firstDataExcelRow = aoa.length + head.length + 1;
    const lastDataExcelRow = firstDataExcelRow + CRITERES_SCORE40.length - 1;
    aoa.push(
      ...head,
      ...CRITERES_SCORE40.map((c, k) => [c.piece, c.critere, c.description, ev.notes[k] || 0]),
      ['SCORE SUR 40', '', '', { f: `SUM(D${firstDataExcelRow}:D${lastDataExcelRow})`, v: computeScore40Total(ev) }],
      [],
      ['ÉLÉMENTS CONFIRMÉS (par 2 sources minimum)'],
      ['Décideurs', ev.decideurs],
      ['Enjeux généraux (hors prix)', ev.enjeuxGeneraux],
      ['Budget validé', ev.budgetValide],
      ['Date de démarrage et délai', ev.dateDemarrageDelai],
      ['Organigramme', ev.organigramme],
      [],
      ['IDENTIFICATION DES PIÈCES'],
      ...PIECES_ECHIQUIER.map(p => [p, ev.pieces[p]]),
      [],
      ['STRATÉGIE / ACTIONS'],
      ...ev.strategieActions.map((v, k) => [`${k + 1}.`, v]),
      [],
      []
    );
  });
  if (!a.score40Evaluations.length) aoa.push(['(Aucune évaluation enregistrée)']);
  return sheetFromAoa(aoa, [26, 40, 55, 10]);
}

function buildQualificationSheet(a) {
  const q = a.qualification, id = a.identite;
  const totaux = computeQualiTotaux(q);
  const head = [
    ['FORMULAIRE DE QUALIFICATION CLIENT'],
    [],
    ['Client / Affaire', id.client],
    [],
    ['🛑 GARDE-FOU ÉLIMINATOIRE'],
    ['Litige actif avec ASI ?', q.litige],
    [],
    ['ÉTAPE 1 — FILTRE INITIAL'],
    ['Client déjà connu / référencé ?', q.clientConnu, "% de chance de réussite", q.pctReussite],
    ['Contrat cadre / maintenance en cours ?', q.contratCadre, 'Résultat Étape 1', computeResultatEtape1(q).texte],
    [],
    ['ÉTAPE 2 — GRILLE DE QUALIFICATION'],
    ['N°', 'Question', 'Réponse', 'Pts Orange', 'Pts Rose']
  ];
  const firstDataExcelRow = head.length + 1;
  const lastDataExcelRow = firstDataExcelRow + QUALIFICATION_QUESTIONS.length - 1;
  const aoa = [
    ...head,
    ...QUALIFICATION_QUESTIONS.map((question, i) => {
      const row = q.grille[i];
      const opt = question.options.find(o => o.label === row.reponse);
      return [i + 1, question.label, row.reponse, opt ? opt.orange : 0, opt ? opt.rose : 0];
    }),
    ['TOTAUX', '', '',
      { f: `SUM(D${firstDataExcelRow}:D${lastDataExcelRow})`, v: totaux.orange },
      { f: `SUM(E${firstDataExcelRow}:E${lastDataExcelRow})`, v: totaux.rose }],
    [],
    ['ÉTAPE 3 — CLASSIFICATION FINALE'],
    ['Couleur retenue', q.couleurRetenue || computeCouleurSuggeree(q).couleur],
    ['Justification', q.justification]
  ];
  return sheetFromAoa(aoa, [40, 45, 34, 12, 12]);
}

function buildMissionSheet(a) {
  const m = a.mission, id = a.identite;
  const couleur = a.qualification.couleurRetenue || computeCouleurSuggeree(a.qualification).couleur;
  const aoa = [
    ['FICHE DE MISSION — COMMERCIAL → CHIFFREUR'],
    [],
    ["0. IDENTITÉ DE L'AFFAIRE"],
    ['Affaire / Projet', m.affaireProjet, 'Réf. CRM', id.reference],
    ['Client', id.client, 'Montant estimé', Number(id.montant) || id.montant],
    ['Site', id.site, 'Date remise souhaitée', m.dateRemiseSouhaitee],
    ['Commercial', id.commercial],
    [],
    ['1. CONTEXTE & ENJEU RÉEL'],
    ['Déclencheur', id.declencheur],
    ['Enjeu dominant', m.enjeuDominant],
    ['Contraintes site', m.contraintesSite.join(', ')],
    [],
    ['2. POSITION COMMERCIALE'],
    ['Couleur', couleur, 'Indice de confiance', m.indiceConfiance],
    ['Initiateur', m.initiateur, 'Concurrents', m.concurrents],
    ['Budget client', m.budgetClient, 'Pourquoi gagner ?', m.pourquoiGagner],
    [],
    ['3. PÉRIMÈTRE TECHNIQUE'],
    ['Type de projet', m.typeProjet, 'Activité', m.activite],
    ['Référentiel', m.referentiel, 'Documents dispo', m.documentsDispo],
    ['Planning client', m.planningClient],
    [],
    ['4. COMMANDE AU CHIFFREUR'],
    ['Niveau demandé', m.niveauDemande, 'Heures allouées', m.heuresAllouees],
    [],
    ['5. POINTS DE VIGILANCE TRANSMIS AU CHIFFREUR'],
    ['Vigilance identifiée', 'Impact', 'Commentaire'],
    ...m.vigilances.map(v => [v.vigilance, v.impact, v.commentaire]),
    [],
    ['VALIDATION'],
    ['Commercial — Nom', m.commercialNom, 'Date', m.commercialDate],
    ['Responsable commercial — Nom', m.respCommercialNom, 'Date', m.respCommercialDate],
    ['Activation CENG', m.activationCENG, 'Seuil CENG 1,5 M€ HT dépassé ?', isActivationCENGRequise(a) ? 'Oui' : 'Non']
  ];
  return sheetFromAoa(aoa, [34, 28, 26, 26]);
}

function buildControlesSheet(a) {
  const aoa = [["POINTS DE CONTRÔLE"], []];
  computeControles(a).forEach(ctrl => {
    aoa.push([ctrl.titre]);
    ctrl.conditions.forEach(c => aoa.push(['', c.label, c.ok ? 'OK' : 'À faire']));
    aoa.push([]);
  });
  aoa.push(["Notes du retour d'expérience"], [a.controles.rexNotes || '']);
  return sheetFromAoa(aoa, [4, 50, 12]);
}

function exportAffaireToXlsx(a) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildIdentiteSheet(a), 'Identité affaire');
  XLSX.utils.book_append_sheet(wb, buildRdvSheet(a), 'Fiche RDV');
  XLSX.utils.book_append_sheet(wb, buildScore40Sheet(a), 'Score 40');
  XLSX.utils.book_append_sheet(wb, buildQualificationSheet(a), 'Qualification');
  XLSX.utils.book_append_sheet(wb, buildMissionSheet(a), 'Fiche Mission');
  XLSX.utils.book_append_sheet(wb, buildControlesSheet(a), 'Points de contrôle');

  const safe = (s) => (s || 'affaire').toString().replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const filename = `${safe(a.identite.client)}_${safe(a.identite.reference)}.xlsx`;
  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveFile(filename, arrayBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
