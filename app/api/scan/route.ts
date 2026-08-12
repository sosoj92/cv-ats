import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  MODEL,
  MAX_TOKENS,
  SCAN_SYSTEM_PROMPT,
  buildScanUserPrompt,
  type ScanResult,
} from "@/lib/scanPrompt";
import { enforceRateLimit } from "@/lib/rateLimit";

// Runtime Node.js (le SDK Anthropic n'est pas fait pour l'edge).
export const runtime = "nodejs";
// Pas de cache : chaque scan est unique.
export const dynamic = "force-dynamic";
// L'appel au modèle peut être long : on autorise jusqu'à 60 s (Vercel).
export const maxDuration = 60;

/**
 * Extrait un objet JSON d'une réponse texte. Le prompt demande du JSON pur,
 * mais par sécurité on retire un éventuel bloc ```json ... ``` et on isole
 * le premier objet { ... } trouvé.
 */
function parseJson(raw: string): unknown {
  let text = raw.trim();
  // Retire une clôture Markdown si le modèle en a mis une malgré la consigne.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // Isole le premier objet JSON complet.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

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

  // 1. Clé API depuis la variable d'environnement.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé API manquante. Définis ANTHROPIC_API_KEY dans .env.local." },
      { status: 500 }
    );
  }

  // 2. Lecture et validation des entrées. L'annonce est optionnelle.
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

  // 3. Appel Anthropic. Aucune donnée n'est stockée.
  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SCAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildScanUserPrompt(cv, annonce) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      console.error(
        "Scan : réponse vide. stop_reason=",
        message.stop_reason,
        "usage=",
        JSON.stringify(message.usage)
      );
      return NextResponse.json(
        { error: "Réponse vide du modèle. Réessaie dans un instant." },
        { status: 502 }
      );
    }

    // 4. Parse + validation du JSON structuré.
    let result: ScanResult;
    try {
      result = normalize(parseJson(text));
    } catch {
      console.error("Scan : JSON invalide reçu du modèle:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Le diagnostic n'a pas pu être lu (format inattendu). Réessaie." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : "Erreur inconnue lors de l'appel à l'API.";
    console.error("Erreur /api/scan:", messageText);
    return NextResponse.json(
      { error: `Échec du scan : ${messageText}` },
      { status: 502 }
    );
  }
}
