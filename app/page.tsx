"use client";

import { useState } from "react";
import AtsGuide from "./AtsGuide";
import ScanReport from "./ScanReport";
import type { ScanResult } from "@/lib/scanPrompt";

export default function Home() {
  const [cv, setCv] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [result, setResult] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false); // optimisation
  const [scanLoading, setScanLoading] = useState(false); // scan
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const busy = loading || scanLoading;
  // Optimiser exige le CV ET l'annonce ; Scanner n'exige que le CV.
  const canOptimize = cv.trim().length > 0 && annonce.trim().length > 0 && !busy;
  const canScan = cv.trim().length > 0 && !busy;

  async function handleOptimize() {
    setLoading(true);
    setError("");
    setResult("");
    setScanResult(null);
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

  async function handleScan() {
    setScanLoading(true);
    setError("");
    setScanResult(null);
    setResult("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, annonce }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue.");
        return;
      }

      setScanResult(data.result ?? null);
    } catch {
      setError("Impossible de contacter le serveur. Réessaie.");
    } finally {
      setScanLoading(false);
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
          Colle ton CV et l&apos;annonce visée. <strong>Optimiser</strong> réécrit
          ton CV en version ATS ; <strong>Scanner</strong> diagnostique sa
          compatibilité (l&apos;annonce est alors optionnelle). Aucune donnée
          n&apos;est stockée.
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
          <label htmlFor="annonce">
            L&apos;annonce d&apos;emploi{" "}
            <span className="label-hint">(optionnelle pour le scan)</span>
          </label>
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
        <button onClick={handleOptimize} disabled={!canOptimize} className="primary">
          {loading ? "Optimisation en cours…" : "Optimiser"}
        </button>
        <button onClick={handleScan} disabled={!canScan} className="primary secondary-action">
          {scanLoading ? "Scan en cours…" : "Scanner mon CV"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {scanResult && <ScanReport data={scanResult} />}

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
