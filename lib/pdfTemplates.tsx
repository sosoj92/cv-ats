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
 *   - « moderne » : sans-serif, nom à gauche, accent bleu marine, filets fins.
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
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CvContent } from "./prompt";

// Désactive la césure automatique (évite les coupures moches type « Canva- »).
Font.registerHyphenationCallback((word) => [word]);

export type PdfStyle = "moderne" | "finance" | "minimal";

const NAVY = "#1f3a5f";
const INK = "#1a1a1a";
const GREY = "#5b6470";
const HAIRLINE = "#d7dce3";

/** Paramètres visuels propres à chaque style. */
type Theme = {
  fontFamily: "Helvetica" | "Times-Roman";
  headerAlign: "left" | "center";
  pagePadding: number;
  nameSize: number;
  nameColor: string;
  titleSize: number;
  titleColor: string;
  titleItalic: boolean;
  headerRule: boolean; // filet sous l'en-tête
  headerRuleColor: string;
  sectionColor: string;
  sectionSize: number;
  sectionLetterSpacing: number;
  sectionGap: number; // espace au-dessus de chaque section
  sectionRuleAbove: boolean; // filet noir entre sections (finance)
  sectionUnderline: boolean; // fin filet sous le titre (moderne)
  bodyLineHeight: number;
  competencesInline: boolean; // compétences en ligne « a · b · c » sinon puces
};

const THEMES: Record<PdfStyle, Theme> = {
  moderne: {
    fontFamily: "Helvetica",
    headerAlign: "left",
    pagePadding: 46,
    nameSize: 24,
    nameColor: INK,
    titleSize: 12,
    titleColor: NAVY,
    titleItalic: false,
    headerRule: true,
    headerRuleColor: NAVY,
    sectionColor: NAVY,
    sectionSize: 10.5,
    sectionLetterSpacing: 1.5,
    sectionGap: 17,
    sectionRuleAbove: false,
    sectionUnderline: true,
    bodyLineHeight: 1.4,
    competencesInline: true,
  },
  finance: {
    fontFamily: "Times-Roman",
    headerAlign: "center",
    pagePadding: 54,
    nameSize: 25,
    nameColor: "#000000",
    titleSize: 12.5,
    titleColor: "#222222",
    titleItalic: true,
    headerRule: true,
    headerRuleColor: "#000000",
    sectionColor: "#000000",
    sectionSize: 12,
    sectionLetterSpacing: 1,
    sectionGap: 15,
    sectionRuleAbove: true,
    sectionUnderline: false,
    bodyLineHeight: 1.45,
    competencesInline: false,
  },
  minimal: {
    fontFamily: "Helvetica",
    headerAlign: "left",
    pagePadding: 62,
    nameSize: 21,
    nameColor: INK,
    titleSize: 11,
    titleColor: GREY,
    titleItalic: false,
    headerRule: false,
    headerRuleColor: HAIRLINE,
    sectionColor: "#8a919c",
    sectionSize: 9,
    sectionLetterSpacing: 3,
    sectionGap: 22,
    sectionRuleAbove: false,
    sectionUnderline: false,
    bodyLineHeight: 1.55,
    competencesInline: true,
  },
};

/** Construit la feuille de styles pour un thème donné. */
function makeStyles(t: Theme) {
  return StyleSheet.create({
    page: {
      fontFamily: t.fontFamily,
      fontSize: 10,
      lineHeight: t.bodyLineHeight,
      color: "#1e232b",
      paddingTop: t.pagePadding,
      paddingBottom: t.pagePadding,
      paddingHorizontal: t.pagePadding,
    },
    header: {
      textAlign: t.headerAlign,
      paddingBottom: t.headerRule ? 10 : 2,
      marginBottom: t.headerRule ? 4 : 2,
      borderBottomWidth: t.headerRule ? (t.fontFamily === "Times-Roman" ? 1 : 1.4) : 0,
      borderBottomColor: t.headerRuleColor,
    },
    name: {
      fontSize: t.nameSize,
      fontFamily: t.fontFamily,
      fontWeight: "bold",
      color: t.nameColor,
      letterSpacing: t.fontFamily === "Times-Roman" ? 0 : 0.3,
      // Hauteur de ligne explicite : sinon le titre remonte et chevauche le nom.
      lineHeight: 1.2,
      marginBottom: 2,
    },
    title: {
      fontSize: t.titleSize,
      color: t.titleColor,
      fontStyle: t.titleItalic ? "italic" : "normal",
      lineHeight: 1.3,
      marginTop: 2,
    },
    contact: { fontSize: 9, color: GREY, marginTop: 5, lineHeight: 1.3 },

    section: {
      marginTop: t.sectionGap,
      paddingTop: t.sectionRuleAbove ? 9 : 0,
      borderTopWidth: t.sectionRuleAbove ? 1 : 0,
      borderTopColor: "#000000",
    },
    sectionTitle: {
      fontSize: t.sectionSize,
      fontWeight: "bold",
      color: t.sectionColor,
      textTransform: "uppercase",
      letterSpacing: t.sectionLetterSpacing,
      marginBottom: t.sectionUnderline ? 4 : 7,
      paddingBottom: t.sectionUnderline ? 3 : 0,
      borderBottomWidth: t.sectionUnderline ? 0.75 : 0,
      borderBottomColor: HAIRLINE,
    },

    profil: { fontSize: 10, color: "#2b3038" },

    exp: { marginTop: 9 },
    expHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    expRole: { fontSize: 10.5, fontWeight: "bold", color: INK, flex: 1, paddingRight: 10 },
    expDates: { fontSize: 9, color: GREY },

    bullet: { flexDirection: "row", marginTop: 2.5, paddingLeft: 2 },
    bulletDot: { width: 11, fontSize: 10, color: t.fontFamily === "Times-Roman" ? "#000" : NAVY },
    bulletText: { flex: 1, fontSize: 10, color: "#2b3038" },

    // Compétences en ligne : chaque compétence est un élément atomique dans une
    // rangée qui passe à la ligne (aucun mot ne peut être coupé au milieu).
    compRow: { flexDirection: "row", flexWrap: "wrap" },
    compItem: { fontSize: 10, color: "#2b3038", lineHeight: 1.5 },
    compSep: { fontSize: 10, color: HAIRLINE, lineHeight: 1.5 },

    formItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginTop: 5,
    },
    formLeft: { fontSize: 10, color: INK, flex: 1, paddingRight: 10 },
    formDates: { fontSize: 9, color: GREY },
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
      entete: [f.intitule.trim(), f.etablissement.trim()].filter(Boolean).join(" — "),
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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {d.nom ? <Text style={s.name}>{d.nom}</Text> : null}
          {d.titre ? <Text style={s.title}>{d.titre}</Text> : null}
          {d.contact ? <Text style={s.contact}>{d.contact}</Text> : null}
        </View>

        {d.profil ? (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Profil</Text>
            <Text style={s.profil}>{d.profil}</Text>
          </View>
        ) : null}

        {d.experiences.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle} minPresenceAhead={60}>
              Expérience professionnelle
            </Text>
            {d.experiences.map((e, i) => (
              <View key={i} style={s.exp} wrap={false}>
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
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Compétences</Text>
            {t.competencesInline ? (
              <View style={s.compRow}>
                {d.competences.map((c, i) => (
                  <Text key={i} style={s.compItem}>
                    {c}
                    {i < d.competences.length - 1 ? (
                      <Text style={s.compSep}>{"    ·    "}</Text>
                    ) : null}
                  </Text>
                ))}
              </View>
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
          <View style={s.section} wrap={false}>
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
