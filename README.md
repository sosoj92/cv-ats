# CV-ATS

**Colle ton CV et une annonce d'emploi : l'app réécrit ton CV pour qu'il passe bien les logiciels de tri
des recruteurs (ATS), sans rien inventer.** Elle utilise l'IA Google Gemini (clé gratuite) et ne stocke
aucune donnée.

- **Optimiser** : CV réécrit avec les mots-clés de l'annonce que tu as vraiment, à copier ou à télécharger
  en PDF (3 styles) ou en Word.
- **Scanner mon CV** : une note sur 100, les points forts, les problèmes et les mots-clés qui manquent.
- **Importer** un CV en PDF ou Word au lieu de le coller.

Next.js · TypeScript. Le CV et l'annonce sont envoyés à Gemini le temps de la requête, puis oubliés.

## Installation

```bash
cd cv-ats
npm install
cp .env.local.example .env.local
```

Ouvre `.env.local` et colle ta clé (gratuite, sur https://aistudio.google.com/apikey) :

```
GEMINI_API_KEY=...
```

Lance l'app avec `npm run dev`, puis ouvre http://localhost:3000.

## Améliorer les résultats

La qualité vient surtout de **[`lib/prompt.ts`](lib/prompt.ts)** : le modèle Gemini utilisé (`MODEL`), les
règles permanentes (`SYSTEM_PROMPT`) et le message envoyé à chaque requête (`buildUserPrompt()`). Le scan
utilise [`lib/scanPrompt.ts`](lib/scanPrompt.ts).

## Structure

```
cv-ats/
├─ app/
│  ├─ page.tsx               # la page (CV, annonce, boutons, résultat)
│  ├─ ScanReport.tsx         # affichage du scan
│  ├─ AtsGuide.tsx           # « C'est quoi un ATS ? »
│  └─ api/
│     ├─ optimize/route.ts   # réécriture du CV
│     ├─ scan/route.ts       # note et conseils
│     ├─ extract/route.ts    # import PDF / Word
│     ├─ export-pdf/route.ts # téléchargement PDF
│     └─ export/route.ts     # téléchargement Word
├─ lib/                      # prompts, appel Gemini, modèles PDF et Word
└─ .env.local.example        # modèle pour la clé
```

## Recréer cette app toi-même

Le cahier des charges complet est dans [`PROMPT.md`](PROMPT.md) : colle-le dans un assistant de code IA
(Claude Code, Cursor, v0, ChatGPT…) pour refaire l'app de zéro.
