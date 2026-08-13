import { NextResponse } from "next/server";
import {
  MODEL,
  MAX_TOKENS,
  TEMPERATURE,
  SCAN_SYSTEM_PROMPT,
  buildScanUserPrompt,
  type ScanResult,
} from "@/lib/scanPrompt";
import { parseLenientJson } from "@/lib/lenientJson";
import { enforceRateLimit } from "@/lib/rateLimit";
import { callGemini } from "@/lib/gemini";

// Runtime Node.js.
export const runtime = "nodejs";
// Pas de cache : chaque scan est unique.
export const dynamic = "force-dynamic";
// L'appel au modèle peut être long : on autorise jusqu'à 60 s (Vercel).
export const maxDuration = 60;

/**
 * Valide et normalise la sortie du modèle vers la forme ScanResult.
 * On ne fait pas confiance aveuglément au modèle : on borne le score,
 * on garantit des tableaux, et on filtre les problèmes mal formés.
 */
function normalize(data: unknown): ScanResult {
  const obj = (data ?? {}) as Record<string, unknown>;

  const scoreRaw = Number(obj.score);
  const score = Number.isFinite(scoreRaw)
    ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
    : 0;

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter((x) => x.length > 0)
      : [];

  const severites = new Set(["élevée", "moyenne", "faible"]);
  const problemes = Array.isArray(obj.problemes)
    ? obj.problemes
        .map((p) => {
          const po = (p ?? {}) as Record<string, unknown>;
          const severite = String(po.severite);
          const texte = String(po.texte ?? "").trim();
          return { severite, texte };
        })
        .filter((p) => severites.has(p.severite) && p.texte.length > 0)
    : [];

  return {
    score,
    pointsForts: asStringArray(obj.pointsForts),
    problemes: problemes as ScanResult["problemes"],
    motsClesManquants: asStringArray(obj.motsClesManquants),
    recommandations: asStringArray(obj.recommandations),
  };
}

export async function POST(request: Request) {
  // 0. Limite de débit : protège la clé API contre les abus.
  const limited = enforceRateLimit(request, "scan", 10, 60_000);
  if (limited) return limited;

  // 1. Lecture et validation des entrées. L'annonce est optionnelle.
  let cv: string;
  let annonce: string | undefined;
  try {
    const body = await request.json();
    cv = typeof body?.cv === "string" ? body.cv.trim() : "";
    annonce = typeof body?.annonce === "string" ? body.annonce.trim() : "";
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!cv) {
    return NextResponse.json({ error: "Le CV est requis." }, { status: 400 });
  }

  // 2. Appel à Gemini. Aucune donnée n'est stockée.
  const res = await callGemini({
    model: MODEL,
    system: SCAN_SYSTEM_PROMPT,
    user: buildScanUserPrompt(cv, annonce),
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
        { error: "Le CV est trop long pour être analysé en une fois. Raccourcis-le et réessaie." },
        { status: 502 }
      );
    }
    console.error("Erreur /api/scan:", res.reason, res.detail ?? "");
    return NextResponse.json(
      { error: "Le scan a échoué. Réessaie dans un instant." },
      { status: 502 }
    );
  }

  // 3. Parse + validation du JSON structuré.
  let result: ScanResult;
  try {
    result = normalize(parseLenientJson(res.text));
  } catch {
    console.error("Scan : JSON invalide reçu du modèle:", res.text.slice(0, 500));
    return NextResponse.json(
      { error: "Le diagnostic n'a pas pu être lu (format inattendu). Réessaie." },
      { status: 502 }
    );
  }

  return NextResponse.json({ result });
}
