import { SubComponentNode } from "../core/ComponentNode.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { isHttpUrl, isSafeMediaUrl, toOpenableUrl } from "../../utils/format.js";
import { formatToolFieldValue } from "../core/ContentRegistry.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rendu généré d'un résultat d'outil (ADR-0067 §5) : l'hôte fournit des champs
// typés, le template choisit la vue adaptée à chaque type. Aucun HTML brut,
// aucune donnée de fiche, aucun appel réseau : les liens passent par
// `actions.openMedia` et les URL sont revalidées avant affichage.
export class ToolResultView extends SubComponentNode {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "tool-result",
      type: "tool-result",
      name: contract.name ?? "Résultat généré",
    });
  }

  renderElement() {
    const { block = {}, actions = {} } = this.props;
    if (!block || typeof block !== "object") return null;
    const items = Array.isArray(block.items) ? block.items : [];
    const layout = block.layout === "card" ? "card" : "list";
    const meta = block.meta && typeof block.meta === "object" ? block.meta : {};

    return (
      <section className={`gen-result gen-${layout}`} data-onir-region="contenu_genere">
        <header className="gen-head">
          <span className="gen-tool">{typeof block.tool === "string" ? block.tool : ""}</span>
          {typeof meta.total === "number" ? <span className="gen-count">{meta.total}</span> : null}
        </header>
        <div className="gen-items">
          {items.map((item, index) => this.renderItem(item, index, actions))}
        </div>
        {meta.hasMore === true ? <p className="gen-more">Résultats supplémentaires disponibles</p> : null}
      </section>
    );
  }

  renderItem(item, index, actions) {
    const fields = item && Array.isArray(item.fields) ? item.fields : [];
    return (
      <div className="gen-item" key={`item-${index}`}>
        {fields.map((field, fieldIndex) => this.renderField(field, `${index}-${fieldIndex}`, actions))}
      </div>
    );
  }

  renderField(field, key, actions) {
    if (!field || typeof field !== "object") return null;
    const label = typeof field.label === "string" ? field.label : "";
    const value = field.value;
    const text = formatToolFieldValue(field);

    return (
      <div className="gen-field" key={`field-${key}`}>
        {label !== "" ? <span className="gen-label">{label}</span> : null}
        <span className={`gen-value gen-${field.type || "text"}`}>
          {this.renderValue(field, value, text, actions)}
        </span>
      </div>
    );
  }

  renderValue(field, value, text, actions) {
    switch (field.type) {
      case "image":
        return isSafeMediaUrl(text, "image")
          ? (
            <img
              className="gen-img"
              src={text}
              alt={typeof field.label === "string" ? field.label : ""}
              onClick={toOpenableUrl(text) !== "" && typeof actions?.openMedia === "function"
                ? () => actions.openMedia(toOpenableUrl(text))
                : undefined}
            />
          )
          : <span>{text}</span>;
      case "url":
        return isHttpUrl(text)
          ? safeExternalLink(text, actions, text, text, "gen-link")
          : <span>{text}</span>;
      case "email":
        return EMAIL.test(text)
          ? <a className="gen-link" href={`mailto:${text}`}>{text}</a>
          : <span>{text}</span>;
      case "select":
        return <span className="gen-badge">{text}</span>;
      case "multi":
        return (Array.isArray(value) ? value : [value])
          .filter((entry) => typeof entry === "string" && entry !== "")
          .map((entry, index) => <span className="gen-badge" key={`badge-${index}`}>{entry}</span>);
      default:
        return <span>{text}</span>;
    }
  }
}
