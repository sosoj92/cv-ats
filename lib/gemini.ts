/**
 * ============================================================================
 *  APPEL AU MODÈLE GEMINI (Google AI Studio)
 * ============================================================================
 *
 * Wrapper minimal autour du SDK @google/genai, partagé par les routes
 * /api/optimize et /api/scan. Aucune donnée n'est stockée : on appelle, on
 * renvoie le texte, et tout disparaît.
 *
 * La clé vient de la variable d'environnement GEMINI_API_KEY (jamais en dur).
 * Obtenir une clé gratuite : https://aistudio.google.com/apikey
 * ----------------------------------------------------------------------------
 */

import { GoogleGenAI } from "@google/genai";

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no-key" | "empty" | "truncated" | "error"; detail?: string };

export async function callGemini(opts: {
  model: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  temperature: number;
}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: opts.model,
      contents: opts.user,
      config: {
        systemInstruction: opts.system,
        // Force une sortie JSON pure (pas de blocs Markdown autour).
        responseMimeType: "application/json",
        maxOutputTokens: opts.maxOutputTokens,
        temperature: opts.temperature,
        // IMPORTANT : Gemini 2.5 « réfléchit » par défaut, et ces tokens de
        // réflexion consomment le budget de sortie — au risque de renvoyer une
        // réponse vide. Pour une extraction structurée comme la nôtre, on
        // désactive le thinking : plus rapide, plus fiable, moins de quota.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const finish = response.candidates?.[0]?.finishReason;
    const text = (response.text ?? "").trim();

    // Coupé par la limite de tokens → JSON incomplet, inutilisable.
    if (finish === "MAX_TOKENS") return { ok: false, reason: "truncated" };

    if (!text) return { ok: false, reason: "empty", detail: String(finish ?? "") };

    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      detail: err instanceof Error ? err.message : "inconnue",
    };
  }
}
