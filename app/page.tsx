"use client";

import { useRef, useState } from "react";
import AtsGuide from "./AtsGuide";
import ScanReport from "./ScanReport";
import type { ScanResult } from "@/lib/scanPrompt";
import { cvContentToText, type CvContent } from "@/lib/prompt";

export default function Home() {
  const [cv, setCv] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [result, setResult] = useState<CvContent | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false); // optimisation
  const [scanLoading, setScanLoading] = useState(false); // scan
  const [importing, setImporting] = useState(false); // import de fichier
  const [downloading, setDownloading] = useState(false); // export .docx
  const [downloadingPdf, setDownloadingPdf] = useState(false); // export .pdf
  const [notice, setNotice] = useState(""); // message de confirmation d'import
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rendu texte brut copiable, reconstruit proprement depuis le JSON structuré.
  const resultText = result ? cvContentToText(result) : "";

  const busy = loading || scanLoading || importing;
  // Optimiser exige le CV ET l'annonce ; Scanner n'exige que le CV.
  const canOptimize = cv.trim().length > 0 && annonce.trim().length > 0 && !busy;
  const canScan = cv.trim().length > 0 && !busy;

  async function handleOptimize() {
    setLoading(true);
    setError("");
    setResult(null);
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

      setResult((data.result as CvContent) ?? null);
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
    setResult(null);

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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // On réinitialise l'input tout de suite pour pouvoir réimporter le même
    // fichier deux fois de suite (sinon onChange ne se redéclenche pas).
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setError("");
    setNotice("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Import impossible.");
        return;
      }

      // On remplit la zone CV : l'utilisateur peut relire/corriger ensuite.
      setCv(data.text ?? "");
      setNotice(
        `Texte importé depuis « ${file.name} ». Relis-le et corrige si besoin avant d'optimiser ou scanner.`
      );
    } catch {
      setError("Impossible de contacter le serveur pour l'import. Réessaie.");
    } finally {
      setImporting(false);
    }
  }

  async function handleCopy() {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible dans ce navigateur.");
    }
  }

  async function handleDownloadDocx() {
    if (!result) return;
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Le téléchargement a échoué.");
        return;
      }

      const blob = await res.blob();
      triggerDownload(blob, "cv-optimise.docx");
    } catch {
      setError("Impossible de générer le fichier. Réessaie.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!result) return;
    setDownloadingPdf(true);
    setError("");
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Le téléchargement PDF a échoué.");
        return;
      }

      const blob = await res.blob();
      triggerDownload(blob, "cv-optimise.pdf");
    } catch {
      setError("Impossible de générer le PDF. Réessaie.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Déclenche le téléchargement d'un blob dans le navigateur (rien n'est stocké).
  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          <div className="cv-label-row">
            <label htmlFor="cv">Ton CV</label>
            <button
              type="button"
              className="import-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {importing ? "Import en cours…" : "Importer un fichier"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleImport}
              hidden
            />
          </div>
          <textarea
            id="cv"
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder="Colle ici le texte de ton CV, ou importe un .pdf / .docx…"
            rows={16}
          />
          {notice && <p className="notice">{notice}</p>}
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
          <textarea id="result" value={resultText} readOnly rows={22} />
          <div className="result-actions">
            <button
              onClick={handleDownloadDocx}
              disabled={!result || downloading}
              className="primary secondary-action"
            >
              {downloading ? "Génération…" : "Télécharger en .docx"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!result || downloadingPdf}
              className="primary"
            >
              {downloadingPdf ? "Génération…" : "Télécharger en PDF"}
            </button>
          </div>
        </section>
      )}

      <AtsGuide />
    </main>
  );
}
