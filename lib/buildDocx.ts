/**
 * ============================================================================
 *  CONSTRUCTION DU .DOCX  —  export ATS-friendly du CV optimisé
 * ============================================================================
 *
 * Convertit le texte optimisé (qui peut contenir un peu de Markdown léger :
 * titres avec #, puces avec -, **gras**) en un document Word PROPRE :
 *   - vrai texte sélectionnable, police standard (Calibri)
 *   - titres de sections en gras, puces normales, gras réel
 *   - AUCUN caractère Markdown résiduel (ni astérisques, ni ---)
 *   - aucune image, aucun tableau, aucune colonne, aucune zone de texte
 *
 * Tout se fait en mémoire ; rien n'est écrit sur disque.
 * ----------------------------------------------------------------------------
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  type ISectionOptions,
} from "docx";

const FONT = "Calibri";
const SIZE_BODY = 22; // demi-points → 11 pt
const SIZE_H1 = 30; // 15 pt (nom / titre principal)
const SIZE_H2 = 26; // 13 pt (titres de section)

/**
 * Nettoie un segment de texte de tout caractère Markdown résiduel :
 * astérisques, underscores d'emphase, dièses, accents graves, tildes.
 * Garantit qu'aucun symbole de balisage ne reste visible dans le document.
 * NB : on ne rogne PAS les espaces de début/fin — ils séparent souvent un
 * segment normal d'un segment en gras/italique (« avec **React** »).
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/[*_`~]/g, "") // emphase / code résiduels
    .replace(/^#+\s*/, "") // dièses en début de segment
    .replace(/ {2,}/g, " "); // espaces multiples → un seul
}

/**
 * Transforme une ligne en une suite de TextRun, en interprétant le gras
 * (**texte** ou __texte__) et l'italique (*texte* ou _texte_) comme du VRAI
 * formatage Word. Le reste est nettoyé de tout Markdown.
 */
function inlineRuns(line: string, size: number, forceBold = false): TextRun[] {
  const runs: TextRun[] = [];
  // Capture, dans l'ordre : **gras**, __gras__, *ital*, _ital_.
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const push = (raw: string, bold: boolean, italics: boolean) => {
    const text = stripMarkdown(raw);
    if (text.length === 0) return;
    runs.push(
      new TextRun({ text, bold: bold || forceBold, italics, font: FONT, size })
    );
  };

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) push(line.slice(last, m.index), false, false);
    if (m[2] !== undefined || m[3] !== undefined) {
      push(m[2] ?? m[3] ?? "", true, false); // gras
    } else {
      push(m[4] ?? m[5] ?? "", false, true); // italique
    }
    last = re.lastIndex;
  }
  if (last < line.length) push(line.slice(last), false, false);

  // Ligne devenue vide après nettoyage → un run vide pour garder la ligne.
  if (runs.length === 0) {
    runs.push(new TextRun({ text: "", font: FONT, size }));
  }
  return runs;
}

/** Détecte une ligne de séparation Markdown (---, ***, ___) à ignorer. */
function isHorizontalRule(line: string): boolean {
  return /^\s*([-*_])\1{2,}\s*$/.test(line);
}

/** Détecte une puce : « - », « * » ou « • » en début de ligne. */
function bulletContent(line: string): string | null {
  const m = line.match(/^\s*[-*•]\s+(.*)$/);
  return m ? m[1] : null;
}

/** Détecte un titre Markdown « # … » → renvoie {level, texte}. */
function headingByHash(line: string): { level: number; text: string } | null {
  const m = line.match(/^\s*(#{1,6})\s+(.*)$/);
  return m ? { level: m[1].length, text: m[2] } : null;
}

/** Détecte une ligne entièrement en gras (**Titre**) → titre de section. */
function headingByBold(line: string): string | null {
  const m = line.trim().match(/^\*\*(.+)\*\*$/);
  return m ? m[1] : null;
}

/**
 * Construit le document Word à partir du texte optimisé et renvoie le buffer.
 */
export async function buildCvDocx(rawText: string): Promise<Buffer> {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const paragraphs: Paragraph[] = [];

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+$/, "");

    // Ligne vide → petit espacement.
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      return;
    }

    // Séparateur horizontal → ignoré (pas d'astérisques ni de --- dans le doc).
    if (isHorizontalRule(line)) return;

    // Titre « # … »
    const hHash = headingByHash(line);
    if (hHash) {
      const size = hHash.level <= 1 ? SIZE_H1 : SIZE_H2;
      paragraphs.push(
        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: inlineRuns(hHash.text, size, true),
        })
      );
      return;
    }

    // Ligne entièrement en **gras** → titre de section.
    const hBold = headingByBold(line);
    if (hBold) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 240, after: 80 },
          children: inlineRuns(hBold, SIZE_H2, true),
        })
      );
      return;
    }

    // Puce
    const bullet = bulletContent(line);
    if (bullet !== null) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: inlineRuns(bullet, SIZE_BODY),
        })
      );
      return;
    }

    // Paragraphe normal
    paragraphs.push(
      new Paragraph({
        spacing: { after: 80 },
        children: inlineRuns(line, SIZE_BODY),
      })
    );
  });

  const section: ISectionOptions = {
    properties: {},
    children: paragraphs,
  };

  const doc = new Document({
    // Police par défaut standard pour tout le document.
    styles: {
      default: {
        document: { run: { font: FONT, size: SIZE_BODY } },
      },
    },
    sections: [section],
  });

  return Packer.toBuffer(doc);
}
