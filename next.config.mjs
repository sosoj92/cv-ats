/** @type {import('next').NextConfig} */
const nextConfig = {
  // Laisse ces libs de génération de documents s'exécuter côté Node sans être
  // bundlées par Next (évite les erreurs de packaging serveur).
  serverExternalPackages: ["@react-pdf/renderer", "mammoth", "unpdf"],
};

export default nextConfig;
