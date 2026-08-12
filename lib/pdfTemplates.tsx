/**
 * ============================================================================
 *  TEMPLATES PDF  —  export du CV optimisé en VRAI TEXTE (pas d'image)
 * ============================================================================
 *
 * Utilise @react-pdf/renderer : le PDF contient du texte réel, sélectionnable
 * et lisible par un ATS (aucune capture d'écran, aucun html2canvas).
 *
 * On s'appuie uniquement sur les polices intégrées (Helvetica = sans-serif,
 * Times-Roman = serif) : aucun fichier de police externe, et le français
 * (accents) est correctement encodé.
 *
 * Trois styles, une seule colonne chacun, aucun tableau / colonne / image :
 *   - « moderne » : sans-serif, nom à gauche, titres de section bleu marine.
 *   - « finance » : serif, nom centré, filets noirs entre sections, N&B.
 *   - « minimal » : sans-serif, très aéré, titres en petites majuscules espacées.
 * ----------------------------------------------------------------------------
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CvContent } from "./prompt";

export type PdfStyle = "moderne" | "finance" | "minimal";

/** Paramètres visuels propres à chaque style. */
type Theme = {
  fontFamily: "Helvetica" | "Times-Roman";
  headerAlign: "left" | "center";
  sectionColor: string;
  sectionLetterSpacing: number;
  sectionSize: number;
  rules: boolean; // filets noirs (header + entre sections)
  pagePadding: number;
  nameSize: number;
};

const THEMES: Record<PdfStyle, Theme> = {
  moderne: {
    fontFamily: "Helvetica",
    headerAlign: "left",
    sectionColor: "#1f3a5f",
    sectionLetterSpacing: 1,
    sectionSize: 11,
    rules: false,
    pagePadding: 52,
    nameSize: 22,
  },
  finance: {
    fontFamily: "Times-Roman",
    headerAlign: "center",
    sectionColor: "#000000",
    sectionLetterSpacing: 1,
    sectionSize: 12,
    rules: true,
    pagePadding: 56,
    nameSize: 22,
  },
  minimal: {
    fontFamily: "Helvetica",
    headerAlign: "left",
    sectionColor: "#333333",
    sectionLetterSpacing: 3,
    sectionSize: 9,
    rules: false,
    pagePadding: 72,
    nameSize: 20,
  },
};

/** Construit la feuille de styles pour un thème donné. */
function makeStyles(t: Theme) {
  return StyleSheet.create({
    page: {
      fontFamily: t.fontFamily,
      fontSize: 10,
      lineHeight: 1.4,
      color: "#111111",
      paddingTop: t.pagePadding,
      paddingBottom: t.pagePadding,
      paddingHorizontal: t.pagePadding,
    },
    header: {
      textAlign: t.headerAlign,
      marginBottom: 6,
      paddingBottom: t.rules ? 8 : 0,
      borderBottomWidth: t.rules ? 1 : 0,
      borderBottomColor: "#000000",
    },
    name: {
      fontSize: t.nameSize,
      fontFamily: t.fontFamily,
      // Gras via la variante Bold de la police intégrée.
      fontWeight: "bold",
    },
    title: { fontSize: 12, marginTop: 3 },
    contact: { fontSize: 9, color: "#555555", marginTop: 4 },
    section: {
      marginTop: 16,
      paddingTop: t.rules ? 8 : 0,
      borderTopWidth: t.rules ? 1 : 0,
      borderTopColor: "#000000",
    },
    sectionTitle: {
      fontSize: t.sectionSize,
      fontWeight: "bold",
      color: t.sectionColor,
      textTransform: "uppercase",
      letterSpacing: t.sectionLetterSpacing,
      marginBottom: 6,
    },
    profil: { fontSize: 10 },
    expHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    expRole: { fontSize: 10.5, fontWeight: "bold", flex: 1, paddingRight: 8 },
    expDates: { fontSize: 9, color: "#555555" },
    bullet: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
    bulletDot: { width: 10, fontSize: 10 },
    bulletText: { flex: 1, fontSize: 10 },
    compLine: { fontSize: 10, marginTop: 2 },
    formItem: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    formLeft: { fontSize: 10, flex: 1, paddingRight: 8 },
    formDates: { fontSize: 9, color: "#555555" },
  });
}

/** Nettoie et filtre les données pour n'afficher que ce qui est rempli. */
function prepare(cv: CvContent) {
  const contact = [
    cv.contact.ville,
    cv.contact.telephone,
    cv.contact.email,
    cv.contact.portfolio,
  ]
    .map((v) => v.trim())
    .filter(Boolean)
    .join("   ·   ");

  const experiences = cv.experiences
    .map((e) => ({
      entete: [e.poste.trim(), e.entreprise.trim()].filter(Boolean).join(" — "),
      dates: e.dates.trim(),
      puces: e.puces.map((p) => p.trim()).filter(Boolean),
    }))
    .filter((e) => e.entete || e.puces.length);

  const competences = cv.competences.map((c) => c.trim()).filter(Boolean);

  const formation = cv.formation
    .map((f) => ({
      entete: [f.intitule.trim(), f.etablissement.trim()]
        .filter(Boolean)
        .join(" — "),
      dates: f.dates.trim(),
    }))
    .filter((f) => f.entete || f.dates);

  return {
    nom: cv.nom.trim(),
    titre: cv.titre.trim(),
    contact,
    profil: cv.profil.trim(),
    experiences,
    competences,
    formation,
  };
}

/** Le document PDF (une seule colonne, texte réel). */
function CvDocument({ cv, style }: { cv: CvContent; style: PdfStyle }) {
  const t = THEMES[style];
  const s = makeStyles(t);
  const d = prepare(cv);
  // Pour « minimal », on sépare les compétences par des points médians ;
  // pour les autres, une compétence par ligne à puce.
  const compAsChips = style === "minimal";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {d.nom ? <Text style={s.name}>{d.nom}</Text> : null}
          {d.titre ? <Text style={s.title}>{d.titre}</Text> : null}
          {d.contact ? <Text style={s.contact}>{d.contact}</Text> : null}
        </View>

        {d.profil ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Profil</Text>
            <Text style={s.profil}>{d.profil}</Text>
          </View>
        ) : null}

        {d.experiences.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Expérience professionnelle</Text>
            {d.experiences.map((e, i) => (
              <View key={i} wrap={false}>
                <View style={s.expHead}>
                  <Text style={s.expRole}>{e.entete}</Text>
                  {e.dates ? <Text style={s.expDates}>{e.dates}</Text> : null}
                </View>
                {e.puces.map((p, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {d.competences.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Compétences</Text>
            {compAsChips ? (
              <Text style={s.compLine}>{d.competences.join("   ·   ")}</Text>
            ) : (
              d.competences.map((c, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{c}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {d.formation.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Formation</Text>
            {d.formation.map((f, i) => (
              <View key={i} style={s.formItem}>
                <Text style={s.formLeft}>{f.entete}</Text>
                {f.dates ? <Text style={s.formDates}>{f.dates}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

/** Génère le PDF en mémoire et renvoie le buffer. */
export async function buildCvPdf(
  cv: CvContent,
  style: PdfStyle
): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} style={style} />);
}
