/* ============================================================
   Modèle de données + persistance (localStorage)
   Outil "CAP Compétitivité — Boîte à outils" — gestion d'affaires
   Version V1 (alignée sur le classeur "CAP_Competitivite_Boite_a_Outils_V1.xlsx")
   ============================================================ */

const STORAGE_KEY = 'agentCeng.affaires.v1';

const COULEURS = ['VERT', 'ORANGE', 'ROSE'];

const CONTRAINTES_SITE_OPTIONS = [
  'Site occupé', 'ICPE', 'SEVESO', 'Permis feu', 'Travail de nuit', 'Arrêts programmés'
];

const PIECES_ECHIQUIER = ['Roi', 'Reine', 'Tour', 'Fou', 'Cavalier', 'Pion'];

const ETAPES_PROCESSUS = [
  '1. Sollicitations / Prospection',
  '2. Qualification',
  '3. Go / No-Go',
  '4. Chiffrage',
  '5. Deuxième regard',
  '6. Rédaction du mémoire',
  '7. Proposition commerciale',
  '8. Négociation',
  '9. Décision'
];

const CRITERES_SCORE40 = [
  { piece: 'Roi / Reine', critere: 'Décideurs identifiés et triangulés', description: "Je connais qui initie le projet et qui valide les décisions." },
  { piece: 'Reine', critere: 'Enjeux connus et triangulés', description: "Je comprends les motivations du client : conformité réglementaire, sécurité, pérennité du site, disponibilité de la production, image, coûts d'assurance, etc." },
  { piece: 'Reine', critere: 'Budget alloué et triangulé', description: 'Le budget ou le mode de financement est identifié et validé.' },
  { piece: 'Tour', critere: 'Calendrier du projet connu et triangulé', description: "Le planning du projet (études, travaux, arrêt de production) est connu et validé avec les services concernés." },
  { piece: 'Tour / Fou', critere: 'Accès à toutes les pièces (espace de décision)', description: "J'ai identifié tous les interlocuteurs internes (EHS, fluides, maintenance, achats, direction) et je sais qui influence la décision." },
  { piece: 'Cavalier', critere: "J'ai un Cheval (relais interne)", description: "J'ai un relais interne qui connaît notre entreprise et soutient notre offre." },
  { piece: 'Pion', critere: 'Scénarios listés, réponses prêtes', description: 'Les contraintes techniques sont connues. La liste des écarts est prête.' },
  { piece: 'Toutes pièces', critere: 'Offre adaptée à leurs enjeux', description: 'Notre proposition technique et financière répond clairement aux enjeux du site.' }
];

const SCORE40_NIVEAUX = [
  { max: 10, label: 'Affaire non maîtrisée', desc: "Ne pas engager d'étude. Aller chercher l'information manquante." },
  { max: 20, label: 'Connaissance insuffisante', desc: 'Poursuivre la qualification. Étude limitée au ratio.' },
  { max: 30, label: 'Affaire sous contrôle', desc: 'Engagement proportionné. Le mémoire peut être construit sur les enjeux.' },
  { max: Infinity, label: 'Affaire pilotée', desc: 'Investissement pleinement justifié.' }
];

const PHASE_AFFAIRE_OPTIONS = ['Prospection', 'Consultation', 'Chiffrage', 'Alignement', 'Négociation'];

/* --- Évaluation de la relation (Fiche RDV) — note subjective /20 --- */
const RELATION_ECHELLE = [
  { label: 'Très faible', value: 0 },
  { label: 'Faible / partiel', value: 5 },
  { label: 'Correct / bon', value: 10 },
  { label: 'Élevé / excellent', value: 15 }
];
const RELATION_ECHELLE_LABELS = RELATION_ECHELLE.map(o => o.label);
const RELATION_CRITERES = [
  { key: 'confiance', label: 'Confiance', desc: 'Fiabilité et transparence des échanges avec le contact', weight: 2 },
  { key: 'volonteCollaborer', label: 'Volonté de collaborer', desc: 'Ouverture, proactivité, disponibilité du contact', weight: 3 },
  { key: 'influenceDecision', label: 'Influence dans la décision', desc: 'Capacité réelle à faire avancer le dossier en interne', weight: 4 },
  { key: 'relationPersonnelle', label: 'Relation personnelle', desc: 'Qualité et proximité de la relation avec le commercial', weight: 1 }
];

/* --- Grille de qualification, étape 2 — 12 questions, points dérivés du choix --- */
const QUALIFICATION_QUESTIONS = [
  { label: 'Historique avec ce client', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Neutre', orange: 0, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Marge estimée sur cette affaire', options: [
    { label: '>6%', orange: 2, rose: 0 }, { label: 'Entre 3% et 6%', orange: 1, rose: 0 }, { label: '<3%', orange: 0, rose: 1 }
  ] },
  { label: 'Le client est-il transparent ?', options: [
    { label: 'Oui', orange: 2, rose: 0 }, { label: 'Pas complètement', orange: 1, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Connaît-on le décisionnaire (chaîne de décision / échiquier) ?', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Relation directe avec le client ou indirecte (MOE/BET/AMO) ?', options: [
    { label: 'Directe', orange: 1, rose: 0 }, { label: 'Indirecte', orange: 0, rose: 1 }
  ] },
  { label: 'Connaît-on les enjeux de ce client ?', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Existe-t-il un potentiel de développement ?', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Concurrents identifiés sur cette affaire', options: [
    { label: 'Peu ou pas de concurrence (2 max, structurée)', orange: 1, rose: 0 },
    { label: 'Forte concurrence ou low-cost / AO (3+)', orange: 0, rose: 2 },
    { label: 'Inconnu', orange: 0, rose: 1 }
  ] },
  { label: 'Le site est-il déjà maintenu ?', options: [
    { label: 'Oui, par Axima', orange: 2, rose: 0 },
    { label: 'Non', orange: 0, rose: 0 },
    { label: 'Oui, par un concurrent', orange: 0, rose: 2 }
  ] },
  { label: 'Le client a-t-il un projet déjà étudié mais non abouti ?', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Non', orange: 0, rose: 1 }
  ] },
  { label: 'Volonté travaux : obligation réglementaire ou demande forte (DREAL, assureur) ?', options: [
    { label: 'Oui', orange: 1, rose: 0 }, { label: 'Non / faible', orange: 0, rose: 1 }
  ] },
  { label: 'Capacité du client à investir', options: [
    { label: 'Forte ou moyenne', orange: 2, rose: 0 },
    { label: 'Faible ou investissement impossible', orange: 0, rose: 2 }
  ] }
];

const NIVEAU_ETUDE_MATRICE = {
  'N1 — Enveloppe': { prix: 'Enveloppe budgétaire (fourchette)', planning: "Délai d'exécution uniquement", memoire: 'Néant' },
  'N2 — Semi-détaillé': { prix: 'Chiffrage par postes', planning: 'Planning enveloppe', memoire: 'Note technique + conseil au client' },
  'N3 — Détaillé': { prix: 'TPGF complet', planning: 'Planning détaillé avec interfaces et phasage', memoire: 'Mémoire standard : détail technique, note environnementale, docs demandés et non demandés' }
};
const NIVEAU_ETUDE_PAR_COULEUR = { ROSE: 'N1 — Enveloppe', ORANGE: 'N2 — Semi-détaillé', VERT: 'N3 — Détaillé' };

const SEUIL_CENG = 1500000;

function uid() {
  return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowISO() {
  return new Date().toISOString();
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- Fiche RDV (une entrée par rendez-vous) ---------------- */

function newRdv() {
  return {
    id: uid(),
    date: '', typeRdv: '', coupNumero: '', couleurPressentie: '', couleurConfirmee: '', statutRdv: '',
    interNom: '', interFonction: '', interRole: '', interStatut: '',
    interInfluence: '', interPosture: '', interPiece: '',
    axeDev: '', strategieCoup: '',
    enjeux: ['', '', ''],
    objectifs: ['', '', ''],
    infos: ['', '', '', '', ''],
    resultatMin: '', prochaineEtape: '', dateProchaineEtape: '',
    impressions: '', motsCles: '',
    relation: { confiance: '', volonteCollaborer: '', influenceDecision: '', relationPersonnelle: '' }
  };
}

function computeRelationScore(rdv) {
  const totalWeight = RELATION_CRITERES.reduce((s, c) => s + c.weight, 0);
  let weighted = 0, answered = 0;
  RELATION_CRITERES.forEach(c => {
    const opt = RELATION_ECHELLE.find(o => o.label === rdv.relation[c.key]);
    if (opt) { weighted += opt.value * c.weight; answered++; }
  });
  if (answered === 0) return null;
  const maxValue = RELATION_ECHELLE[RELATION_ECHELLE.length - 1].value;
  const score = 20 * weighted / (maxValue * totalWeight);
  return Math.ceil(score * 10) / 10;
}

/* ---------------- Score 40 (une entrée par évaluation, indépendante) ---------------- */

function newScore40Evaluation() {
  return {
    id: uid(),
    date: todayISODate(),
    phaseAffaire: '',
    notes: [0, 0, 0, 0, 0, 0, 0, 0],
    decideurs: '', enjeuxGeneraux: '', budgetValide: '', dateDemarrageDelai: '', organigramme: '',
    pieces: { Roi: '', Reine: '', Tour: '', Fou: '', Cavalier: '', Pion: '' },
    strategieActions: ['', '', ''],
    actionsMenees: '', commentaire: ''
  };
}

function computeScore40Total(evaluation) {
  return evaluation.notes.reduce((s, n) => s + (Number(n) || 0), 0);
}

function computeScore40Niveau(total) {
  return SCORE40_NIVEAUX.find(n => total < n.max);
}

/* ---------------- Qualification ---------------- */

function newQualification() {
  return {
    litige: '', clientConnu: '', pctReussite: '', contratCadre: '',
    grille: QUALIFICATION_QUESTIONS.map(() => ({ reponse: '' })),
    couleurRetenue: '', justification: ''
  };
}

function computeQualiTotaux(qualification) {
  let orange = 0, rose = 0;
  qualification.grille.forEach((row, i) => {
    const q = QUALIFICATION_QUESTIONS[i];
    const opt = q.options.find(o => o.label === row.reponse);
    if (opt) { orange += opt.orange; rose += opt.rose; }
  });
  return { orange, rose };
}

function computeResultatEtape1(qualification) {
  const clientConnuOk = qualification.clientConnu === 'Oui' && Number(qualification.pctReussite) > 50;
  const contratCadreOk = qualification.contratCadre === 'Oui';
  if (clientConnuOk || contratCadreOk) {
    return {
      texte: 'VERT automatique (un déclencheur suffit)',
      vertAuto: true,
      viaContratCadre: contratCadreOk && !clientConnuOk
    };
  }
  return { texte: "Aucun déclencheur direct → passer à l'Étape 2", vertAuto: false, viaContratCadre: false };
}

function computeCouleurSuggeree(qualification) {
  if (qualification.litige === 'Oui') return { couleur: 'ROSE', motif: 'Garde-fou : litige actif → ROSE forcé' };
  const etape1 = computeResultatEtape1(qualification);
  if (etape1.vertAuto) {
    return {
      couleur: 'VERT',
      motif: etape1.viaContratCadre
        ? 'Étape 1 : contrat-cadre/maintenance en cours — ⚠ à valider avec la Direction'
        : 'Étape 1 : client connu et chance de réussite > 50 %'
    };
  }
  const { orange, rose } = computeQualiTotaux(qualification);
  if (orange === 0 && rose === 0) return { couleur: '', motif: 'Renseignez la grille de l’Étape 2' };
  if (orange === rose) return { couleur: '', motif: 'Égalité Orange/Rose — arbitrage manuel requis' };
  return {
    couleur: orange > rose ? 'ORANGE' : 'ROSE',
    motif: `Étape 2 : score ${orange > rose ? 'Orange' : 'Rose'} dominant (Orange ${orange} / Rose ${rose})`
  };
}

/* ---------------- Fiche Mission ---------------- */

function newMission() {
  return {
    affaireProjet: '', dateRemiseSouhaitee: '',
    enjeuDominant: '', contraintesSite: [],
    indiceConfiance: '', initiateur: '', concurrents: '', budgetClient: '', pourquoiGagner: '',
    typeProjet: '', activite: '', referentiel: '', documentsDispo: '', planningClient: '',
    niveauDemande: '', heuresAllouees: '',
    vigilances: [{ vigilance: '', impact: '', commentaire: '' }, { vigilance: '', impact: '', commentaire: '' }, { vigilance: '', impact: '', commentaire: '' }],
    commercialNom: '', commercialDate: '', respCommercialNom: '', respCommercialDate: '', activationCENG: ''
  };
}

function isActivationCENGRequise(affaire) {
  const m = Number(affaire.identite.montant);
  return !isNaN(m) && m >= SEUIL_CENG;
}

/* ---------------- Points de contrôle (4 jalons du parcours) ---------------- */

function newControles() {
  return {
    goNoGoValide: false, ressourcesPreallouees: false,
    strategiePrixDefinie: false, cctpAnalyse: false,
    valeurPercueIdentifiee: false, differenciationDefinie: false,
    rexRealise: false, rexNotes: ''
  };
}

function computeControles(affaire) {
  const evals = affaire.score40Evaluations;
  const dernierScore = evals.length ? evals[evals.length - 1] : null;
  const dernierTotal = dernierScore ? computeScore40Total(dernierScore) : null;
  const c = affaire.controles;
  return [
    {
      id: 1, titre: 'Contrôle 1 — Go / No-Go (étapes 3 → 4)',
      conditions: [
        { label: 'Score 40 complété', ok: evals.length > 0 },
        { label: 'Couleur affectée', ok: !!affaire.qualification.couleurRetenue },
        { label: 'Go/No-Go validé', ok: c.goNoGoValide, manuel: true, key: 'goNoGoValide' },
        { label: 'Ressources pré-allouées', ok: c.ressourcesPreallouees, manuel: true, key: 'ressourcesPreallouees' }
      ]
    },
    {
      id: 2, titre: 'Contrôle 2 — Chiffrage (étapes 4 → 5)',
      conditions: [
        { label: 'Fiche de mission renseignée', ok: !!(affaire.mission.typeProjet && affaire.mission.niveauDemande) },
        { label: 'Stratégie de prix définie', ok: c.strategiePrixDefinie, manuel: true, key: 'strategiePrixDefinie' },
        { label: 'CCTP analysé', ok: c.cctpAnalyse, manuel: true, key: 'cctpAnalyse' },
        { label: 'Risques listés et maîtrisés', ok: affaire.mission.vigilances.some(v => v.vigilance) }
      ]
    },
    {
      id: 3, titre: 'Contrôle 3 — Mémoire (étapes 5 → 6)',
      conditions: [
        { label: 'Enjeux explicites documentés', ok: !!affaire.mission.enjeuDominant },
        { label: 'Valeur perçue identifiée', ok: c.valeurPercueIdentifiee, manuel: true, key: 'valeurPercueIdentifiee' },
        { label: 'Différenciation définie', ok: c.differenciationDefinie, manuel: true, key: 'differenciationDefinie' },
        { label: 'Score ≥ 20/40', ok: dernierTotal !== null && dernierTotal >= 20 }
      ]
    },
    {
      id: 4, titre: 'Contrôle 4 — Retour d\'expérience (étape 8)',
      conditions: [
        { label: "Retour d'expérience réalisé (gagnée ou perdue)", ok: c.rexRealise, manuel: true, key: 'rexRealise' }
      ]
    }
  ];
}

/* ---------------- Bloc de Reprise (pont avec ATOUT_COM / Copilot) ---------------- */

const BLOC_REPRISE_SECTIONS = [
  'IDENTIFICATION', 'ÉTAPE ATTEINTE', 'COULEUR', 'SCORE 40 COURANT',
  'JOURNAL DES MOUVEMENTS', 'PIÈCES IDENTIFIÉES', 'JOURNAL DES REQUALIFICATIONS',
  'MANQUES NON COMBLÉS', 'ENJEUX ÉTABLIS', 'DÉCISIONS VERROUILLÉES', 'ZONES D\'OMBRE ASSUMÉES'
];

function generateBlocReprise(a) {
  const q = a.qualification;
  const evals = a.score40Evaluations.slice().sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  const dernier = evals[evals.length - 1] || null;
  const couleur = q.couleurRetenue || computeCouleurSuggeree(q).couleur;
  const lines = [];

  lines.push('BLOC DE REPRISE — ' + (a.identite.client || 'Affaire sans nom'));
  lines.push('Produit par l\'application CAP Compétitivité le ' + todayISODate());
  lines.push('');

  lines.push('IDENTIFICATION');
  lines.push(`Client : ${a.identite.client || '—'}`);
  lines.push(`Site / Agence : ${a.identite.site || '—'}`);
  lines.push(`Référence : ${a.identite.reference || '—'}`);
  lines.push(`Montant estimé : ${a.identite.montant ? fmtMoney(a.identite.montant) : '—'}`);
  lines.push('');

  lines.push('ÉTAPE ATTEINTE');
  lines.push(a.identite.etapeProcessus || 'Non renseignée');
  lines.push('');

  lines.push('COULEUR');
  lines.push(`${couleur || 'Non déterminée'}${q.justification ? ' — ' + q.justification : ''}`);
  lines.push('');

  lines.push('SCORE 40 COURANT');
  if (dernier) {
    lines.push(`Évalué le ${dernier.date || '—'} — Total ${computeScore40Total(dernier)}/40`);
    CRITERES_SCORE40.forEach((c, i) => lines.push(`- ${c.critere} : ${dernier.notes[i] || 0}/5`));
  } else {
    lines.push('Aucune évaluation enregistrée.');
  }
  lines.push('');

  lines.push('JOURNAL DES MOUVEMENTS');
  let mouvements = [];
  for (let i = 1; i < evals.length; i++) {
    CRITERES_SCORE40.forEach((c, k) => {
      const avant = Number(evals[i - 1].notes[k]) || 0;
      const apres = Number(evals[i].notes[k]) || 0;
      if (avant !== apres) mouvements.push(`- ${evals[i].date || '—'} : ${c.critere} — ${avant}/5 → ${apres}/5`);
    });
  }
  lines.push(...(mouvements.length ? mouvements : ['(aucun mouvement au-delà de la première évaluation)']));
  lines.push('');

  lines.push('PIÈCES IDENTIFIÉES');
  const pieces = {};
  a.rdvs.forEach(r => { if (r.interNom) pieces[r.interNom] = { fonction: r.interFonction, piece: r.interPiece }; });
  const pieceLines = Object.entries(pieces).map(([nom, info]) => `- ${nom} — ${info.fonction || 'fonction non précisée'} — ${info.piece || 'pièce non attribuée'}`);
  lines.push(...(pieceLines.length ? pieceLines : ['(aucun interlocuteur identifié)']));
  lines.push('');

  lines.push('MANQUES NON COMBLÉS');
  if (dernier) {
    const manques = CRITERES_SCORE40.filter((c, i) => (Number(dernier.notes[i]) || 0) <= 1).map(c => `- ${c.critere}`);
    lines.push(...(manques.length ? manques : ['(aucun manque critique identifié sur la dernière évaluation)']));
  } else {
    lines.push('(pas d\'évaluation Score 40 pour établir les manques)');
  }
  lines.push('');

  lines.push('ENJEUX ÉTABLIS');
  const enjeux = a.rdvs.flatMap(r => r.enjeux).filter(Boolean).map(e => `- ${e}`);
  lines.push(...(enjeux.length ? enjeux : ['(aucun enjeu renseigné)']));
  lines.push('');

  lines.push('DÉCISIONS VERROUILLÉES');
  const verrous = computeControles(a).filter(ctrl => ctrl.conditions.every(c => c.ok)).map(ctrl => `- ${ctrl.titre} : franchi`);
  lines.push(...(verrous.length ? verrous : ['(aucun point de contrôle franchi à ce jour)']));
  lines.push('');

  lines.push('ZONES D\'OMBRE ASSUMÉES');
  lines.push(a.controles.rexNotes || 'Non renseignées.');

  return lines.join('\n');
}

function findSectionsInText(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = null;
  lines.forEach(line => {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase().replace(/’/g, "'");
    const match = BLOC_REPRISE_SECTIONS.find(s => upper === s || upper.startsWith(s));
    if (match) {
      current = match;
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  });
  return sections;
}

function parseBlocReprise(text) {
  const sections = findSectionsInText(text);
  const result = {
    client: '', montant: '', couleur: '', score40Notes: null, score40Date: '',
    pieces: [], enjeux: [], manques: [], raw: text
  };

  const idLines = sections['IDENTIFICATION'] || [];
  idLines.forEach(line => {
    const m = line.match(/^\s*client\s*:\s*(.+)$/i);
    if (m && m[1].trim() !== '—') result.client = m[1].trim();
    const mm = line.match(/^\s*montant[^:]*:\s*(.+)$/i);
    if (mm && mm[1].trim() !== '—') result.montant = mm[1].replace(/[^\d,.]/g, '').replace(',', '.');
  });

  const coulLines = (sections['COULEUR'] || []).join(' ');
  const coulMatch = coulLines.match(/\b(VERT|ORANGE|ROSE)\b/i);
  if (coulMatch) result.couleur = coulMatch[1].toUpperCase();

  const scoreLines = sections['SCORE 40 COURANT'] || [];
  const notes = [];
  scoreLines.forEach(line => {
    const m = line.match(/(\d+(?:[.,]\d+)?)\s*\/\s*5/);
    if (m) notes.push(Math.max(0, Math.min(5, Number(m[1].replace(',', '.')))));
  });
  if (notes.length >= CRITERES_SCORE40.length) {
    result.score40Notes = notes.slice(0, CRITERES_SCORE40.length);
  }
  const dateMatch = scoreLines.join(' ').match(/évalué le\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  if (dateMatch) result.score40Date = dateMatch[1];

  const pieceLines = sections['PIÈCES IDENTIFIÉES'] || [];
  pieceLines.forEach(line => {
    const l = line.trim();
    if (!l.startsWith('-')) return;
    const piece = PIECES_ECHIQUIER.find(p => new RegExp('\\b' + p + '\\b', 'i').test(l));
    const nom = l.replace(/^-\s*/, '').split(/—|-/)[0].trim();
    if (nom) result.pieces.push({ nom, piece: piece || '' });
  });

  const enjeuxLines = sections['ENJEUX ÉTABLIS'] || [];
  enjeuxLines.forEach(line => {
    const l = line.trim();
    if (l.startsWith('-')) result.enjeux.push(l.replace(/^-\s*/, ''));
  });

  const manquesLines = sections['MANQUES NON COMBLÉS'] || [];
  manquesLines.forEach(line => {
    const l = line.trim();
    if (l.startsWith('-')) result.manques.push(l.replace(/^-\s*/, ''));
  });

  return result;
}

/* ---------------- Affaire ---------------- */

function newAffaire() {
  return {
    id: uid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    archived: false,
    statutPipeline: 'En cours',
    identite: {
      client: '', site: '', reference: '', commercial: '',
      montant: '', montantConfirme: '', declencheur: '', etapeProcessus: ''
    },
    blocRepriseImporte: null,
    rdvs: [],
    score40Evaluations: [],
    qualification: newQualification(),
    mission: newMission(),
    controles: newControles()
  };
}

/* ---------------- Persistance ---------------- */

const Store = (() => {
  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.affaires = parsed.affaires || [];
        return parsed;
      }
    } catch (e) {
      console.error('Erreur lecture localStorage', e);
    }
    return { affaires: [] };
  }

  let persistFailed = false;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur écriture localStorage', e);
      if (!persistFailed) {
        persistFailed = true;
        if (typeof showToast === 'function') {
          showToast('⚠ Stockage indisponible : vos modifications ne seront pas sauvegardées après fermeture de la page.');
        }
      }
    }
  }

  return {
    listAffaires(includeArchived = true) {
      return data.affaires
        .filter(a => includeArchived || !a.archived)
        .slice()
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    },
    getAffaire(id) {
      return data.affaires.find(a => a.id === id) || null;
    },
    createAffaire() {
      const a = newAffaire();
      data.affaires.push(a);
      persist();
      return a;
    },
    duplicateAffaire(id) {
      const src = this.getAffaire(id);
      if (!src) return null;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      copy.createdAt = nowISO();
      copy.updatedAt = nowISO();
      copy.archived = false;
      copy.identite.reference = src.identite.reference ? src.identite.reference + ' (copie)' : '';
      data.affaires.push(copy);
      persist();
      return copy;
    },
    updateAffaire(id, mutator) {
      const a = this.getAffaire(id);
      if (!a) return null;
      mutator(a);
      a.updatedAt = nowISO();
      persist();
      return a;
    },
    setArchived(id, archived) {
      return this.updateAffaire(id, a => { a.archived = archived; });
    },
    removeAffaire(id) {
      data.affaires = data.affaires.filter(a => a.id !== id);
      persist();
    },

    addRdv(affaireId) {
      let rdv;
      this.updateAffaire(affaireId, a => { rdv = newRdv(); a.rdvs.push(rdv); });
      return rdv;
    },
    removeRdv(affaireId, rdvId) {
      this.updateAffaire(affaireId, a => { a.rdvs = a.rdvs.filter(r => r.id !== rdvId); });
    },

    addScore40Evaluation(affaireId) {
      let ev;
      this.updateAffaire(affaireId, a => { ev = newScore40Evaluation(); a.score40Evaluations.push(ev); });
      return ev;
    },
    removeScore40Evaluation(affaireId, evalId) {
      this.updateAffaire(affaireId, a => { a.score40Evaluations = a.score40Evaluations.filter(e => e.id !== evalId); });
    },

    exportJSON() {
      return JSON.stringify(data, null, 2);
    },
    importJSON(json) {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.affaires)) throw new Error('Format invalide');
      data = { affaires: parsed.affaires };
      persist();
    },
    raw() { return data; }
  };
})();
