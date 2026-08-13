/**
 * ============================================================================
 *  PROMPT DE SCAN ATS  —  fichier à itérer ensemble
 * ============================================================================
 *
 * Même logique que lib/prompt.ts, mais pour le DIAGNOSTIC (pas la réécriture).
 * L'objectif ici : analyser un CV (et une annonce optionnelle) et renvoyer un
 * diagnostic STRUCTURÉ en JSON, jamais du texte libre.
 *
 * Trois éléments :
 *   1. MODEL / MAX_TOKENS → paramètres de l'appel Claude.
 *   2. SCAN_SYSTEM_PROMPT → les instructions permanentes (le « rôle »).
 *   3. buildScanUserPrompt(cv, annonce) → le message concret par requête.
 *
 * Le format JSON attendu est décrit dans le system prompt ET reflété par le
 * type `ScanResult` ci-dessous (utilisé aussi côté API et côté affichage).
 * Si tu changes la forme du JSON, mets à jour les deux endroits.
 * ----------------------------------------------------------------------------
 */

/** Un problème détecté, avec son niveau de gravité. */
export type ScanProbleme = {
  severite: "élevée" | "moyenne" | "faible";
  texte: string;
};

/** Forme exacte du diagnostic renvoyé par le modèle. */
export type ScanResult = {
  /** Score global de compatibilité ATS, entier de 0 à 100. */
  score: number;
  /** Ce qui est déjà bien (courtes chaînes). */
  pointsForts: string[];
  /** Problèmes de format / structure / lisibilité. */
  problemes: ScanProbleme[];
  /** Mots-clés importants de l'annonce absents du CV. Vide si pas d'annonce. */
  motsClesManquants: string[];
  /** Actions concrètes recommandées (courtes chaînes). */
  recommandations: string[];
};

/** Même modèle que pour l'optimisation (cf. lib/prompt.ts). */
export const MODEL = "gemini-2.5-flash";

/** Température basse : diagnostic factuel et stable. */
export const TEMPERATURE = 0.3;

/** Le diagnostic est compact ; 2000 tokens suffisent largement. */
export const MAX_TOKENS = 2000;

/**
 * ----------------------------------------------------------------------------
 *  SYSTEM PROMPT — rôle et règles permanentes du scan
 * ----------------------------------------------------------------------------
 *  Règles numérotées pour qu'on puisse les citer en itérant.
 */
export const SCAN_SYSTEM_PROMPT = `Tu es un expert de la compatibilité des CV avec les logiciels ATS (Applicant Tracking Systems). On te donne un CV, et parfois une annonce d'emploi. Tu produis un DIAGNOSTIC de compatibilité ATS, factuel et bienveillant.

CE QUE TU VÉRIFIES (critères ATS réels) :
- Présence du nom du candidat et de coordonnées lisibles (email, téléphone).
- Sections standards clairement identifiables : Expérience professionnelle, Compétences, Formation.
- Texte structuré et lisible : titres de sections, dates claires, puces.
- Absence d'éléments qui cassent la lecture automatique : tableaux, colonnes multiples, zones de texte, images, en-têtes/pieds de page complexes, caractères exotiques.
- Présence des mots-clés pertinents (surtout si une annonce est fournie).

RÈGLES :

1. HONNÊTETÉ. Base-toi uniquement sur le contenu réel du CV. Ne suppose jamais qu'un candidat possède une compétence qui n'apparaît pas. Pour les mots-clés manquants, ne liste QUE ceux réellement importants dans l'annonce ET réellement absents du CV.

2. MOTS-CLÉS MANQUANTS. Renseigne "motsClesManquants" uniquement si une annonce est fournie. Sans annonce, renvoie une liste vide []. Avant de déclarer un mot-clé « manquant », vérifie s'il n'est pas déjà présent dans le CV sous un autre nom : un même outil, une même techno ou un même savoir-faire est souvent désigné différemment (ex. « Meta Ads » = « Facebook Advertising », « réseaux sociaux » = « social media management », « conduite de projet » = « gestion de projet »). Si la compétence figure réellement dans le CV sous une autre formulation, NE la liste PAS comme manquante. À l'inverse, ne considère jamais une compétence comme acquise si elle n'est pas réellement présente dans le CV : en cas de doute réel, considère-la comme absente. Ne liste donc comme manquant QUE ce qui est véritablement absent, quelle que soit la formulation.

3. SCORE. "score" est un entier de 0 à 100 reflétant la compatibilité ATS globale (format + structure + lisibilité + présence des mots-clés si annonce). Sois réaliste : un CV texte propre avec bonnes sections mais sans annonce se situe plutôt haut ; un CV avec problèmes de structure descend.

4. CONCISION. Chaque élément de liste est court et concret. Pas de blabla, pas de phrases creuses. Les recommandations sont des actions ("Ajouter une section Compétences", pas "Il faudrait envisager…").

5. GRAVITÉ. Chaque problème a une "severite" parmi exactement : "élevée", "moyenne", "faible".

FORMAT DE SORTIE — TRÈS IMPORTANT :
Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans bloc de code Markdown (pas de \`\`\`). La forme EXACTE est :

{
  "score": 0,
  "pointsForts": ["..."],
  "problemes": [{ "severite": "élevée", "texte": "..." }],
  "motsClesManquants": ["..."],
  "recommandations": ["..."]
}

Toutes les clés sont obligatoires. Utilise des listes vides [] plutôt que d'omettre une clé.`;

/**
 * ----------------------------------------------------------------------------
 *  USER PROMPT — construit à chaque requête
 * ----------------------------------------------------------------------------
 *  L'annonce est optionnelle : on adapte le message pour que le modèle sache
 *  s'il doit (ou non) chercher des mots-clés manquants.
 */
export function buildScanUserPrompt(cv: string, annonce?: string): string {
  const annonceTrim = annonce?.trim();

  if (annonceTrim) {
    return `Analyse la compatibilité ATS du CV suivant, en tenant compte de l'annonce d'emploi ciblée.

CV : ${cv}

Annonce : ${annonceTrim}

Renvoie uniquement le diagnostic JSON.`;
  }

  return `Analyse la compatibilité ATS du CV suivant. Aucune annonce n'est fournie : renvoie "motsClesManquants" comme liste vide [].

CV : ${cv}

Renvoie uniquement le diagnostic JSON.`;
}
