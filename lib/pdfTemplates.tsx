/**
 * ============================================================================
 *  TEMPLATE PDF  —  export du CV optimisé en VRAI TEXTE (pas d'image)
 * ============================================================================
 *
 * Utilise @react-pdf/renderer : le PDF contient du texte réel, sélectionnable
 * et lisible par un ATS (aucune capture d'écran, aucun html2canvas).
 *
 * On s'appuie uniquement sur la police intégrée Helvetica (sans-serif) :
 * aucun fichier de police externe, et le français (accents) est bien encodé.
 *
 * Style « moderne sobre » : une seule colonne, nom à gauche, titres de section
 * en bleu marine, marges généreuses. Aucun tableau / colonne / image.
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

const NAVY = "#1f3a5f";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#111111",
    padding: 52,
  },
  header: { marginBottom: 6 },
  name: { fontSize: 22, fontFamily: "Helvetica", fontWeight: "bold" },
  title: { fontSize: 12, marginTop: 3 },
  contact: { fontSize: 9, color: "#555555", marginTop: 4 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  profil: { fontSize: 10 },
  expHead: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  expRole: { fontSize: 10.5, fontWeight: "bold", flex: 1, paddingRight: 8 },
  expDates: { fontSize: 9, color: "#555555" },
  bullet: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
  bulletDot: { width: 10, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  formItem: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  formLeft: { fontSize: 10, flex: 1, paddingRight: 8 },
  formDates: { fontSize: 9, color: "#555555" },
});

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

function CvDocument({ cv }: { cv: CvContent }) {
  const d = prepare(cv);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {d.nom ? <Text style={styles.name}>{d.nom}</Text> : null}
          {d.titre ? <Text style={styles.title}>{d.titre}</Text> : null}
          {d.contact ? <Text style={styles.contact}>{d.contact}</Text> : null}
        </View>

        {d.profil ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profil</Text>
            <Text style={styles.profil}>{d.profil}</Text>
          </View>
        ) : null}

        {d.experiences.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expérience professionnelle</Text>
            {d.experiences.map((e, i) => (
              <View key={i} wrap={false}>
                <View style={styles.expHead}>
                  <Text style={styles.expRole}>{e.entete}</Text>
                  {e.dates ? <Text style={styles.expDates}>{e.dates}</Text> : null}
                </View>
                {e.puces.map((p, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {d.competences.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compétences</Text>
            {d.competences.map((c, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {d.formation.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formation</Text>
            {d.formation.map((f, i) => (
              <View key={i} style={styles.formItem}>
                <Text style={styles.formLeft}>{f.entete}</Text>
                {f.dates ? <Text style={styles.formDates}>{f.dates}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

/** Génère le PDF en mémoire et renvoie le buffer. */
export async function buildCvPdf(cv: CvContent): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} />);
}
