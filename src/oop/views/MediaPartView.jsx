import { SubComponentNode } from "../core/ComponentNode.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { isHttpUrl, isSafeMediaUrl, toOpenableUrl } from "../../utils/format.js";

function formatSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

// Rendu d'une partie multimédia normalisée par `MultimodalContent`.
// Chaque type a son propre rendu, mais tous partagent le même contrat de
// nœud (`renderElement`) et les mêmes garde-fous d'URL.
export class MediaPartView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "media-part", type: "media-part", name: contract.name ?? "Média" });
  }

  renderElement() {
    const { part = {}, actions = {} } = this.props;
    switch (part.kind) {
      case "image":
        return this.renderImage(part, actions);
      case "audio":
        return this.renderAudio(part);
      case "video":
        return this.renderVideo(part);
      case "file":
        return this.renderFile(part, actions);
      case "link":
        return this.renderLink(part, actions);
      default:
        return null;
    }
  }

  renderImage(part, actions) {
    if (!isSafeMediaUrl(part.url, "image")) return null;
    const openUrl = toOpenableUrl(part.url);
    const open = openUrl !== "" && typeof actions?.openMedia === "function"
      ? () => actions.openMedia(openUrl)
      : undefined;
    const caption = part.caption && part.caption !== part.alt ? part.caption : "";
    return (
      <figure className="m-figure">
        <img className="m-img" src={part.url} alt={part.alt || ""} onClick={open} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  renderAudio(part) {
    if (!isSafeMediaUrl(part.url, "audio")) return null;
    return (
      <figure className="m-figure">
        <audio className="m-aud" controls preload="none" src={part.url} />
        {part.caption ? <figcaption>{part.caption}</figcaption> : null}
      </figure>
    );
  }

  renderVideo(part) {
    if (!isSafeMediaUrl(part.url, "video")) return null;
    return (
      <figure className="m-figure">
        <video className="m-vid" controls preload="metadata" src={part.url} />
        {part.caption ? <figcaption>{part.caption}</figcaption> : null}
      </figure>
    );
  }

  renderFile(part, actions) {
    const size = formatSize(part.size);
    const label = `${part.name || "Pièce jointe"}${size ? ` · ${size}` : ""}`;
    const openUrl = toOpenableUrl(part.url);
    if (openUrl !== "" && typeof actions?.openMedia === "function") {
      return (
        <button className="m-file" type="button" onClick={() => actions.openMedia(openUrl)} title={part.name || undefined}>
          {label}
        </button>
      );
    }
    return <span className="m-file">{label}</span>;
  }

  renderLink(part, actions) {
    if (!isHttpUrl(part.url)) return null;
    const label = part.label || part.url;
    return safeExternalLink(part.url, actions, label, label, "m-file");
  }
}
