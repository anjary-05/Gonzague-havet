// Registre central des formats de conversation.
//
// C'est le seul endroit où sont déclarés :
//   - les résolveurs de blocs ADR-0067 (`text`, `image`, `tool_search_result`) ;
//   - les vues OOP associées à chaque partie normalisée (texte Markdown, médias,
//     résultats d'outils, repli) ;
//   - les versions de contrat comprises et le formatage des champs typés.
//
// `MultimodalContent` produit des parties, ce registre choisit leur résolution
// et leur vue ; `MessageView` ne fait que le consulter. Une nouvelle forme de
// contenu s'ajoute avec `registerFormat()` — ou, pour compatibilité, avec
// `registerBlockResolver()` + `registerPartView()` — sans modifier le moteur
// récursif ni le message. Aucun DOM, aucun HTML brut, aucune exécution de code.

import { componentRegistry } from "./ComponentRegistry.js";

/** Versions du contrat de blocs comprises par ce template. */
export const KNOWN_CONTRACT_VERSIONS = [1];

/** Types de champs typés définis par l'hôte (ADR-0067 §5). */
export const TOOL_FIELD_TYPES = [
  "text", "textarea", "number", "date", "url", "email", "image", "select", "multi",
];

/** Vue de secours d'un bloc structuré non enregistré. */
export const FALLBACK_VIEW = "block-fallback";

const FIELD_TYPES = new Set(TOOL_FIELD_TYPES);
const resolvers = new Map();
const views = Object.create(null);
const formats = new Map();

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(", ");
  return String(value);
}

export function isKnownContractVersion(version) {
  return KNOWN_CONTRACT_VERSIONS.includes(version);
}

/** Date lisible et déterministe (AAAA-MM-JJ → JJ/MM/AAAA). */
export function formatDate(value) {
  const raw = asText(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match === null) return raw;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Valeur seule d'un champ typé (sans libellé), toujours en texte. */
export function formatToolFieldValue(field) {
  if (!isRecord(field)) return "";
  const type = FIELD_TYPES.has(field.type) ? field.type : "text";
  const value = field.value;
  let text;
  switch (type) {
    case "date":
      text = formatDate(value);
      break;
    case "number": {
      const numeric = typeof value === "number" ? value : Number(value);
      text = Number.isFinite(numeric) ? String(numeric) : asText(value);
      if (text !== "" && typeof field.unit === "string" && field.unit !== "") {
        text = `${text} ${field.unit}`;
      }
      break;
    }
    case "multi":
      text = Array.isArray(value) ? value.map((entry) => String(entry)).join(" · ") : asText(value);
      break;
    default:
      text = asText(value);
  }
  return text;
}

/** Représentation texte complète d'un champ typé (libellé inclus). */
export function formatToolField(field) {
  if (!isRecord(field)) return "";
  const label = typeof field.label === "string" && field.label !== "" ? field.label : "";
  const text = formatToolFieldValue(field);
  return label === "" ? text : `${label} : ${text}`;
}

function normalizeField(field) {
  if (!isRecord(field)) return null;
  const key = typeof field.key === "string" ? field.key : "";
  if (key === "") return null;
  // Un champ fichier n'est jamais rendu (ADR-0067 §6/§10).
  if (field.type === "file") return null;
  const type = typeof field.type === "string" && FIELD_TYPES.has(field.type) ? field.type : "text";
  const raw = field.value;
  const value = raw === null || typeof raw === "string" || typeof raw === "number"
    ? raw
    : Array.isArray(raw) ? raw.filter((entry) => typeof entry === "string") : null;
  return {
    key,
    label: typeof field.label === "string" && field.label !== "" ? field.label : key,
    type,
    value,
    ...(typeof field.unit === "string" && field.unit !== "" ? { unit: field.unit } : {}),
  };
}

function resolveText(block) {
  return typeof block.text === "string" ? { type: "text", text: block.text } : null;
}

function resolveImage(block) {
  return typeof block.url === "string"
    ? {
        type: "image",
        url: block.url,
        ...(typeof block.alt === "string" ? { alt: block.alt } : {}),
      }
    : null;
}

function resolveToolSearchResult(block) {
  if (!isKnownContractVersion(block.contractVersion)) return null;
  if (typeof block.tool !== "string" || !Array.isArray(block.items)) return null;
  const items = [];
  for (const item of block.items) {
    if (!isRecord(item) || !Array.isArray(item.fields)) continue;
    const fields = item.fields.map(normalizeField).filter((field) => field !== null);
    if (fields.length > 0) items.push({ fields });
  }
  const meta = isRecord(block.meta) ? block.meta : {};
  return {
    type: "tool_search_result",
    tool: block.tool,
    layout: block.layout === "card" || block.layout === "list" ? block.layout : "list",
    items,
    meta: {
      ...(typeof meta.total === "number" ? { total: meta.total } : {}),
      ...(typeof meta.hasMore === "boolean" ? { hasMore: meta.hasMore } : {}),
    },
  };
}

/**
 * Point d'extension unique : déclare en une fois le résolveur de bloc et la
 * vue d'une partie. `partKey` est `kind` ou `structured:<block>`.
 */
export function registerFormat(format = {}) {
  if (!isRecord(format) || typeof format.key !== "string" || format.key === "") {
    throw new Error("format invalide");
  }
  const partKey = typeof format.partKey === "string" && format.partKey !== ""
    ? format.partKey
    : format.kind === "structured"
      ? `structured:${format.block ?? format.key}`
      : format.kind ?? format.key;
  if (typeof partKey !== "string" || partKey === "") throw new Error("format invalide");
  if (format.view !== undefined) {
    if (typeof format.view !== "string" || format.view === "") throw new Error("vue de format invalide");
    views[partKey] = format.view;
  }
  if (typeof format.block === "string" && format.block !== "" && typeof format.resolver === "function") {
    resolvers.set(format.block, format.resolver);
  }
  const entry = Object.freeze({ ...format, key: format.key, partKey });
  formats.set(entry.key, entry);
  return entry;
}

// Déclaration centralisée : résolveurs ADR-0067 et vues OOP des parties.
const DEFAULT_FORMATS = [
  { key: "text", partKey: "text", block: "text", resolver: resolveText, view: "markdown" },
  { key: "image", partKey: "image", block: "image", resolver: resolveImage, view: "media-part" },
  { key: "audio", partKey: "audio", view: "media-part" },
  { key: "video", partKey: "video", view: "media-part" },
  { key: "file", partKey: "file", view: "media-part" },
  { key: "link", partKey: "link", view: "media-part" },
  { key: "structured", partKey: "structured", view: FALLBACK_VIEW },
  {
    key: "tool_search_result",
    partKey: "structured:tool_search_result",
    block: "tool_search_result",
    resolver: resolveToolSearchResult,
    view: "tool-result",
  },
];
DEFAULT_FORMATS.forEach(registerFormat);

/** Formats déclarés (lecture seule) — source de vérité unique. */
export const CONTENT_FORMATS = Object.freeze(DEFAULT_FORMATS.map((format) => formats.get(format.key)));

/** Compatibilité : ajoute ou remplace un résolveur de bloc. */
export function registerBlockResolver(type, resolver) {
  if (typeof type !== "string" || type === "" || typeof resolver !== "function") {
    throw new Error("résolveur de bloc invalide");
  }
  return registerFormat({ key: `block:${type}`, block: type, resolver });
}

/** Résout un bloc brut en description sûre, ou `null` si ignorable. */
export function resolveBlock(block) {
  if (!isRecord(block)) return null;
  const resolver = resolvers.get(block.type);
  if (typeof resolver !== "function") return null;
  const resolved = resolver(block);
  return isRecord(resolved) ? resolved : null;
}

/** Texte de secours si aucun bloc connu ne peut être affiché. */
export function renderFallbackText(blocks, content) {
  const body = typeof content === "string" ? content : "";
  const lines = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const resolved = resolveBlock(block);
    if (resolved === null) continue;
    if (resolved.type === "text") {
      if (resolved.text.trim() !== "") lines.push(resolved.text);
      continue;
    }
    if (resolved.type === "tool_search_result") {
      for (const item of resolved.items) {
        const values = item.fields
          .filter((field) => field.type !== "image")
          .map((field) => formatToolField(field))
          .filter((value) => value !== "");
        if (values.length > 0) lines.push(values.join(" — "));
      }
      continue;
    }
    if (typeof resolved.text === "string" && resolved.text.trim() !== "") lines.push(resolved.text);
  }
  return lines.length > 0 ? lines.join("\n") : body;
}

/** Vue objet des blocs d'un message, utilisable par les tests et les vues. */
export class GenerativeBlock {
  constructor(raw = {}) {
    const source = isRecord(raw) ? raw : {};
    this.raw = source;
    this.blocks = (Array.isArray(source.blocks) ? source.blocks : [])
      .map((block) => resolveBlock(block))
      .filter((block) => block !== null);
  }

  static from(message) {
    return new GenerativeBlock(message);
  }

  get isEmpty() {
    return this.blocks.length === 0;
  }

  get fallbackText() {
    return renderFallbackText(this.raw.blocks, this.raw.content);
  }

  get structured() {
    return this.blocks.filter((block) => block.type !== "text" && block.type !== "image");
  }
}

/** Compatibilité : associe un kind (ou `kind:type`) à un type de vue. */
export function registerPartView(kind, type) {
  if (typeof kind !== "string" || kind === "" || typeof type !== "string" || type === "") {
    throw new Error("association de vue invalide");
  }
  return registerFormat({ key: `view:${kind}`, partKey: kind, view: type });
}

export function partViewType(part) {
  if (!part || typeof part !== "object") return null;
  const structuredType = part.kind === "structured" && part.block?.type
    ? views[`structured:${part.block.type}`]
    : null;
  return structuredType ?? views[part.kind] ?? null;
}

/** Construit les props de base d'une vue à partir de la partie. */
export function partViewProps(part) {
  if (!part || typeof part !== "object") return {};
  if (part.kind === "text") {
    return { document: part.document, text: part.text };
  }
  if (part.kind === "structured") {
    return { block: part.block };
  }
  return { part };
}

/**
 * Crée le nœud de vue d'une partie. Retourne `null` si aucun type n'est
 * enregistré (extension non chargée) : le message reste lisible.
 */
export function createPartView(part, commonProps = {}, id = undefined) {
  const type = partViewType(part);
  if (type === null || !componentRegistry.has(type)) return null;
  return componentRegistry.create(type, {
    id,
    type,
    props: { ...partViewProps(part), ...commonProps },
  });
}

export { views as partViews, formats as contentFormats, isRecord };
