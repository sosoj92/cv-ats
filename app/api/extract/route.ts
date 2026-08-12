import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";

// Le SDK d'extraction (mammoth / unpdf) nécessite le runtime Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Garde-fou : on refuse les fichiers trop volumineux (10 Mo).
const MAX_BYTES = 10 * 1024 * 1024;

// Message exact demandé pour les PDF scannés (image sans texte).
const SCANNED_PDF_MESSAGE =
  "Ce PDF semble être une image scannée : l'ATS ne pourra pas le lire non plus. Colle le texte manuellement.";

/**
 * Extrait le texte brut d'un .docx via mammoth.
 * mammoth travaille entièrement en mémoire, rien n'est écrit sur disque.
 */
async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ buffer });
  return value.trim();
}

/**
 * Extrait le texte d'un .pdf via unpdf (basé sur pdf.js, sans dépendance
 * native ni fichier temporaire). Retourne "" si le PDF ne contient aucun
 * texte extractible (cas d'un scan/image).
 */
async function extractPdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).trim();
}

export async function POST(request: Request) {
  // 0. Limite de débit (extraction de fichier).
  const limited = enforceRateLimit(request, "extract", 30, 60_000);
  if (limited) return limited;

  // 1. Récupération du fichier depuis le FormData.
  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10 Mo)." },
      { status: 413 }
    );
  }

  // 2. Détermination du type : on se fie à l'extension ET au type MIME.
  const name = file.name.toLowerCase();
  const isDocx =
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";

  if (!isDocx && !isPdf) {
    return NextResponse.json(
      { error: "Format non supporté. Importe un fichier .pdf ou .docx." },
      { status: 415 }
    );
  }

  // 3. Extraction en mémoire. Le buffer n'est jamais persisté ni loggé.
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    if (isDocx) {
      text = await extractDocx(buffer);
    } else {
      text = await extractPdf(buffer);
      // PDF sans texte extractible → très probablement un scan/image.
      if (!text) {
        return NextResponse.json({ error: SCANNED_PDF_MESSAGE }, { status: 422 });
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: "Aucun texte n'a pu être extrait de ce fichier." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch {
    // On ne loggue PAS le contenu du fichier (donnée personnelle).
    return NextResponse.json(
      { error: "Fichier illisible ou endommagé. Réessaie ou colle le texte." },
      { status: 422 }
    );
  }
}
