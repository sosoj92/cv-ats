import { NextResponse } from "next/server";
import { buildCvDocx } from "@/lib/buildDocx";

// La génération docx nécessite le runtime Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Récupération du texte optimisé.
  let text: string;
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Aucun texte à exporter." },
      { status: 400 }
    );
  }

  // 2. Génération du .docx en mémoire. Rien n'est écrit sur disque ni loggé.
  try {
    const buffer = await buildCvDocx(text);

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
