import { SubComponentNode } from "../core/ComponentNode.js";
import { MarkdownDocument } from "../models/MarkdownDocument.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { isHttpUrl, isMailtoUrl, isSafeMediaUrl, toOpenableUrl } from "../../utils/format.js";

// Vue d'un document Markdown : transforme l'arbre produit par
// `MarkdownDocument` en éléments React. Le texte est toujours échappé par
// React (aucun `dangerouslySetInnerHTML`) ; les liens passent par
// `actions.openMedia` et les images sont revalidées avant affichage.
export class MarkdownView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "markdown", type: "markdown", name: contract.name ?? "Markdown" });
  }

  document() {
    const { document, text, markdown = true } = this.props;
    if (document instanceof MarkdownDocument) return document;
    if (typeof document === "string") return new MarkdownDocument(document);
    if (markdown !== false && typeof text === "string") return new MarkdownDocument(text);
    return null;
  }

  renderElement() {
    const { markdown = true, actions = {}, className = "" } = this.props;
    const document = this.document();
    const classes = `md${markdown === false ? " md-plain" : ""}${className ? ` ${className}` : ""}`;

    if (markdown === false) {
      const plain = document ? document.source : (typeof this.props.text === "string" ? this.props.text : "");
      if (plain.trim() === "") return null;
      return <div className={classes}>{plain}</div>;
    }

    if (!document || document.isEmpty) return null;
    return <div className={classes}>{this.renderBlocks(document.blocks, actions)}</div>;
  }

  renderBlocks(blocks, actions) {
    return (Array.isArray(blocks) ? blocks : [])
      .map((block, index) => this.renderBlock(block, index, actions))
      .filter((node) => node !== null);
  }

  renderBlock(block, key, actions) {
    if (!block || typeof block !== "object") return null;

    switch (block.type) {
      case "heading": {
        const Tag = `h${Math.min(6, Math.max(1, Number(block.level) || 1))}`;
        return <Tag key={`block-${key}`} className="md-h">{this.renderInline(block.inline, actions)}</Tag>;
      }
      case "paragraph": {
        if (Array.isArray(block.inline) && block.inline.length === 1 && block.inline[0].type === "image") {
          return this.renderFigure(block.inline[0], `block-${key}`, actions);
        }
        return <p key={`block-${key}`}>{this.renderInline(block.inline, actions)}</p>;
      }
      case "code":
        return (
          <pre key={`block-${key}`} className="md-pre">
            <code className={block.lang ? `language-${block.lang}` : undefined}>{block.code}</code>
          </pre>
        );
      case "blockquote":
        return (
          <blockquote key={`block-${key}`}>
            {this.renderBlocks(block.blocks, actions)}
          </blockquote>
        );
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag key={`block-${key}`} start={block.ordered ? block.start : undefined}>
            {(block.items ?? []).map((item, index) => this.renderListItem(item, `${key}-${index}`, actions))}
          </Tag>
        );
      }
      case "table":
        return this.renderTable(block, `block-${key}`, actions);
      case "hr":
        return <hr key={`block-${key}`} />;
      default:
        return null;
    }
  }

  renderListItem(item, key, actions) {
    if (!item) return null;
    if (item.checked === null || item.checked === undefined) {
      return <li key={`item-${key}`}>{this.renderBlocks(item.blocks, actions)}</li>;
    }
    return (
      <li key={`item-${key}`} className="md-task">
        <span className={`md-check${item.checked ? " checked" : ""}`} aria-hidden="true">
          {item.checked ? "✓" : ""}
        </span>
        <span className="md-task-body">{this.renderBlocks(item.blocks, actions)}</span>
      </li>
    );
  }

  renderTable(block, key, actions) {
    return (
      <div key={key} className="md-table-wrap">
        <table>
          <thead>
            <tr>
              {(block.header ?? []).map((cell, index) => (
                <th key={`th-${index}`} style={{ textAlign: block.align?.[index] ?? undefined }}>
                  {this.renderInline(cell, actions)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows ?? []).map((row, rowIndex) => (
              <tr key={`tr-${rowIndex}`}>
                {row.map((cell, columnIndex) => (
                  <td key={`td-${columnIndex}`} style={{ textAlign: block.align?.[columnIndex] ?? undefined }}>
                    {this.renderInline(cell, actions)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  renderFigure(image, key, actions) {
    if (!isSafeMediaUrl(image.url, "image")) return null;
    const openUrl = toOpenableUrl(image.url);
    const open = openUrl !== "" && typeof actions?.openMedia === "function"
      ? () => actions.openMedia(openUrl)
      : undefined;
    return (
      <figure key={key} className="md-figure">
        <img className="md-img" src={image.url} alt={image.alt || ""} onClick={open} />
        {image.alt ? <figcaption>{image.alt}</figcaption> : null}
      </figure>
    );
  }

  renderInline(nodes, actions) {
    return (Array.isArray(nodes) ? nodes : []).map((node, index) => {
      const key = `inline-${index}`;
      if (!node || typeof node !== "object") return null;

      switch (node.type) {
        case "text":
          return node.value;
        case "br":
          return <br key={key} />;
        case "strong":
          return <strong key={key}>{this.renderInline(node.children, actions)}</strong>;
        case "em":
          return <em key={key}>{this.renderInline(node.children, actions)}</em>;
        case "del":
          return <del key={key}>{this.renderInline(node.children, actions)}</del>;
        case "code":
          return <code key={key} className="md-code">{node.value}</code>;
        case "link": {
          const children = this.renderInline(node.children, actions);
          if (isHttpUrl(node.url)) {
            return safeExternalLink(node.url, actions, node.url, children, "md-link", key);
          }
          if (isMailtoUrl(node.url)) {
            return <a key={key} className="md-link" href={node.url}>{children}</a>;
          }
          return <span key={key} className="md-link md-link-disabled">{children}</span>;
        }
        case "image": {
          if (!isSafeMediaUrl(node.url, "image")) {
            return node.alt ? <span key={key}>{node.alt}</span> : null;
          }
          const openUrl = toOpenableUrl(node.url);
          const open = openUrl !== "" && typeof actions?.openMedia === "function"
            ? () => actions.openMedia(openUrl)
            : undefined;
          return <img key={key} className="md-img" src={node.url} alt={node.alt || ""} onClick={open} />;
        }
        default:
          return null;
      }
    });
  }
}
