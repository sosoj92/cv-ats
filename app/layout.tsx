import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV-ATS — Optimise ton CV pour les ATS",
  description:
    "Colle ton CV et une annonce d'emploi, obtiens une version optimisée ATS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
