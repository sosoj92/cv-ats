/**
 * ============================================================================
 *  LIMITEUR DE DÉBIT (rate limiting) par IP
 * ============================================================================
 *
 * But : éviter qu'un visiteur inconnu enchaîne les appels et consomme la clé
 * API (donc tes crédits Anthropic). On limite le nombre de requêtes par IP
 * et par fenêtre de temps.
 *
 * Implémentation : compteur en mémoire (fenêtre fixe). Simple, sans dépendance
 * ni service externe.
 *
 *   ⚠️ Limite connue en serverless (Vercel) : la mémoire n'est pas partagée
 *   entre les instances de fonction. Le limiteur protège donc « par instance »
 *   — utile contre les abus basiques, mais pas infaillible. Pour une protection
 *   robuste et globale, on branchera plus tard un store partagé (ex. Upstash
 *   Redis + @upstash/ratelimit) : il suffira de remplacer `rateLimit()` ici,
 *   les routes n'auront pas à changer.
 * ----------------------------------------------------------------------------
 */

type Bucket = { count: number; resetAt: number };

// Un seau par clé (ex. "optimize:1.2.3.4"). Nettoyé paresseusement.
const buckets = new Map<string, Bucket>();

/** Récupère l'IP du client derrière le proxy (Vercel renseigne x-forwarded-for). */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateResult = { ok: boolean; retryAfter: number };

/**
 * Autorise ou non une requête pour `key`.
 * @param key     identifiant (ex. `optimize:${ip}`)
 * @param limit   nb max de requêtes dans la fenêtre
 * @param windowMs durée de la fenêtre en millisecondes
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();

  // Nettoyage paresseux : si la Map grossit trop, on purge les seaux expirés.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * Helper prêt à l'emploi pour une route : renvoie une réponse 429 si la limite
 * est dépassée, sinon `null` (on continue). Usage :
 *
 *   const limited = enforceRateLimit(request, "optimize", 10, 60_000);
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): Response | null {
  const ip = getClientIp(request);
  const { ok, retryAfter } = rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (ok) return null;
  return new Response(
    JSON.stringify({
      error: `Trop de requêtes. Réessaie dans ${retryAfter} seconde(s).`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
