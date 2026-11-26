// Utilitaires de lecture du contexte : aucune API réseau, aucune mutation du contexte.
export function asObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function asText(value, fallback = "") {
  return typeof value === "string" && value !== "" ? value : fallback;
}

export function asNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

// URL interne produite par le serveur (ex. `/api/medias/:id/file?t=…` pour une
// photo signée, ou `/api/chat/attachments/:id/file?t=…`). Le contrat hôte
// expose ces URL telles quelles : elles sont relatives à la page `/l/<token>`.
// On n'accepte qu'un chemin absolu de même origine — jamais `//hôte`, jamais
// de protocole, de barre inversée, de contrôle ou de traversée `..`.
export function isSameOriginUrl(value) {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return false;
  if (/[\u0000-\u001F\u007F\\]/.test(url)) return false;
  if (/(^|\/)\.\.(\/|$|%2f)/i.test(url)) return false;
  return true;
}

// Seules les URL réellement affichables sont acceptées : http(s), chemins
// internes de même origine, blobs locaux créés par l'hôte (pièces jointes) et
// data-URI du type attendu. Tout le reste (javascript:, vbscript:, fichier
// local, protocole relatif…) est rejeté.
export function isSafeMediaUrl(value, kind = "media") {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (url === "") return false;
  if (isHttpUrl(url) || isSameOriginUrl(url)) return true;
  if (/^blob:/i.test(url)) return true;
  if (/^data:/i.test(url)) {
    if (kind === "image") return /^data:image\//i.test(url);
    if (kind === "audio") return /^data:audio\//i.test(url);
    if (kind === "video") return /^data:video\//i.test(url);
  }
  return false;
}

// `actions.openMedia()` est validée côté hôte : elle n'accepte que http(s).
// Une URL interne sûre est donc résolue contre l'origine de la page avant
// d'être transmise. Renvoie "" si l'URL n'est pas ouvrable.
export function toOpenableUrl(value) {
  if (!isSafeMediaUrl(value)) return "";
  const url = value.trim();
  if (isHttpUrl(url)) return url;
  if (!isSameOriginUrl(url) || typeof window === "undefined" || !window.location?.href) return "";
  try {
    const absolute = new URL(url, window.location.href).href;
    return isHttpUrl(absolute) ? absolute : "";
  } catch {
    return "";
  }
}

export function isMailtoUrl(value) {
  return typeof value === "string" && /^mailto:/i.test(value.trim());
}
