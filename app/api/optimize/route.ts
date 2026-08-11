import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { MODEL, MAX_TOKENS, SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";

// On force le runtime Node.js (le SDK Anthropic n'est pas fait pour l'edge).
export const runtime = "nodejs";
// Pas de cache : chaque optimisation est unique.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    const result = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // Cas particulier : la génération a été coupée par la limite de tokens.
    // On log les infos de diagnostic (stop_reason, usage) pour comprendre.
    if (message.stop_reason === "max_tokens") {
      console.warn(
        "Optimisation tronquée (max_tokens atteint):",
        JSON.stringify(message.usage)
      );
      if (!result) {
        return NextResponse.json(
          {
            error:
              "Le CV est trop long pour être traité en une fois (limite de longueur atteinte avant la moindre sortie). Raccourcis le CV ou l'annonce et réessaie.",
          },
          { status: 502 }
        );
      }
      // On a quand même du texte : on le renvoie avec un avertissement.
      return NextResponse.json({
        result,
        warning:
          "Le résultat a peut-être été tronqué (CV volumineux). Vérifie la fin du CV optimisé.",
      });
    }

    if (!result) {
      // Diagnostic : on affiche pourquoi la réponse est vide.
      console.error(
        "Réponse vide. stop_reason=",
        message.stop_reason,
        "blocs=",
        message.content.map((b) => b.type),
        "usage=",
        JSON.stringify(message.usage)
      );
      return NextResponse.json(
        { error: "Réponse vide du modèle. Réessaie dans un instant." },
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
