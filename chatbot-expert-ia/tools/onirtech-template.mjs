#!/usr/bin/env node
// CLI du kit : `onirtech-template validate <dir>` et `onirtech-template pack <dir>`.
// `pack` synchronise l'intégrité SRI de l'entrée puis produit l'archive ZIP
// `.onirtech-template` + un `release.json` (SHA-256).
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { zipSync } from "fflate";

const HOST_PROTOCOL = "onirtech.template-host.v1";
const SKIP = new Set(["node_modules", ".git", "release", ".DS_Store"]);

const [cmd, dirArg] = process.argv.slice(2);
const dir = join(process.cwd(), dirArg ?? ".");
if (!["validate", "pack"].includes(cmd)) {
  console.error("Usage : onirtech-template <validate|pack> <dir>");
  process.exit(1);
}

const sri = (buf) => `sha256-${createHash("sha256").update(buf).digest("base64")}`;
const hex = (buf) => createHash("sha256").update(buf).digest("hex");

const loadManifest = async () =>
  JSON.parse(await readFile(join(dir, "onirtech.template.json"), "utf8"));
const loadEntry = async (manifest) => readFile(join(dir, manifest.ui.entry.replace(/^\.\//, "")));

// Contrat courant (ADR-0023 / ADR-0095 / ADR-0105) : paramètres scalaires et
// structurés, jusqu'à 64 paramètres et 64 Kio de valeurs.
const PARAM_TYPES = ["string", "text", "number", "boolean", "color", "url", "image", "select", "object", "array"];
const PARAM_KEY = /^[a-z][a-z0-9_]{1,40}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_PARAMS = 64;
const MAX_PARAMS_BYTES = 64 * 1024;
const MAX_PARAM_STRING = 2000;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/** Validation récursive d'un paramètre `object` / `array` (ADR-0095). */
function checkStructured(value, schema, at) {
  const errors = [];
  if (!isObject(schema)) return [`${at} : schéma attendu`];
  if (schema.type === "object") {
    if (!isObject(value)) return [`${at} : objet attendu`];
    const properties = Array.isArray(schema.properties) ? schema.properties : [];
    const declared = new Set();
    for (const property of properties) {
      if (!isObject(property) || typeof property.key !== "string" || !PARAM_KEY.test(property.key)) {
        errors.push(`${at}.properties[].key : ^[a-z][a-z0-9_]{1,40}$`);
        continue;
      }
      declared.add(property.key);
      if (!Object.prototype.hasOwnProperty.call(property, "default")) {
        errors.push(`${at}.properties.${property.key}.default : valeur par défaut obligatoire`);
      }
      if (Object.prototype.hasOwnProperty.call(value, property.key)) {
        errors.push(...checkStructured(value[property.key], property, `${at}.${property.key}`));
      }
    }
    for (const key of Object.keys(value)) {
      if (!declared.has(key)) errors.push(`${at}.${key} : clé non déclarée`);
    }
    return errors;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return [`${at} : liste attendue`];
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${at} : au moins ${schema.minItems} éléments`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${at} : au plus ${schema.maxItems} éléments`);
    }
    if (!isObject(schema.items)) errors.push(`${at}.items : schéma d'élément requis`);
    else value.forEach((item, index) => errors.push(...checkStructured(item, schema.items, `${at}[${index}]`)));
    return errors;
  }
  if (schema.type === "string" || schema.type === "text") {
    if (typeof value !== "string") errors.push(`${at} : chaîne attendue`);
  } else if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${at} : nombre fini attendu`);
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") errors.push(`${at} : booléen attendu`);
  }
  return errors;
}

/** Contrôle des zones d'inspection V1 (ADR-0105). */
function checkEditor(editor, params) {
  const errors = [];
  if (!isObject(editor)) return ["editor : objet attendu"];
  if (editor.version !== 1) errors.push("editor.version : 1 attendu");
  const regions = Array.isArray(editor.regions) ? editor.regions : [];
  const ids = new Set();
  const keys = new Set((Array.isArray(params) ? params : []).map((param) => param?.key));
  regions.forEach((region, index) => {
    if (!isObject(region) || typeof region.id !== "string" || region.id === "") {
      errors.push(`editor.regions[${index}].id : requis`);
    } else {
      ids.add(region.id);
    }
    if (region?.visibilityParam !== undefined && !keys.has(region.visibilityParam)) {
      errors.push(`editor.regions[${index}].visibilityParam : paramètre inconnu ${region.visibilityParam}`);
    }
  });
  const bindings = Array.isArray(editor.bindings) ? editor.bindings : [];
  bindings.forEach((binding, index) => {
    if (!keys.has(binding?.param)) errors.push(`editor.bindings[${index}].param : paramètre inconnu`);
    if (!Array.isArray(binding?.regions) || binding.regions.length < 1) {
      errors.push(`editor.bindings[${index}].regions : au moins une zone`);
    } else {
      binding.regions.forEach((id) => {
        if (!ids.has(id)) errors.push(`editor.bindings[${index}].regions : zone inconnue ${id}`);
      });
    }
    if (!["content", "appearance", "action"].includes(binding?.category)) {
      errors.push(`editor.bindings[${index}].category : content | appearance | action`);
    }
  });
  return errors;
}

/** Contrôle du bloc `params` (ADR-0023) — mêmes règles que le cœur. */
function checkParams(params) {
  const errors = [];
  if (params === undefined) return errors;
  if (!Array.isArray(params)) return ["params doit être une liste"];
  if (params.length > MAX_PARAMS) errors.push(`params : au plus ${MAX_PARAMS} entrées`);
  if (Buffer.byteLength(JSON.stringify(params)) > MAX_PARAMS_BYTES) {
    errors.push(`params : dépasse ${MAX_PARAMS_BYTES} octets`);
  }
  const seen = new Set();
  params.forEach((param, index) => {
    const at = `params[${index}]`;
    if (param === null || typeof param !== "object" || Array.isArray(param)) {
      errors.push(`${at} : objet attendu`);
      return;
    }
    if (typeof param.key !== "string" || !PARAM_KEY.test(param.key)) {
      errors.push(`${at}.key : ^[a-z][a-z0-9_]{1,40}$`);
    } else if (seen.has(param.key)) {
      errors.push(`${at}.key : dupliquée (${param.key})`);
    } else {
      seen.add(param.key);
    }
    if (typeof param.label !== "string" || param.label.trim() === "" || param.label.length > 80) {
      errors.push(`${at}.label : requis (1..80)`);
    }
    if (param.description !== undefined && typeof param.description !== "string") {
      errors.push(`${at}.description : chaîne attendue`);
    } else if (typeof param.description === "string" && param.description.length > 200) {
      errors.push(`${at}.description : 200 caractères maximum`);
    }
    if (!PARAM_TYPES.includes(param.type)) {
      errors.push(`${at}.type : ${PARAM_TYPES.join(" | ")}`);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(param, "default")) {
      errors.push(`${at}.default : valeur par défaut obligatoire`);
      return;
    }
    const value = param.default;
    const maxLength = param.maxLength ?? 200;
    switch (param.type) {
      case "string":
      case "text":
        if (typeof value !== "string") errors.push(`${at}.default : chaîne attendue`);
        else if (value.length > maxLength) errors.push(`${at}.default : plus long que maxLength`);
        if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > MAX_PARAM_STRING) {
          errors.push(`${at}.maxLength : entier 1..${MAX_PARAM_STRING}`);
        }
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          errors.push(`${at}.default : nombre fini attendu`);
        } else {
          if (param.min !== undefined && (typeof param.min !== "number" || value < param.min)) {
            errors.push(`${at}.min : nombre fini ≤ défaut`);
          }
          if (param.max !== undefined && (typeof param.max !== "number" || value > param.max)) {
            errors.push(`${at}.max : nombre fini ≥ défaut`);
          }
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") errors.push(`${at}.default : booléen attendu`);
        break;
      case "color":
        if (typeof value !== "string" || !COLOR.test(value)) {
          errors.push(`${at}.default : #rrggbb attendu`);
        }
        break;
      case "url":
        if (typeof value !== "string" || !isHttpUrl(value)) {
          errors.push(`${at}.default : URL http(s) attendue`);
        }
        break;
      case "image":
        // Image importée via l'uploader (ADR-0023) : chaîne (URL signée) ou vide.
        if (typeof value !== "string") errors.push(`${at}.default : chaîne attendue`);
        break;
      case "select": {
        if (!Array.isArray(param.options) || param.options.length === 0) {
          errors.push(`${at}.options : au moins une option`);
          break;
        }
        if (param.options.length > 40) errors.push(`${at}.options : 40 maximum`);
        const values = new Set();
        for (const option of param.options) {
          if (option === null || typeof option !== "object" || typeof option.value !== "string" || option.value === "") {
            errors.push(`${at}.options : { value, label } attendus`);
            continue;
          }
          if (values.has(option.value)) errors.push(`${at}.options : valeur dupliquée ${option.value}`);
          values.add(option.value);
        }
        if (typeof value !== "string" || !values.has(value)) {
          errors.push(`${at}.default : doit être l'une des options`);
        }
        break;
      }
      case "object":
      case "array":
        errors.push(...checkStructured(value, param, at));
        break;
    }
  });
  return errors;
}

function checkManifest(m, entryBuf) {
  const errors = [];
  if (m.schemaVersion !== 1) errors.push("schemaVersion doit valoir 1");
  if (m.kind !== "template") errors.push('kind doit valoir "template"');
  if (m.compatibility?.hostProtocol !== HOST_PROTOCOL) errors.push(`hostProtocol ≠ ${HOST_PROTOCOL}`);
  errors.push(...checkParams(m.params));
  if (m.editor !== undefined) errors.push(...checkEditor(m.editor, m.params));
  if (m.publisher?.trustLevel === "community" && m.ui?.mode === "web-component") {
    errors.push("un template community ne peut pas utiliser ui.mode web-component (→ iframe)");
  }
  if (entryBuf) {
    const entry = entryBuf.toString("utf8");
    if (!entry.includes(m.ui.element)) errors.push(`entry n'enregistre pas l'élément ${m.ui.element}`);
    if (sri(entryBuf) !== m.ui.integrity) errors.push("intégrité désynchronisée (lancez `pack`)");
    const widget = m.ui?.widget;
    if (widget) {
      if (!entry.includes(widget.element)) {
        errors.push(`entry n'enregistre pas l'élément widget ${widget.element}`);
      }
      if (widget.entry === m.ui.entry && sri(entryBuf) !== widget.integrity) {
        errors.push("intégrité du widget désynchronisée (lancez `pack`)");
      }
    }
  }
  return errors;
}

async function walk(root) {
  const out = [];
  for (const name of await readdir(root)) {
    if (SKIP.has(name)) continue;
    const full = join(root, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const manifest = await loadManifest();
const entryBuf = await loadEntry(manifest).catch(() => null);

if (cmd === "validate") {
  const errors = checkManifest(manifest, entryBuf);
  if (errors.length) {
    console.error(`✗ Manifeste invalide :\n - ${errors.join("\n - ")}`);
    process.exit(1);
  }
  console.log(`✓ ${manifest.id}@${manifest.version} valide (${manifest.ui.mode}).`);
  process.exit(0);
}

if (entryBuf) {
  manifest.ui.integrity = sri(entryBuf);
  // La surface widget partage le même bundle ESM : même SRI que l'entrée page.
  if (manifest.ui?.widget?.entry === manifest.ui.entry) {
    manifest.ui.widget.integrity = sri(entryBuf);
  }
  await writeFile(join(dir, "onirtech.template.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}
const errors = checkManifest(manifest, entryBuf);
if (errors.length) {
  console.error(`✗ ${errors.join(" ; ")}`);
  process.exit(1);
}
const files = await walk(dir);
const zipInput = {};
for (const file of files) {
  zipInput[relative(dir, file).split(sep).join("/")] = new Uint8Array(await readFile(file));
}
const zip = zipSync(zipInput);
const outDir = join(dir, "release");
await mkdir(outDir, { recursive: true });
const name = `${manifest.id}-${manifest.version}`;
const archive = join(outDir, `${name}.onirtech-template`);
await writeFile(archive, zip);
const sha = hex(Buffer.from(zip));
await writeFile(
  join(outDir, `${name}.release.json`),
  `${JSON.stringify({ id: manifest.id, version: manifest.version, hostProtocol: HOST_PROTOCOL, sha256: sha, files: files.map((f) => relative(dir, f).split(sep).join("/")) }, null, 2)}\n`,
);
console.log(`✓ Archive : ${archive}`);
console.log(`  sha256 : ${sha}`);
console.log("  → importez cette archive dans le panneau (Templates visuels).");
