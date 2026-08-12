/**
 * ============================================================================
 *  PROMPT D'OPTIMISATION ATS  —  fichier à itérer ensemble
 * ============================================================================
 *
 * C'est ICI que se joue la qualité du résultat. Le reste de l'app n'est que
 * de la plomberie : ce fichier contient toute la « logique métier » sous forme
 * de texte. On peut le modifier sans toucher au code de l'API.
 *
 * Trois choses à connaître :
 *
 *   1. MODEL          → quel modèle Claude on appelle.
 *   2. SYSTEM_PROMPT  → les instructions permanentes (le « rôle » de Claude).
 *   3. buildUserPrompt(cv, annonce) → le message concret, construit à chaque
 *      requête avec le CV et l'annonce de l'utilisateur.
 *
 * Pour itérer : modifie surtout SYSTEM_PROMPT. C'est l'endroit le plus
 * rentable. Chaque section est numérotée et commentée pour qu'on puisse
 * discuter d'une section précise (« change le point 4 »).
 * ----------------------------------------------------------------------------
 */

/**
 * ----------------------------------------------------------------------------
 *  FORME DU CV OPTIMISÉ (contenu structuré renvoyé par le modèle)
 * ----------------------------------------------------------------------------
 *  L'optimisation ne renvoie PLUS un bloc de texte, mais un objet structuré.
 *  Ce type est la source de vérité partagée par le prompt, l'API, l'affichage
 *  et l'export .docx. Si tu changes la forme, mets à jour le SYSTEM_PROMPT.
 */
export type CvContact = {
  ville: string;
  telephone: string;
  email: string;
  portfolio: string;
};

export type CvExperience = {
  poste: string;
  entreprise: string;
  dates: string;
  puces: string[];
};

export type CvFormation = {
  intitule: string;
  etablissement: string;
  dates: string;
};

export type CvContent = {
  /** Vide si absent du CV — jamais inventé. */
  nom: string;
  /** Intitulé de poste visé / actuel. */
  titre: string;
  contact: CvContact;
  /** Court paragraphe de profil. */
  profil: string;
  experiences: CvExperience[];
  competences: string[];
  formation: CvFormation[];
};

/**
 * Valide et normalise la sortie du modèle vers la forme CvContent. On ne fait
 * pas confiance aveuglément au modèle : chaque champ manquant devient une
 * chaîne vide, chaque liste manquante une liste vide, et on retire tout symbole
 * Markdown résiduel (astérisques, dièses) qui aurait pu se glisser dans un champ.
 */
export function normalizeCvContent(data: unknown): CvContent {
  const obj = (data ?? {}) as Record<string, unknown>;

  const clean = (v: unknown): string =>
    typeof v === "string"
      ? v.replace(/[*_`~]/g, "").replace(/^\s*#+\s*/, "").trim()
      : "";

  const cleanList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(clean).filter((s) => s.length > 0) : [];

  const contact = (obj.contact ?? {}) as Record<string, unknown>;

  const experiences: CvExperience[] = Array.isArray(obj.experiences)
    ? obj.experiences.map((e) => {
        const eo = (e ?? {}) as Record<string, unknown>;
        return {
          poste: clean(eo.poste),
          entreprise: clean(eo.entreprise),
          dates: clean(eo.dates),
          puces: cleanList(eo.puces),
        };
      })
    : [];

  const formation: CvFormation[] = Array.isArray(obj.formation)
    ? obj.formation.map((f) => {
        const fo = (f ?? {}) as Record<string, unknown>;
        return {
          intitule: clean(fo.intitule),
          etablissement: clean(fo.etablissement),
          dates: clean(fo.dates),
        };
      })
    : [];

  return {
    nom: clean(obj.nom),
    titre: clean(obj.titre),
    contact: {
      ville: clean(contact.ville),
      telephone: clean(contact.telephone),
      email: clean(contact.email),
      portfolio: clean(contact.portfolio),
    },
    profil: clean(obj.profil),
    experiences,
    competences: cleanList(obj.competences),
    formation,
  };
}

/**
 * Modèle Claude utilisé.
 * - claude-sonnet-5 : bon équilibre qualité / vitesse / coût (recommandé).
 * - claude-opus-5   : qualité maximale, plus lent et plus cher.
 * Change simplement la valeur ci-dessous pour tester un autre modèle.
 */
export const MODEL = "claude-sonnet-5";

/**
 * Nombre max de tokens en sortie. Un CV réécrit complet (surtout un profil
 * senior avec plusieurs postes) peut dépasser 4000 tokens et se faire couper.
 * 8000 laisse une marge large sans surcoût si la réponse est courte
 * (on ne paie que les tokens réellement générés).
 */
export const MAX_TOKENS = 8000;

/**
 * NOTE : les modèles Claude récents (sonnet-5 / opus-5) ne prennent plus le
 * paramètre `temperature` — il est déprécié et provoque une erreur 400. On ne
 * l'envoie donc pas. (Sur d'anciens modèles, on pourrait le réactiver.)
 */

/**
 * ----------------------------------------------------------------------------
 *  SYSTEM PROMPT — le rôle et les règles permanentes de Claude
 * ----------------------------------------------------------------------------
 *  Les règles sont numérotées pour qu'on puisse les citer facilement quand on
 *  itère (ex. « assouplis la règle 5 », « supprime la règle 7 »).
 */
export const SYSTEM_PROMPT = `Tu es un expert de l'optimisation de CV pour les logiciels ATS (Applicant Tracking Systems) et du recrutement.

On te donne le CV d'un candidat et une annonce d'emploi. Réécris le CV pour qu'il soit à la fois bien classé par les ATS et convaincant pour le recruteur humain qui le lira ensuite, SANS jamais inventer d'informations.

Règles :

1. Honnêteté absolue. N'invente jamais d'expérience, d'employeur, de diplôme, de date, de compétence ni de résultat. Tu ne fais que reformuler, réorganiser et mettre en valeur ce qui existe déjà. Si une compétence demandée par l'annonce est absente du CV, ne l'ajoute pas. Concernant les intitulés de poste et l'ancienneté : tu peux mettre en avant les activités pertinentes d'une expérience, mais tu ne dois pas requalifier un intitulé de poste ni gonfler une durée d'expérience. Si le candidat présente un profil global (ex. « Community Manager avec X ans »), la durée annoncée doit refléter honnêtement l'expérience réelle sur cette activité précise, et non cumuler des postes sans rapport.

2. Mots-clés de l'annonce. Repère les compétences, outils, technologies, intitulés de poste et qualifications clés de l'annonce. Quand le candidat les possède vraiment, reprends la formulation EXACTE de l'annonce (les ATS font souvent une correspondance littérale : si l'annonce dit « gestion de projet », écris « gestion de projet », pas un synonyme). Quand une compétence RÉELLEMENT présente dans le CV correspond à un outil ou une technologie cité dans l'annonce sous un autre nom (ex. « Meta Ads » = « Facebook Advertising », « réseaux sociaux » = « social media management »), utilise le terme EXACT de l'annonce, en conservant éventuellement le nom d'origine entre parenthèses. Ne fais jamais ce rapprochement si le candidat ne possède pas vraiment la compétence.

3. Pertinence en premier. Réorganise le contenu pour que les expériences et compétences les plus pertinentes pour ce poste soient en haut et les plus développées.

4. Contenu lisible par les ATS. Structure standard : profil, expérience professionnelle (antéchronologique), compétences, formation. Reste factuel et sobre : pas de caractères exotiques, pas d'emojis, aucun symbole de mise en forme (ni astérisques, ni # de titre) à l'intérieur des valeurs — le texte de chaque champ est du texte simple.

5. Verbes d'action. Reformule les expériences avec des verbes d'action forts. N'utilise que les chiffres réellement présents dans le CV, n'en invente aucun.

5 bis. Dates intactes. Reporte les dates (mois, années, périodes) EXACTEMENT telles qu'elles figurent dans le CV. Ne les modifie pas, ne les arrondis pas, n'en déduis pas de nouvelles.

6. Langue. Rédige le CV dans la langue de l'annonce.

7. CHAMPS VIDES. Ne remplis un champ que si l'information existe réellement dans le CV. Si une information est absente, laisse une chaîne vide "" (ou une liste vide []) — n'invente JAMAIS un nom, un email, un téléphone, une ville, un portfolio, une date ou une entreprise.

8. FORMAT DE SORTIE — TRÈS IMPORTANT. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans bloc de code Markdown (pas de \`\`\`). La forme EXACTE, avec toutes les clés obligatoires, est :

{
  "nom": "",
  "titre": "",
  "contact": { "ville": "", "telephone": "", "email": "", "portfolio": "" },
  "profil": "",
  "experiences": [ { "poste": "", "entreprise": "", "dates": "", "puces": [""] } ],
  "competences": [""],
  "formation": [ { "intitule": "", "etablissement": "", "dates": "" } ]
}

Utilise des chaînes vides "" et des listes vides [] plutôt que d'omettre une clé. "puces" est la liste des points d'une expérience (chaque puce est une phrase courte commençant par un verbe d'action).`;

/**
 * ----------------------------------------------------------------------------
 *  USER PROMPT — construit à chaque requête
 * ----------------------------------------------------------------------------
 *  Reprend la fin du prompt : le CV et l'annonce sont injectés via les
 *  variables `cv` et `annonce` (équivalents des {cv} et {annonce}).
 */
export function buildUserPrompt(cv: string, annonce: string): string {
  return `CV : ${cv}

Annonce : ${annonce}

Renvoie uniquement le JSON du CV optimisé.`;
}

/**
 * ----------------------------------------------------------------------------
 *  RENDU TEXTE — pour le bouton « Copier »
 * ----------------------------------------------------------------------------
 *  Transforme le CV structuré en texte brut propre (aucun symbole Markdown).
 *  N'affiche que les champs réellement remplis.
 */
export function cvContentToText(cv: CvContent): string {
  const lines: string[] = [];

  if (cv.nom.trim()) lines.push(cv.nom.trim());
  if (cv.titre.trim()) lines.push(cv.titre.trim());

  const contact = [
    cv.contact.ville,
    cv.contact.telephone,
    cv.contact.email,
    cv.contact.portfolio,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "));

  if (cv.profil.trim()) {
    lines.push("", "PROFIL", cv.profil.trim());
  }

  const exps = cv.experiences.filter(
    (e) => e.poste.trim() || e.entreprise.trim() || e.puces.some((p) => p.trim())
  );
  if (exps.length) {
    lines.push("", "EXPÉRIENCE PROFESSIONNELLE");
    exps.forEach((e) => {
      const entete = [e.poste.trim(), e.entreprise.trim()]
        .filter(Boolean)
        .join(" — ");
      const dates = e.dates.trim();
      lines.push(dates ? `${entete} (${dates})` : entete);
      e.puces
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => lines.push(`- ${p}`));
    });
  }

  const comps = cv.competences.map((c) => c.trim()).filter(Boolean);
  if (comps.length) {
    lines.push("", "COMPÉTENCES");
    comps.forEach((c) => lines.push(`- ${c}`));
  }

  const forms = cv.formation.filter(
    (f) => f.intitule.trim() || f.etablissement.trim() || f.dates.trim()
  );
  if (forms.length) {
    lines.push("", "FORMATION");
    forms.forEach((f) => {
      const entete = [f.intitule.trim(), f.etablissement.trim()]
        .filter(Boolean)
        .join(" — ");
      const dates = f.dates.trim();
      lines.push(dates ? `${entete} (${dates})` : entete);
    });
  }

  return lines.join("\n").trim();
}
