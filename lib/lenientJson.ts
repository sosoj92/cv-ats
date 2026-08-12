/**
 * Extrait un objet JSON d'une réponse texte du modèle. Le prompt demande du
 * JSON pur, mais par sécurité on retire un éventuel bloc ```json ... ``` et on
 * isole le premier objet { ... } complet. Lève une erreur si rien n'est parsable.
 */
export function parseLenientJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}
