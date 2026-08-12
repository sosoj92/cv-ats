import { NextResponse } from "next/server";
import { buildCvDocx } from "@/lib/buildDocx";
import { normalizeCvContent } from "@/lib/prompt";

// La génération docx nécessite le runtime Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Récupération du CV structuré à exporter.
  let content: unknown;
  try {
    const body = await request.json();
    content = body?.content;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!content || typeof content !== "object") {
    return NextResponse.json(
      { error: "Aucun CV à exporter." },
      { status: 400 }
    );
  }

  // 2. Génération du .docx en mémoire. Rien n'est écrit sur disque ni loggé.
  //    On normalise d'abord pour garantir une forme valide et propre.
  try {
    const buffer = await buildCvDocx(normalizeCvContent(content));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="cv-optimise.docx"',
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "La génération du document a échoué." },
      { status: 500 }
    );
  }
}
