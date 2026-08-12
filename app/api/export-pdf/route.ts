import { NextResponse } from "next/server";
import { buildCvPdf } from "@/lib/pdfTemplates";
import { normalizeCvContent } from "@/lib/prompt";

// La génération PDF nécessite le runtime Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Récupération du CV structuré.
  let content: unknown;
  try {
    const body = await request.json();
    content = body?.content;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Aucun CV à exporter." }, { status: 400 });
  }

  // 2. Génération en mémoire. Rien n'est écrit sur disque ni loggé.
  try {
    const buffer = await buildCvPdf(normalizeCvContent(content));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cv-optimise.pdf"',
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(
      "Erreur /api/export-pdf:",
      err instanceof Error ? err.message : "inconnue"
    );
    return NextResponse.json(
      { error: "La génération du PDF a échoué." },
      { status: 500 }
    );
  }
}
