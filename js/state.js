/* ============================================================
   Modèle de données + persistance (localStorage)
   Outil "CAP Compétitivité — Boîte à outils" — gestion d'affaires
   ============================================================ */

const STORAGE_KEY = 'agentCeng.affaires.v1';

const COULEURS = ['VERT', 'ORANGE', 'ROSE'];

const CONTRAINTES_SITE_OPTIONS = [
  'Site occupé', 'ICPE', 'SEVESO', 'Permis feu', 'Travail de nuit', 'Arrêts programmés'
];

const PIECES_ECHIQUIER = ['Roi', 'Reine', 'Tour', 'Fou', 'Cavalier', 'Pion'];

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

const QUESTIONS_QUALIFICATION = [
  'Historique avec ce client',
  'Marge estimée sur cette affaire',
  'Le client est-il transparent ?',
  'Connaît-on le décisionnaire (chaîne de décision / échiquier) ?',
  'Relation directe avec le client ou indirecte (MOE/BET/AMO) ?',
  'Connaît-on les enjeux de ce client ?',
  'Existe-t-il un potentiel de développement ?',
  'Concurrents identifiés sur cette affaire',
  'Le site est-il déjà équipé ?',
  'Le client a-t-il un projet déjà étudié mais non abouti ?',
  'Volonté travaux : obligation réglementaire ou demande forte (DREAL, assureur) ?',
  'Capacité du client à investir'
];

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

function emptyGrilleRow() {
  return { reponse: '', ptsOrange: 0, ptsRose: 0 };
}

function newAffaire() {
  return {
    id: uid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    archived: false,
    statutPipeline: 'En cours',
    identite: {
      client: '', site: '', reference: '', commercial: '',
      dateRdv: '', montant: '', declencheur: ''
    },
    rdv: {
      typeRdv: '', coupNumero: '', couleurPressentie: '', couleurConfirmee: '', statutRdv: '',
      interNom: '', interFonction: '', interRole: '', interStatut: '',
      interInfluence: '', interPosture: '', interPiece: '',
      axeDev: '', strategieCoup: '',
      enjeux: ['', '', ''],
      objectifs: ['', '', ''],
      infos: ['', '', '', '', ''],
      resultatMin: '', prochaineEtape: '', dateProchaineEtape: '',
      impressions: '', motsCles: ''
    },
    score40: {
      phaseAffaire: '',
      notes: [0, 0, 0, 0, 0, 0, 0, 0],
      decideurs: '', enjeuxGeneraux: '', budgetValide: '', dateDemarrageDelai: '', organigramme: '',
      pieces: { Roi: '', Reine: '', Tour: '', Fou: '', Cavalier: '', Pion: '' },
      strategieActions: ['', '', '']
    },
    qualification: {
      litige: '', clientConnu: '', pctReussite: '', contratCadre: '',
      grille: Array.from({ length: 12 }, emptyGrilleRow),
      couleurRetenue: '', justification: ''
    },
    mission: {
      affaireProjet: '', dateRemiseSouhaitee: '',
      enjeuDominant: '', contraintesSite: [],
      probabilite: '', initiateur: '', concurrents: '', budgetClient: '', pourquoiGagner: '',
      typeProjet: '', activite: '', referentiel: '', documentsDispo: '', planningClient: '',
      niveauDemande: '', indiceEffort: '',
      risques: '',
      commercialNom: '', commercialDate: '', respCommercialNom: '', respCommercialDate: '', activationCENG: ''
    }
  };
}

function newSnapshotPlanAction(prev) {
  const mk = (couleur) => ({
    prevues: prev ? prev.heures[couleur].prevues : '',
    engagees: ''
  });
  return {
    id: uid(),
    date: todayISODate(),
    label: '',
    objectifAnnuel: prev ? prev.objectifAnnuel : '',
    realiseADate: '',
    heures: { ORANGE: mk('ORANGE'), VERT: mk('VERT'), ROSE: mk('ROSE') }
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
        parsed.planAction = parsed.planAction || [];
        return parsed;
      }
    } catch (e) {
      console.error('Erreur lecture localStorage', e);
    }
    return { affaires: [], planAction: [] };
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

    listPlanAction() {
      return data.planAction.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    getSnapshot(id) {
      return data.planAction.find(s => s.id === id) || null;
    },
    createSnapshot() {
      const latest = this.listPlanAction()[0] || null;
      const s = newSnapshotPlanAction(latest);
      data.planAction.push(s);
      persist();
      return s;
    },
    updateSnapshot(id, mutator) {
      const s = this.getSnapshot(id);
      if (!s) return null;
      mutator(s);
      persist();
      return s;
    },
    removeSnapshot(id) {
      data.planAction = data.planAction.filter(s => s.id !== id);
      persist();
    },

    exportJSON() {
      return JSON.stringify(data, null, 2);
    },
    importJSON(json) {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.affaires)) throw new Error('Format invalide');
      data = { affaires: parsed.affaires, planAction: parsed.planAction || [] };
      persist();
    },
    replaceAll(newData) {
      data = newData;
      persist();
    },
    raw() { return data; }
  };
})();

/* ---------------- Calculs métier ---------------- */

function computeScore40Total(affaire) {
  return affaire.score40.notes.reduce((s, n) => s + (Number(n) || 0), 0);
}

function computeQualiTotaux(affaire) {
  const orange = affaire.qualification.grille.reduce((s, r) => s + (Number(r.ptsOrange) || 0), 0);
  const rose = affaire.qualification.grille.reduce((s, r) => s + (Number(r.ptsRose) || 0), 0);
  return { orange, rose };
}

function computeResultatEtape1(affaire) {
  const q = affaire.qualification;
  if (q.clientConnu === 'Oui' || q.contratCadre === 'Oui') {
    return { texte: 'VERT automatique (un déclencheur suffit)', vertAuto: true };
  }
  return { texte: "Aucun déclencheur direct → passer à l'Étape 2", vertAuto: false };
}

function computeCouleurSuggeree(affaire) {
  const q = affaire.qualification;
  if (q.litige === 'Oui') return { couleur: 'ROSE', motif: 'Garde-fou : litige actif → ROSE forcé' };
  const etape1 = computeResultatEtape1(affaire);
  if (etape1.vertAuto) return { couleur: 'VERT', motif: 'Étape 1 : client connu et/ou contrat-cadre en cours' };
  const { orange, rose } = computeQualiTotaux(affaire);
  if (orange === 0 && rose === 0) return { couleur: '', motif: 'Renseignez la grille de l’Étape 2' };
  if (orange === rose) return { couleur: '', motif: 'Égalité Orange/Rose — arbitrage manuel requis' };
  return {
    couleur: orange > rose ? 'ORANGE' : 'ROSE',
    motif: `Étape 2 : score ${orange > rose ? 'Orange' : 'Rose'} dominant (Orange ${orange} / Rose ${rose})`
  };
}

function computeReste(snapshot) {
  const obj = Number(snapshot.objectifAnnuel);
  const rea = Number(snapshot.realiseADate);
  if (!snapshot.objectifAnnuel && snapshot.objectifAnnuel !== 0) return null;
  return obj - (rea || 0);
}

function computePct(snapshot) {
  const obj = Number(snapshot.objectifAnnuel);
  if (!obj) return null;
  const rea = Number(snapshot.realiseADate) || 0;
  return rea / obj;
}

function computeHeures(entry) {
  const prevues = Number(entry.prevues);
  const engagees = Number(entry.engagees) || 0;
  if (!entry.prevues && entry.prevues !== 0) return null;
  const restantes = prevues - engagees;
  const pct = prevues === 0 ? 0 : engagees / prevues;
  return { restantes, pct };
}

function isActivationCENGRequise(affaire) {
  const m = Number(affaire.identite.montant);
  return !isNaN(m) && m >= SEUIL_CENG;
}
