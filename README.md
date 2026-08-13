# CV-ATS

Web app pour réécrire un CV en version optimisée **ATS** (Applicant Tracking System) à partir d'une annonce d'emploi, via l'API Anthropic (Claude).

Next.js (App Router) · TypeScript · aucune donnée stockée.

## Fonctionnement

Une seule page :

1. Colle **ton CV** dans la première zone.
2. Colle **l'annonce d'emploi** dans la seconde.
3. Clique sur **Optimiser**.
4. Récupère le CV réécrit et **copie-le** en un clic.

Le CV et l'annonce sont envoyés à Claude le temps de la requête, puis oubliés — rien n'est enregistré côté serveur.

## Installation

```bash
cd cv-ats
npm install
```

Configure ta clé API :

```bash
cp .env.local.example .env.local
```

Puis édite `.env.local` et remplace la valeur par ta vraie clé
(obtenue sur https://console.anthropic.com/) :

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Lancer en développement

```bash
npm run dev
```

Ouvre http://localhost:3000.

## Itérer sur le prompt

Toute la qualité du résultat vient du fichier **[`lib/prompt.ts`](lib/prompt.ts)**.
Il est isolé et commenté exprès pour qu'on l'ajuste ensemble :

- `MODEL` — quel modèle Claude appeler.
- `SYSTEM_PROMPT` — les règles permanentes, numérotées pour en discuter une par une.
- `buildUserPrompt()` — le message construit à chaque requête.

Modifier ce fichier ne demande de toucher à aucun autre code.

## Structure

```
cv-ats/
├─ app/
│  ├─ page.tsx              # l'unique page (2 zones + bouton + résultat)
│  ├─ layout.tsx
│  ├─ globals.css
│  └─ api/optimize/route.ts # appelle l'API Anthropic
├─ lib/
│  └─ prompt.ts             # ← le prompt, à itérer ensemble
└─ .env.local.example       # modèle de configuration de la clé
```

## Recréer cette app toi-même

Tu veux repartir de zéro (autre stack, autre design, ou juste pour apprendre) ?
Copie-colle le prompt ci-dessous dans un assistant de code IA (Claude Code, Cursor,
v0, ChatGPT…) : il décrit toute l'app. Le même texte, mis en forme, est aussi dans
[`PROMPT.md`](PROMPT.md).

````text
Crée une application web complète, en français, nommée "CV-ATS", qui optimise un CV pour les logiciels ATS (Applicant Tracking Systems) à partir d'une annonce d'emploi. Design sobre, moderne et lisible.

CONTEXTE / BUT
Beaucoup d'entreprises trient les CV avec des logiciels ATS qui lisent le texte, le comparent à l'annonce et classent les candidats. L'outil aide l'utilisateur à obtenir un CV bien classé ET honnête. Règle absolue de tout l'outil : NE JAMAIS INVENTER d'information (expérience, diplôme, compétence, date, chiffre). On reformule et met en valeur ce qui existe, jamais plus.

PAGE PRINCIPALE
- Deux grandes zones de texte côte à côte : « Ton CV » et « L'annonce d'emploi ».
- Un bouton « Importer un fichier » au-dessus de la zone CV (voir IMPORT).
- Deux boutons d'action : « Optimiser » et « Scanner mon CV ».
- Sous les boutons : la zone de résultat (optimisation ou scan).
- Tout en bas : une section pédagogique « C'est quoi un ATS ? » (texte fourni plus bas).
- Indique clairement « Aucune donnée n'est stockée ».

IMPORT DE FICHIER
- Accepte .pdf et .docx. Extraction du texte côté serveur (docx via mammoth ; pdf via une librairie d'extraction de texte fiable). Le texte extrait remplit la zone « Ton CV », modifiable avant de lancer.
- Le collage manuel reste toujours possible.
- Ne stocke jamais le fichier : extraction en mémoire puis oubli.
- Si le PDF est une image scannée (aucun texte extractible), n'invente rien : affiche « Ce PDF semble être une image scannée : l'ATS ne pourra pas le lire non plus. Colle le texte manuellement. »

FONCTION « OPTIMISER »
Envoie le CV + l'annonce à un modèle de langage (API type Claude/GPT via une clé stockée en variable d'environnement, jamais en dur). Le modèle renvoie UNIQUEMENT un JSON structuré :
{
  "nom": string,              // vide si absent, ne jamais inventer
  "titre": string,
  "contact": { "ville": string, "telephone": string, "email": string, "portfolio": string },
  "profil": string,
  "experiences": [ { "poste": string, "entreprise": string, "dates": string, "puces": [string] } ],
  "competences": [string],
  "formation": [ { "intitule": string, "etablissement": string, "dates": string } ]
}
Consignes données au modèle pour l'optimisation :
1. Honnêteté absolue : n'invente jamais rien ; champ vide si l'info n'existe pas ; ne requalifie pas un intitulé de poste et ne gonfle pas une durée d'expérience.
2. Mots-clés de l'annonce : repère compétences, outils, technologies et intitulés clés ; quand le candidat les possède vraiment, reprends la formulation EXACTE de l'annonce (les ATS font une correspondance littérale). Gère les synonymes : si une compétence réelle apparaît sous un autre nom (ex. « Meta Ads » = « Facebook Advertising », « réseaux sociaux » = « social media management »), utilise le terme de l'annonce, éventuellement avec le nom d'origine entre parenthèses. Ne jamais rapprocher une compétence que le candidat n'a pas.
3. Pertinence d'abord : place et développe en premier les expériences/compétences les plus utiles pour ce poste.
4. Verbes d'action forts ; n'utilise que les chiffres réellement présents dans le CV.
5. Dates intactes.
6. Rédige dans la langue de l'annonce. Sécurise le parsing du JSON (extrais-le même si le modèle ajoute du texte autour).
Affichage : reconstruis à partir du JSON un CV en TEXTE BRUT propre et copiable (titres de sections, puces, aucun caractère markdown résiduel) avec un bouton « Copier ». Puis un sélecteur de style + bouton de téléchargement PDF (voir TEMPLATES).

FONCTION « SCANNER MON CV »
Envoie le CV (et l'annonce si fournie) au modèle, qui renvoie UNIQUEMENT ce JSON :
{
  "score": number,            // entier /100, compatibilité ATS globale
  "pointsForts": [string],
  "problemes": [ { "severite": "élevée"|"moyenne"|"faible", "texte": string } ],
  "motsClesManquants": [string], // seulement si annonce fournie ; mots-clés de l'annonce vraiment absents du CV
  "recommandations": [string]
}
Consignes du scan : vérifie les critères ATS réels (présence du nom et des coordonnées, sections standards Expérience/Compétences/Formation, texte structuré, absence d'éléments qui cassent la lecture). Pour les mots-clés manquants, applique la MÊME logique de synonymes que l'optimisation : ne liste comme manquant que ce qui est réellement absent, et ne considère jamais comme acquise une compétence que le candidat n'a pas. Reste factuel et bienveillant.
Affichage : score bien visible avec couleur selon le niveau (rouge/orange/vert), puis les listes par section. Gère chargement et erreurs.

TEMPLATES PDF (3 styles, choix par l'utilisateur)
À partir du contenu structuré de l'optimisation, propose 3 styles de CV téléchargeables en PDF, sélectionnables via un petit sélecteur :
1. « Moderne sobre » : sans-serif, nom aligné à gauche, une touche de bleu marine (#1f3a5f) sur les titres de sections.
2. « Finance classique » : police à empattements (serif), nom centré, filets noirs entre sections, noir et blanc.
3. « Minimal aéré » : sans-serif, beaucoup de blanc, intitulés de sections en petites majuscules espacées, pas de filets.
CONTRAINTE CRITIQUE commune aux 3 : le PDF doit contenir du VRAI TEXTE SÉLECTIONNABLE (utilise une librairie type @react-pdf/renderer ou pdfmake — surtout PAS de capture d'écran / html2canvas). Une seule colonne. Aucune image, aucun tableau, aucune colonne multiple, aucune zone de texte : le PDF reste lisible par un ATS. Ne stocke rien.

SECTION PÉDAGOGIQUE (texte à afficher tel quel)
Titre « C'est quoi un ATS ? » : « Un ATS (Applicant Tracking System) est un logiciel que les entreprises utilisent pour recevoir, trier et classer les candidatures. Quand tu postules en ligne, ton CV passe souvent par lui avant qu'un humain ne le voie. Il lit le texte de ton CV, le compare à l'annonce, et classe les candidats. L'ATS ne te refuse presque jamais tout seul — il y a toujours un recruteur derrière —, mais un CV mal formaté ou pauvre en mots-clés peut être classé si bas qu'il n'est jamais consulté. Le but n'est pas de tromper le logiciel, mais que ton vrai profil soit bien lu et bien classé. »
Titre « Qu'est-ce qu'un CV optimisé ATS ? » (puces) : du vrai texte sélectionnable jamais une image ; une structure simple avec des sections standards ; pas de tableaux/colonnes/zones de texte/en-têtes compliqués ; les mots-clés de l'annonce quand on les possède vraiment, avec les mêmes termes ; nom et coordonnées clairement lisibles.

CONFIDENTIALITÉ & TECHNIQUE
- Ne stocke aucune donnée (ni base, ni logs) : traite puis oublie. Le CV contient des données personnelles.
- Clé API du modèle en variable d'environnement uniquement.
- Gère partout les états de chargement et les erreurs.
````
