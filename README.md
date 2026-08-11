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
