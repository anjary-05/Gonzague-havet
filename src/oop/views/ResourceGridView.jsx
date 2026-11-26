import { SubComponentNode } from "../core/ComponentNode.js";
import { toOpenableUrl } from "../../utils/format.js";

export class ResourceGridView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "resource-grid", type: "resource-grid", name: contract.name ?? "Ressources" });
  }

  renderElement() {
    const { items = [], actions = {}, lib } = this.props;
    if (!items.length) return null;
    return (
      <div className="resource-grid">
        {items.map((item, index) => (
          <button
            className="resource-item"
            type="button"
            key={`${item.id || "r"}-${index}`}
            onClick={() => {
              const openUrl = toOpenableUrl(item.url);
              if (openUrl !== "" && typeof actions.openMedia === "function") actions.openMedia(openUrl);
            }}
            title={toOpenableUrl(item.url) !== "" ? lib("ouvrir", "Ouvrir") : item.libelle || ""}
          >
            {item.kind === "photo" && item.url ? <img src={item.url} alt={item.libelle || ""} /> : null}
            <span>{item.libelle || item.id || lib("ouvrir", "Ouvrir")}</span>
          </button>
        ))}
      </div>
    );
  }
}
