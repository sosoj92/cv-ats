import { NextResponse } from "next/server";
import {
  MODEL,
  MAX_TOKENS,
  TEMPERATURE,
  SYSTEM_PROMPT,
  buildUserPrompt,
  normalizeCvContent,
} from "@/lib/prompt";
import { parseLenientJson } from "@/lib/lenientJson";
import { enforceRateLimit } from "@/lib/rateLimit";
import { callGemini } from "@/lib/gemini";

// Runtime Node.js.
export const runtime = "nodejs";
// Pas de cache : chaque optimisation est unique.
export const dynamic = "force-dynamic";
// L'appel au modèle peut être long : on autorise jusqu'à 60 s (Vercel).
export const maxDuration = 60;

export async function POST(request: Request) {
  // 0. Limite de débit : protège la clé API contre les abus.
  const limited = enforceRateLimit(request, "optimize", 10, 60_000);
  if (limited) return limited;

  // 1. Lecture et validation des entrées.
  let cv: string;
  let annonce: string;
  try {
    const body = await request.json();
    cv = typeof body?.cv === "string" ? body.cv.trim() : "";
    annonce = typeof body?.annonce === "string" ? body.annonce.trim() : "";
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!cv || !annonce) {
    return NextResponse.json(
      { error: "Le CV et l'annonce sont tous les deux requis." },
      { status: 400 }
    );
  }

  // 2. Appel à Gemini. Aucune donnée n'est stockée.
  const res = await callGemini({
    model: MODEL,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(cv, annonce),
    maxOutputTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  if (!res.ok) {
    if (res.reason === "no-key") {
      return NextResponse.json(
        { error: "Clé API manquante. Définis GEMINI_API_KEY dans .env.local." },
        { status: 500 }
      );
    }
    if (res.reason === "truncated") {
      return NextResponse.json(
        {
          error:
            "Le CV est trop long pour être traité en une fois (limite de longueur atteinte). Raccourcis le CV ou l'annonce et réessaie.",
        },
        { status: 502 }
      );
    }
    console.error("Erreur /api/optimize:", res.reason, res.detail ?? "");
    return NextResponse.json(
      { error: "L'optimisation a échoué. Réessaie dans un instant." },
      { status: 502 }
    );
  }

  // 3. Parse + validation du JSON structuré.
  let result;
  try {
    result = normalizeCvContent(parseLenientJson(res.text));
  } catch {
    console.error("Optimize : JSON invalide reçu du modèle:", res.text.slice(0, 500));
    return NextResponse.json(
      { error: "Le CV optimisé n'a pas pu être lu (format inattendu). Réessaie." },
      { status: 502 }
    );
  }

  return NextResponse.json({ result });
}
