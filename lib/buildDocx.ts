/**
 * ============================================================================
 *  CONSTRUCTION DU .DOCX  —  export ATS-friendly du CV optimisé
 * ============================================================================
 *
 * Construit un document Word PROPRE directement à partir du CV structuré
 * (CvContent). Comme on part de données structurées (et non de Markdown), il
 * n'y a par construction AUCUN caractère de balisage résiduel.
 *
 *   - vrai texte sélectionnable, police standard (Calibri)
 *   - nom / titres de sections en gras, puces normales, gras réel
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
import type { CvContent } from "./prompt";

const FONT = "Calibri";
const SIZE_BODY = 22; // 11 pt
const SIZE_NAME = 32; // 16 pt (nom)
const SIZE_TITLE = 26; // 13 pt (titre visé)
const SIZE_SECTION = 26; // 13 pt (titres de section)

/** Paragraphe de titre de section (gras, espacé). */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text, bold: true, font: FONT, size: SIZE_SECTION }),
    ],
  });
}

/** Paragraphe simple. */
function body(text: string, opts: { bold?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        bold: opts.bold ?? false,
        font: FONT,
        size: opts.size ?? SIZE_BODY,
      }),
    ],
  });
}

/** Puce standard. */
function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY })],
  });
}

export async function buildCvDocx(cv: CvContent): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // --- En-tête : nom, titre, coordonnées ---
  if (cv.nom.trim()) paragraphs.push(body(cv.nom.trim(), { bold: true, size: SIZE_NAME }));
  if (cv.titre.trim()) paragraphs.push(body(cv.titre.trim(), { size: SIZE_TITLE }));

  const contact = [
    cv.contact.ville,
    cv.contact.telephone,
    cv.contact.email,
    cv.contact.portfolio,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (contact.length) paragraphs.push(body(contact.join("  ·  ")));

  // --- Profil ---
  if (cv.profil.trim()) {
    paragraphs.push(sectionHeading("Profil"));
    paragraphs.push(body(cv.profil.trim()));
  }

  // --- Expérience professionnelle ---
  const exps = cv.experiences.filter(
    (e) => e.poste.trim() || e.entreprise.trim() || e.puces.some((p) => p.trim())
  );
  if (exps.length) {
    paragraphs.push(sectionHeading("Expérience professionnelle"));
    exps.forEach((e) => {
      const entete = [e.poste.trim(), e.entreprise.trim()].filter(Boolean).join(" — ");
      const dates = e.dates.trim();
      // Ligne poste/entreprise en gras, dates en normal à la suite.
      const runs: TextRun[] = [];
      if (entete) runs.push(new TextRun({ text: entete, bold: true, font: FONT, size: SIZE_BODY }));
      if (dates) {
        runs.push(
          new TextRun({
            text: entete ? `  (${dates})` : dates,
            font: FONT,
            size: SIZE_BODY,
          })
        );
      }
      if (runs.length) paragraphs.push(new Paragraph({ spacing: { before: 80, after: 40 }, children: runs }));
      e.puces
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => paragraphs.push(bullet(p)));
    });
  }

  // --- Compétences ---
  const comps = cv.competences.map((c) => c.trim()).filter(Boolean);
  if (comps.length) {
    paragraphs.push(sectionHeading("Compétences"));
    comps.forEach((c) => paragraphs.push(bullet(c)));
  }

  // --- Formation ---
  const forms = cv.formation.filter(
    (f) => f.intitule.trim() || f.etablissement.trim() || f.dates.trim()
  );
  if (forms.length) {
    paragraphs.push(sectionHeading("Formation"));
    forms.forEach((f) => {
      const entete = [f.intitule.trim(), f.etablissement.trim()].filter(Boolean).join(" — ");
      const dates = f.dates.trim();
      paragraphs.push(body(dates ? `${entete} (${dates})` : entete));
    });
  }

  // Filet de sécurité : jamais un document totalement vide.
  if (paragraphs.length === 0) {
    paragraphs.push(body(""));
  }

  const section: ISectionOptions = { properties: {}, children: paragraphs };

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE_BODY } } } },
    sections: [section],
  });

  return Packer.toBuffer(doc);
}
