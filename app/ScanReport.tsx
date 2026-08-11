/**
 * ============================================================================
 *  AFFICHAGE DU DIAGNOSTIC ATS (résultat du bouton « Scanner mon CV »)
 * ============================================================================
 *
 * Composant purement présentationnel : il reçoit un `ScanResult` (la forme
 * définie dans lib/scanPrompt.ts) et l'affiche de façon lisible.
 *   - score bien visible, coloré selon le niveau (rouge / orange / vert)
 *   - puis chaque section (points forts, problèmes, mots-clés, recommandations)
 *
 * Les styles vivent dans app/globals.css (classes .scan-*).
 * ----------------------------------------------------------------------------
 */

import type { ScanResult } from "@/lib/scanPrompt";

/** Niveau visuel du score → couleur. <50 rouge, <75 orange, sinon vert. */
function scoreLevel(score: number): "low" | "mid" | "high" {
  if (score < 50) return "low";
  if (score < 75) return "mid";
  return "high";
}

/** Libellé lisible du niveau global. */
function scoreLabel(score: number): string {
  if (score < 50) return "Compatibilité faible";
  if (score < 75) return "Compatibilité moyenne";
  return "Bonne compatibilité";
}

export default function ScanReport({ data }: { data: ScanResult }) {
  const level = scoreLevel(data.score);

  return (
    <section className="scan-report">
      {/* --- Score --- */}
      <div className={`scan-score scan-score--${level}`}>
        <div className="scan-score-number">
          {data.score}
          <span className="scan-score-max">/100</span>
        </div>
        <div className="scan-score-label">{scoreLabel(data.score)}</div>
      </div>

      {/* --- Points forts --- */}
      {data.pointsForts.length > 0 && (
        <div className="scan-block">
          <h3 className="scan-block-title">Points forts</h3>
          <ul className="scan-list">
            {data.pointsForts.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Problèmes (avec badge de gravité) --- */}
      {data.problemes.length > 0 && (
        <div className="scan-block">
          <h3 className="scan-block-title">Problèmes détectés</h3>
          <ul className="scan-list scan-list--problems">
            {data.problemes.map((p, i) => (
              <li key={i}>
                <span
                  className={`scan-badge scan-badge--${
                    p.severite === "élevée"
                      ? "high"
                      : p.severite === "moyenne"
                      ? "mid"
                      : "low"
                  }`}
                >
                  {p.severite}
                </span>
                <span>{p.texte}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Mots-clés manquants (seulement si une annonce était fournie) --- */}
      {data.motsClesManquants.length > 0 && (
        <div className="scan-block">
          <h3 className="scan-block-title">Mots-clés manquants</h3>
          <div className="scan-chips">
            {data.motsClesManquants.map((kw, i) => (
              <span key={i} className="scan-chip">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* --- Recommandations --- */}
      {data.recommandations.length > 0 && (
        <div className="scan-block">
          <h3 className="scan-block-title">Recommandations</h3>
          <ul className="scan-list">
            {data.recommandations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
