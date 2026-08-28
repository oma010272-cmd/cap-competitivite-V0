/* ============================================================
   Export Excel (.xlsx) d'une affaire — via SheetJS (vendor/xlsx.full.min.js)
   Reproduit la structure du classeur "CAP Compétitivité" d'origine,
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
    ['Date du rendez-vous', id.dateRdv],
    ['Montant estimé (ordre de grandeur)', Number(id.montant) || id.montant],
    ['Déclencheur / contexte en une phrase', id.declencheur]
  ];
  return sheetFromAoa(aoa, [38, 50]);
}

function buildRdvSheet(a) {
  const r = a.rdv, id = a.identite;
  const aoa = [
    ['FICHE DE PRÉPARATION ET DE SUIVI DE RENDEZ-VOUS CLIENT'],
    [],
    ['1 — IDENTIFICATION'],
    ['Date du rendez-vous', id.dateRdv, 'Type de rendez-vous', r.typeRdv],
    ['Commercial en charge', id.commercial, 'Ce RDV est le coup n°', r.coupNumero],
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
    ...r.enjeux.map((v, i) => [i + 1, v]),
    [],
    ["5 — OBJECTIFS DE L'ENTRETIEN (3 max)"],
    ['N°', 'Objectif recherché'],
    ...r.objectifs.map((v, i) => [i + 1, v]),
    [],
    ['6 — INFORMATIONS À OBTENIR / VALIDER (5 max)'],
    ['N°', 'Information à obtenir'],
    ...r.infos.map((v, i) => [i + 1, v]),
    [],
    ['7 — RÉSULTAT ATTENDU ET PROCHAINE ÉTAPE'],
    ['Résultat minimum acceptable', r.resultatMin],
    ['Prochaine étape proposée', r.prochaineEtape],
    ['Date de la prochaine étape', r.dateProchaineEtape],
    [],
    ['8 — À CHAUD, JUSTE APRÈS LE RDV'],
    ['Impressions libres', r.impressions],
    ['Mots-clés retenus', r.motsCles]
  ];
  return sheetFromAoa(aoa, [34, 24, 34, 20]);
}

function buildScore40Sheet(a) {
  const s = a.score40, id = a.identite;
  const head = [
    ["SCORING ÉCHIQUIER — MÉTHODE DE L'ÉCHIQUIER"],
    [],
    ['Client / Affaire', id.client, 'Commercial', id.commercial],
    ["Date de l'évaluation", id.dateRdv, "Phase de l'affaire", s.phaseAffaire],
    [],
    ['Pièce associée', 'Critère', 'Description', 'Note /5']
  ];
  const firstDataExcelRow = head.length + 1; // 1ère ligne Excel (1-index) de la grille de notes
  const lastDataExcelRow = firstDataExcelRow + CRITERES_SCORE40.length - 1;
  const aoa = [
    ...head,
    ...CRITERES_SCORE40.map((c, i) => [c.piece, c.critere, c.description, s.notes[i] || 0]),
    ['SCORE SUR 40', '', '', { f: `SUM(D${firstDataExcelRow}:D${lastDataExcelRow})`, v: computeScore40Total(a) }],
    [],
    ['ÉLÉMENTS TRIANGULÉS'],
    ['Décideurs', s.decideurs],
    ['Enjeux généraux (hors prix)', s.enjeuxGeneraux],
    ['Budget validé', s.budgetValide],
    ['Date de démarrage et délai', s.dateDemarrageDelai],
    ['Organigramme', s.organigramme],
    [],
    ['IDENTIFICATION DES PIÈCES'],
    ...PIECES_ECHIQUIER.map(p => [p, s.pieces[p]]),
    [],
    ['STRATÉGIE / ACTIONS'],
    ...s.strategieActions.map((v, i) => [`${i + 1}.`, v])
  ];
  return sheetFromAoa(aoa, [26, 40, 55, 10]);
}

function buildQualificationSheet(a) {
  const q = a.qualification, id = a.identite;
  const totaux = computeQualiTotaux(a);
  const head = [
    ['FORMULAIRE DE QUALIFICATION CLIENT'],
    [],
    ['Client / Affaire', id.client],
    [],
    ['🛑 GARDE-FOU ÉLIMINATOIRE'],
    ['Litige actif avec ASI ?', q.litige],
    [],
    ['ÉTAPE 1 — FILTRE INITIAL'],
    ['Client déjà connu / référencé ?', q.clientConnu, "Estimation % de chance de réussite", q.pctReussite],
    ['Contrat cadre / maintenance en cours ?', q.contratCadre, 'Résultat Étape 1', computeResultatEtape1(a).texte],
    [],
    ['ÉTAPE 2 — GRILLE DE QUALIFICATION'],
    ['N°', 'Question', 'Réponse', 'Pts Orange', 'Pts Rose']
  ];
  const firstDataExcelRow = head.length + 1; // 1ère ligne Excel (1-index) de la grille étape 2
  const lastDataExcelRow = firstDataExcelRow + QUESTIONS_QUALIFICATION.length - 1;
  const aoa = [
    ...head,
    ...QUESTIONS_QUALIFICATION.map((question, i) => [i + 1, question, q.grille[i].reponse, q.grille[i].ptsOrange || 0, q.grille[i].ptsRose || 0]),
    ['TOTAUX', '', '',
      { f: `SUM(D${firstDataExcelRow}:D${lastDataExcelRow})`, v: totaux.orange },
      { f: `SUM(E${firstDataExcelRow}:E${lastDataExcelRow})`, v: totaux.rose }],
    [],
    ['ÉTAPE 3 — CLASSIFICATION FINALE'],
    ['Couleur retenue', q.couleurRetenue || computeCouleurSuggeree(a).couleur],
    ['Justification', q.justification]
  ];
  return sheetFromAoa(aoa, [40, 34, 20, 12, 12]);
}

function buildMissionSheet(a) {
  const m = a.mission, id = a.identite;
  const aoa = [
    ['FICHE DE MISSION — COMMERCIAL → CHIFFREUR'],
    [],
    ["0. IDENTITÉ DE L'AFFAIRE"],
    ['Affaire / Projet', m.affaireProjet, 'Réf. CRM', id.reference],
    ['Client', id.client, 'Montant estimé', Number(id.montant) || id.montant],
    ['Site', id.site, 'Date remise souhaitée', m.dateRemiseSouhaitee],
    ['Commercial', id.commercial, 'Date RDV client', id.dateRdv],
    [],
    ['1. CONTEXTE & ENJEU RÉEL'],
    ['Déclencheur', id.declencheur],
    ['Enjeu dominant', m.enjeuDominant],
    ['Contraintes site', m.contraintesSite.join(', ')],
    [],
    ['2. POSITION COMMERCIALE'],
    ['Couleur', q_couleur(a), 'Probabilité', m.probabilite],
    ['Initiateur', m.initiateur, 'Concurrents', m.concurrents],
    ['Budget client', m.budgetClient, 'Pourquoi gagner ?', m.pourquoiGagner],
    [],
    ['3. PÉRIMÈTRE TECHNIQUE'],
    ['Type de projet', m.typeProjet, 'Activité', m.activite],
    ['Référentiel', m.referentiel, 'Documents dispo', m.documentsDispo],
    ['Planning client', m.planningClient],
    [],
    ['4. COMMANDE AU CHIFFREUR'],
    ['Niveau demandé', m.niveauDemande, "Indice d'effort", m.indiceEffort],
    [],
    ['5. ANALYSE DE RISQUES TRANSMISE AU CHIFFREUR'],
    ['Risques identifiés (impact, commentaire)', m.risques],
    [],
    ['VALIDATION'],
    ['Commercial — Nom', m.commercialNom, 'Date', m.commercialDate],
    ['Responsable commercial — Nom', m.respCommercialNom, 'Date', m.respCommercialDate],
    ['Activation CENG', m.activationCENG, 'Seuil CENG 1,5 M€ HT dépassé ?', isActivationCENGRequise(a) ? 'Oui' : 'Non']
  ];
  return sheetFromAoa(aoa, [34, 28, 26, 26]);
}

function q_couleur(a) {
  return a.qualification.couleurRetenue || computeCouleurSuggeree(a).couleur;
}

function exportAffaireToXlsx(a) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildIdentiteSheet(a), 'Identité affaire');
  XLSX.utils.book_append_sheet(wb, buildRdvSheet(a), '1. Fiche RDV');
  XLSX.utils.book_append_sheet(wb, buildScore40Sheet(a), '2. Score 40');
  XLSX.utils.book_append_sheet(wb, buildQualificationSheet(a), '3. Qualification');
  XLSX.utils.book_append_sheet(wb, buildMissionSheet(a), '4. Fiche Mission');

  const safe = (s) => (s || 'affaire').toString().replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const filename = `${safe(a.identite.client)}_${safe(a.identite.reference)}.xlsx`;
  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveFile(filename, arrayBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
