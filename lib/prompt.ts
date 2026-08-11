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

4. Format lisible par les ATS. Uniquement du texte simple : titres de sections standards (Expérience professionnelle, Compétences, Formation…), des puces, des dates claires. Pas de tableaux, colonnes, zones de texte, images, en-têtes/pieds de page ni caractères exotiques.

5. Verbes d'action. Reformule les expériences avec des verbes d'action forts. N'utilise que les chiffres réellement présents dans le CV, n'en invente aucun.

6. Langue. Rédige le CV dans la langue de l'annonce.

7. Sortie. Renvoie uniquement le CV réécrit, prêt à copier, en texte structuré clair. Aucun commentaire ni explication autour.`;

/**
 * ----------------------------------------------------------------------------
 *  USER PROMPT — construit à chaque requête
 * ----------------------------------------------------------------------------
 *  Reprend la fin du prompt : le CV et l'annonce sont injectés via les
 *  variables `cv` et `annonce` (équivalents des {cv} et {annonce}).
 */
export function buildUserPrompt(cv: string, annonce: string): string {
  return `CV : ${cv}

Annonce : ${annonce}`;
}
