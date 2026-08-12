import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  MODEL,
  MAX_TOKENS,
  SYSTEM_PROMPT,
  buildUserPrompt,
  normalizeCvContent,
} from "@/lib/prompt";
import { parseLenientJson } from "@/lib/lenientJson";
import { enforceRateLimit } from "@/lib/rateLimit";

// On force le runtime Node.js (le SDK Anthropic n'est pas fait pour l'edge).
export const runtime = "nodejs";
// Pas de cache : chaque optimisation est unique.
export const dynamic = "force-dynamic";
// L'appel au modèle peut être long : on autorise jusqu'à 60 s (Vercel).
export const maxDuration = 60;

export async function POST(request: Request) {
  // 0. Limite de débit : protège la clé API contre les abus.
  const limited = enforceRateLimit(request, "optimize", 10, 60_000);
  if (limited) return limited;

  // 1. Clé API depuis la variable d'environnement (jamais en dur dans le code).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé API manquante. Définis ANTHROPIC_API_KEY dans .env.local." },
      { status: 500 }
    );
  }

  // 2. Lecture et validation des entrées.
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

  // 3. Appel à l'API Anthropic. Aucune donnée n'est stockée : on lit, on
  //    transmet à Claude, on renvoie le résultat, et tout disparaît.
  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(cv, annonce) }],
    });

    // La réponse est une liste de blocs ; on ne garde que le texte.
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // Cas particulier : la génération a été coupée par la limite de tokens.
    // Le JSON serait alors incomplet donc inutilisable : on le signale.
    if (message.stop_reason === "max_tokens") {
      console.warn(
        "Optimisation tronquée (max_tokens atteint):",
        JSON.stringify(message.usage)
      );
      return NextResponse.json(
        {
          error:
            "Le CV est trop long pour être traité en une fois (limite de longueur atteinte). Raccourcis le CV ou l'annonce et réessaie.",
        },
        { status: 502 }
      );
    }

    if (!text) {
      console.error(
        "Réponse vide. stop_reason=",
        message.stop_reason,
        "usage=",
        JSON.stringify(message.usage)
      );
      return NextResponse.json(
        { error: "Réponse vide du modèle. Réessaie dans un instant." },
        { status: 502 }
      );
    }

    // Parse + validation du JSON structuré (comme le scan).
    let result;
    try {
      result = normalizeCvContent(parseLenientJson(text));
    } catch {
      console.error("Optimize : JSON invalide reçu du modèle:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Le CV optimisé n'a pas pu être lu (format inattendu). Réessaie." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : "Erreur inconnue lors de l'appel à l'API.";
    console.error("Erreur /api/optimize:", messageText);
    return NextResponse.json(
      { error: `Échec de l'optimisation : ${messageText}` },
      { status: 502 }
    );
  }
}
