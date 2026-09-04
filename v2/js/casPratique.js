/* ============================================================
   Module "Cas pratique" — simulation pédagogique (convention)
   Indépendant du suivi des affaires réelles : données, calculs
   et stockage propres (cf. Cahier des charges V1.0, 04/09/2026).
   ============================================================ */

const CP_STORAGE_KEY = 'agentCeng.casPratique.v1';

const CP_COULEURS = ['VERT', 'ORANGE', 'ROSE'];
const CP_MAINTENANCE_OPTIONS = [
  { value: 'nous', label: 'Nous' },
  { value: 'concurrent', label: 'Un concurrent' },
  { value: 'neutre', label: 'Neutre' }
];

function cpDefaultParams() {
  return {
    coeffHeure: { VERT: 6000, ORANGE: 3500, ROSE: 12000 },
    ptsParHeureSupp: 2,
    plafondHeuresSupp: 10,
    ptsParPointMarge: 5,
    malusParConcurrent: 0.05,
    coefMaintenance: { nous: 1.20, concurrent: 0.95, neutre: 1.00 },
    lancersSupp: [
      { min: 0, max: 19, supp: 0 },
      { min: 20, max: 29, supp: 1 },
      { min: 30, max: 40, supp: 2 }
    ],
    seuilReussite: 'strict', // 'strict' (6 seul) | 'souple' (5 ou 6)
    racVise: 1000000,
    capaciteTotale: 300
  };
}

function cpUid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function cpNewAffairePortefeuille() {
  return { id: cpUid(), nom: '', couleur: 'ORANGE', montant: '', nbConcurrents: 0, maintenance: 'neutre' };
}

function cpHeuresRequises(affaire, params) {
  const coeff = params.coeffHeure[affaire.couleur];
  const montant = Number(affaire.montant) || 0;
  if (!coeff) return 0;
  return montant / coeff;
}

/* ---------------- Calcul du taux de réussite (3.2) ---------------- */

function cpTauxReussite(engagement, affaire, params) {
  const heuresSuppEff = Math.min(Number(engagement.heuresSupp) || 0, params.plafondHeuresSupp);
  const bonusHeures = heuresSuppEff * params.ptsParHeureSupp;
  const bonusMarge = (Number(engagement.baisseMarge) || 0) * params.ptsParPointMarge;
  const sousTotal = (Number(engagement.tauxBase) || 0) + bonusHeures + bonusMarge;
  const coefConcurrents = 1 - params.malusParConcurrent * (Number(affaire.nbConcurrents) || 0);
  const coefMaintenance = params.coefMaintenance[affaire.maintenance] ?? 1;
  let taux = sousTotal * coefConcurrents * coefMaintenance;
  taux = Math.max(0, Math.min(95, taux));
  return taux;
}

function cpDetailTauxReussite(engagement, affaire, params) {
  const heuresSuppEff = Math.min(Number(engagement.heuresSupp) || 0, params.plafondHeuresSupp);
  const bonusHeures = heuresSuppEff * params.ptsParHeureSupp;
  const bonusMarge = (Number(engagement.baisseMarge) || 0) * params.ptsParPointMarge;
  const sousTotal = (Number(engagement.tauxBase) || 0) + bonusHeures + bonusMarge;
  const coefConcurrents = 1 - params.malusParConcurrent * (Number(affaire.nbConcurrents) || 0);
  const coefMaintenance = params.coefMaintenance[affaire.maintenance] ?? 1;
  const brut = sousTotal * coefConcurrents * coefMaintenance;
  return {
    tauxBase: Number(engagement.tauxBase) || 0,
    bonusHeures, heuresSuppEff,
    bonusMarge,
    sousTotal,
    coefConcurrents, coefMaintenance,
    brut,
    final: Math.max(0, Math.min(95, brut)),
    plafonne: brut > 95
  };
}

/* ---------------- Score 40 -> lancers supplémentaires (3.3) ---------------- */

function cpLancersSupplementaires(score40, params) {
  const s = Number(score40) || 0;
  const tier = params.lancersSupp.find(t => s >= t.min && s <= t.max);
  return tier ? tier.supp : 0;
}

/* ---------------- Tirage de résolution (3.4) ---------------- */

function cpLancersBase(tauxFinal) {
  return Math.ceil((Number(tauxFinal) || 0) / 10);
}

function cpLancersTotaux(engagement, affaire, params) {
  const taux = cpTauxReussite(engagement, affaire, params);
  const base = cpLancersBase(taux);
  const supp = cpLancersSupplementaires(engagement.score40, params);
  return base + supp;
}

function cpSeuilAtteint(valeur, seuil) {
  return seuil === 'strict' ? valeur === 6 : (valeur === 5 || valeur === 6);
}

function cpResultatEngagement(engagement, lancersTotaux, params) {
  if (engagement.lancers.length < lancersTotaux) return null;
  const reussi = engagement.lancers.some(v => cpSeuilAtteint(v, params.seuilReussite));
  return reussi ? 'gagnee' : 'perdue';
}

/* ---------------- Engagement (affaire jouée par la table) ---------------- */

function cpNewEngagement(affaire) {
  return {
    id: cpUid(),
    affaireId: affaire.id,
    nomAffaire: affaire.nom, couleur: affaire.couleur, montant: affaire.montant,
    nbConcurrents: affaire.nbConcurrents, maintenance: affaire.maintenance,
    tauxBase: '', heuresSupp: 0, baisseMarge: 0, score40: '',
    lancers: [],
    engagedAt: nowISO()
  };
}

/* ---------------- Store dédié (localStorage isolé) ---------------- */

const CasPratiqueStore = (() => {
  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(CP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          params: Object.assign(cpDefaultParams(), parsed.params || {}),
          portefeuille: Array.isArray(parsed.portefeuille) ? parsed.portefeuille : [],
          engagements: Array.isArray(parsed.engagements) ? parsed.engagements : []
        };
      }
    } catch (e) { console.error('Erreur lecture localStorage (cas pratique)', e); }
    return { params: cpDefaultParams(), portefeuille: [], engagements: [] };
  }

  let persistFailed = false;
  function persist() {
    try {
      localStorage.setItem(CP_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur écriture localStorage (cas pratique)', e);
      if (!persistFailed) {
        persistFailed = true;
        if (typeof showToast === 'function') showToast('⚠ Stockage indisponible : vos modifications ne seront pas sauvegardées après fermeture de la page.');
      }
    }
  }

  return {
    getParams() { return data.params; },
    updateParams(mutator) { mutator(data.params); persist(); },
    resetParams() { data.params = cpDefaultParams(); persist(); },

    listPortefeuille() { return data.portefeuille; },
    addAffairePortefeuille() { const a = cpNewAffairePortefeuille(); data.portefeuille.push(a); persist(); return a; },
    updateAffairePortefeuille(id, mutator) {
      const a = data.portefeuille.find(x => x.id === id);
      if (a) { mutator(a); persist(); }
      return a;
    },
    removeAffairePortefeuille(id) {
      data.portefeuille = data.portefeuille.filter(a => a.id !== id);
      persist();
    },

    listEngagements() { return data.engagements; },
    getEngagement(id) { return data.engagements.find(e => e.id === id) || null; },
    engagerAffaire(affaireId) {
      const affaire = data.portefeuille.find(a => a.id === affaireId);
      if (!affaire) return null;
      const eng = cpNewEngagement(affaire);
      data.engagements.push(eng);
      persist();
      return eng;
    },
    updateEngagement(id, mutator) {
      const e = data.engagements.find(x => x.id === id);
      if (e) { mutator(e); persist(); }
      return e;
    },
    removeEngagement(id) {
      data.engagements = data.engagements.filter(e => e.id !== id);
      persist();
    },
    lancerDe(id) {
      const e = data.engagements.find(x => x.id === id);
      if (!e) return null;
      const affaire = data.portefeuille.find(a => a.id === e.affaireId) ||
        { couleur: e.couleur, montant: e.montant, nbConcurrents: e.nbConcurrents, maintenance: e.maintenance };
      const totaux = cpLancersTotaux(e, affaire, data.params);
      if (e.lancers.length >= totaux) return null;
      const valeur = 1 + Math.floor(Math.random() * 6);
      e.lancers.push(valeur);
      persist();
      return valeur;
    },

    exportConfig() {
      return JSON.stringify({ params: data.params, portefeuille: data.portefeuille }, null, 2);
    },
    importConfig(json) {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object') throw new Error('Format invalide');
      data.params = Object.assign(cpDefaultParams(), parsed.params || {});
      data.portefeuille = Array.isArray(parsed.portefeuille) ? parsed.portefeuille : [];
      persist();
    },
    raw() { return data; }
  };
})();
