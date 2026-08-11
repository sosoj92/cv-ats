"use client";

import { useState } from "react";
import AtsGuide from "./AtsGuide";

export default function Home() {
  const [cv, setCv] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canSubmit = cv.trim().length > 0 && annonce.trim().length > 0 && !loading;

  async function handleOptimize() {
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, annonce }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue.");
        return;
      }

      setResult(data.result ?? "");
    } catch {
      setError("Impossible de contacter le serveur. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible dans ce navigateur.");
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>CV-ATS</h1>
        <p className="subtitle">
          Colle ton CV et l&apos;annonce visée, obtiens une version optimisée pour
          les filtres ATS. Aucune donnée n&apos;est stockée.
        </p>
      </header>

      <section className="grid">
        <div className="field">
          <label htmlFor="cv">Ton CV</label>
          <textarea
            id="cv"
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder="Colle ici le texte de ton CV actuel…"
            rows={16}
          />
        </div>

        <div className="field">
          <label htmlFor="annonce">L&apos;annonce d&apos;emploi</label>
          <textarea
            id="annonce"
            value={annonce}
            onChange={(e) => setAnnonce(e.target.value)}
            placeholder="Colle ici le texte de l'annonce ciblée…"
            rows={16}
          />
        </div>
      </section>

      <div className="actions">
        <button onClick={handleOptimize} disabled={!canSubmit} className="primary">
          {loading ? "Optimisation en cours…" : "Optimiser"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <section className="field result-block">
          <div className="result-head">
            <label htmlFor="result">Résultat optimisé</label>
            <button onClick={handleCopy} className="secondary">
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <textarea id="result" value={result} readOnly rows={22} />
        </section>
      )}

      <AtsGuide />
    </main>
  );
}
