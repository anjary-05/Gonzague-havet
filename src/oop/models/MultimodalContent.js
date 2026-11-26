// Objet générique de contenu multimodal (façon ChatGPT).
//
// Une même classe normalise toutes les formes de message rencontrées :
//   - `content` texte (Markdown) ;
//   - `content` sous forme de parties (OpenAI / ChatGPT) :
//     text, image_url, input_audio, file… ;
//   - `parts` explicites (extension additive du contrat) ;
//   - `blocks` ordonnés du contrat ADR-0067 (texte, image, résultats d'outils) ;
//   - champs historiques `medias` et `attachments`.
//
// Le résultat est une liste ordonnée de parties typées (`text`, `image`,
// `audio`, `video`, `file`, `link`, `structured`) consommée par `MessageView`
// via `ContentRegistry`. Aucun accès réseau : les URL sont uniquement validées
// (`isSafeMediaUrl`). Les blocs d'une version inconnue retombent sur `content`.

import { asObject, asText, isHttpUrl, isSafeMediaUrl } from "../../utils/format.js";
import { renderFallbackText, resolveBlock } from "../core/ContentRegistry.js";
import { MarkdownDocument } from "./MarkdownDocument.js";

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function pickObject(...values) {
  for (const value of values) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

function textPart(value, options) {
  const text = String(value ?? "");
  if (text.trim() === "") return null;
  return {
    kind: "text",
    text,
    document: options.markdown === false ? null : new MarkdownDocument(text),
  };
}

function mediaKindFromMime(mime) {
  const value = asText(mime, "");
  if (/^image\//i.test(value)) return "image";
  if (/^audio\//i.test(value)) return "audio";
  if (/^video\//i.test(value)) return "video";
  return "file";
}

function imagePart(source) {
  const image = pickObject(source.image_url, source.image, source);
  const url = pickString(
    typeof source.image_url === "string" ? source.image_url : "",
    image.url,
    source.url,
    source.image,
  );
  if (!isSafeMediaUrl(url, "image")) return null;
  const label = pickString(source.alt, source.caption, source.libelle, image.alt);
  return { kind: "image", url, alt: label, caption: label };
}

function audioPart(source) {
  const audio = pickObject(source.audio_url, source.audio, source.input_audio, source);
  const inlineData = pickString(source.input_audio?.data, audio.data, source.data);
  const format = pickString(source.input_audio?.format, audio.format, source.format, "wav");
  const url = pickString(
    typeof source.audio_url === "string" ? source.audio_url : "",
    audio.url,
    source.url,
  ) || (inlineData ? `data:audio/${format};base64,${inlineData}` : "");
  if (!isSafeMediaUrl(url, "audio")) return null;
  return { kind: "audio", url, caption: pickString(source.caption, source.libelle, audio.caption) };
}

function videoPart(source) {
  const video = pickObject(source.video_url, source.video, source);
  const url = pickString(
    typeof source.video_url === "string" ? source.video_url : "",
    video.url,
    source.url,
  );
  if (!isSafeMediaUrl(url, "video")) return null;
  return { kind: "video", url, caption: pickString(source.caption, source.libelle, video.caption) };
}

function filePart(source) {
  const file = pickObject(source.file, source.attachment, source);
  const url = pickString(file.url, source.url);
  const name = pickString(file.name, file.filename, source.name, source.filename, source.libelle, "Pièce jointe");
  const mime = pickString(file.mime, file.type, source.mime, source.mime_type);
  const size = Number(file.size ?? source.size ?? source.sizeBytes ?? 0);
  if (!url && !name) return null;
  return {
    kind: "file",
    url: isSafeMediaUrl(url) ? url : "",
    name,
    mime,
    size: Number.isFinite(size) ? size : 0,
  };
}

function linkPart(source) {
  const url = pickString(source.url, source.href);
  if (!isHttpUrl(url)) return null;
  return { kind: "link", url, label: pickString(source.label, source.libelle, source.title, url) };
}

function normalizeExplicitPart(raw, options) {
  if (typeof raw === "string") return textPart(raw, options);
  const source = asObject(raw);
  const type = asText(source.type, "").toLowerCase();

  switch (type) {
    case "text":
    case "input_text":
    case "output_text":
      return textPart(pickString(source.text, source.content), options);
    case "image_url":
    case "image":
    case "input_image":
    case "photo":
      return imagePart(source);
    case "input_audio":
    case "audio":
    case "voice":
      return audioPart(source);
    case "video":
    case "input_video":
      return videoPart(source);
    case "file":
    case "input_file":
    case "attachment":
      return filePart(source);
    case "link":
    case "url":
      return linkPart(source);
    default:
      if (typeof source.text === "string") return textPart(source.text, options);
      return null;
  }
}

function isImageUrl(url) {
  return /^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(url);
}

function mediaFromLegacy(raw) {
  const media = asObject(raw);
  const type = asText(media.type, "").toLowerCase();
  const label = pickString(media.libelle, media.label, media.alt, media.caption);
  const url = pickString(media.url);
  // Certains hôtes fournissent directement les ressources média (sans `type`) :
  // on infère l'image à partir de l'URL, sinon on retombe sur un lien.
  const resolved = type || (isSafeMediaUrl(url, "image") && isImageUrl(url) ? "photo" : "lien");

  if (resolved === "photo" || resolved === "image") {
    return isSafeMediaUrl(url, "image") ? { kind: "image", url, alt: label, caption: label } : null;
  }
  if (resolved === "audio") {
    return isSafeMediaUrl(url, "audio") ? { kind: "audio", url, caption: label } : null;
  }
  if (resolved === "video") {
    return isSafeMediaUrl(url, "video") ? { kind: "video", url, caption: label } : null;
  }
  if (resolved === "file") {
    return filePart(media);
  }
  return isHttpUrl(url) ? { kind: "link", url, label: label || url } : null;
}

function attachmentFromLegacy(raw) {
  const attachment = asObject(raw);
  const mime = pickString(attachment.mime);
  const kind = mediaKindFromMime(mime);
  const url = pickString(attachment.url);
  const name = pickString(attachment.originalName, attachment.fieldLabel, attachment.name, "Pièce jointe");

  if (kind === "image" && isSafeMediaUrl(url, "image")) {
    return { kind: "image", url, alt: name, caption: name };
  }
  if (kind === "audio" && isSafeMediaUrl(url, "audio")) {
    return { kind: "audio", url, caption: name };
  }
  if (kind === "video" && isSafeMediaUrl(url, "video")) {
    return { kind: "video", url, caption: name };
  }
  return {
    kind: "file",
    url: isSafeMediaUrl(url) ? url : "",
    name,
    mime,
    size: Number(attachment.sizeBytes ?? 0) || 0,
  };
}

function buildParts(raw, options) {
  if (typeof raw === "string") {
    const part = textPart(raw, options);
    return part ? [part] : [];
  }

  const message = asObject(raw);
  const parts = [];
  const seenUrls = new Set();

  const push = (part) => {
    if (!part) return;
    if (part.kind !== "text" && part.kind !== "structured" && part.url) {
      const key = `${part.kind}:${part.url}`;
      if (seenUrls.has(key)) return;
      seenUrls.add(key);
    }
    parts.push(part);
  };

  // 1. Blocs ordonnés du contrat ADR-0067 : ils priment sur `content`.
  //    Un bloc inconnu ou d'une version non comprise est ignoré ; si aucun
  //    bloc n'est exploitable, le texte de secours est ajouté en fin de liste.
  const rawBlocks = options.generated !== false
    && Array.isArray(message.blocks)
    && message.blocks.length > 0
    ? message.blocks
    : null;
  let blockCount = 0;
  if (rawBlocks) {
    rawBlocks.forEach((rawBlock, index) => {
      const block = resolveBlock(rawBlock);
      if (block === null) return;
      if (block.type === "text") {
        push(textPart(block.text, options));
      } else if (block.type === "image") {
        push(imagePart({ url: block.url, alt: block.alt }));
      } else {
        // Résultats d'outils et types enregistrés par une extension.
        push({ kind: "structured", block, index });
      }
      blockCount += 1;
    });
  }
  const fallbackMode = Boolean(rawBlocks) && blockCount === 0;

  // 2. Parties explicites : `parts` prioritaire, sinon `content` en tableau.
  const explicit = Array.isArray(message.parts) && message.parts.length > 0
    ? message.parts
    : (Array.isArray(message.content) ? message.content : null);

  if (explicit) {
    explicit.forEach((item) => push(normalizeExplicitPart(item, options)));
  } else if (typeof message.content === "string" && !rawBlocks) {
    // `blocks` (même partiellement inconnus) remplace toujours `content` :
    // le texte de secours est ajouté plus bas par `renderFallbackText`.
    push(textPart(message.content, options));
  }

  if (options.multimodal !== false) {
    // 3. Médias historiques (`medias`).
    if (Array.isArray(message.medias)) {
      message.medias.forEach((media) => push(mediaFromLegacy(media)));
    }
    // 4. Pièces jointes (`attachments`, capacité ADR-0034).
    if (Array.isArray(message.attachments)) {
      message.attachments.forEach((attachment) => push(attachmentFromLegacy(attachment)));
    }
  }

  if (fallbackMode) {
    push(textPart(renderFallbackText(rawBlocks, message.content), options));
  }

  if (options.multimodal === false) {
    return parts.filter((part) => part.kind === "text" || part.kind === "structured");
  }
  return parts;
}

export class MultimodalContent {
  constructor(raw = {}, options = {}) {
    this.options = {
      markdown: true,
      multimodal: true,
      generated: true,
      ...options,
    };
    this.parts = buildParts(raw, this.options);
  }

  static from(message, options = {}) {
    return new MultimodalContent(message, options);
  }

  get isEmpty() {
    return this.parts.length === 0;
  }

  get hasText() {
    return this.parts.some((part) => part.kind === "text");
  }

  get hasMedia() {
    return this.parts.some((part) => part.kind !== "text" && part.kind !== "structured");
  }

  get hasStructured() {
    return this.parts.some((part) => part.kind === "structured");
  }

  get structuredParts() {
    return this.parts.filter((part) => part.kind === "structured");
  }

  get text() {
    return this.parts
      .filter((part) => part.kind === "text")
      .map((part) => part.text)
      .join("\n\n");
  }

  get mediaParts() {
    return this.parts.filter((part) => part.kind !== "text" && part.kind !== "structured");
  }
}

export { buildParts };
