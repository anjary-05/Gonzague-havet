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

