import { UIElement } from "../core/UIElement.js";
import { IconGlyph } from "./IconGlyph.jsx";

// Badge : UI Element feuille (pastille informative de l'en-tête). Compose une
// icône enregistrée et un libellé, et expose `data-onir-region="badge"`.
export class Badge extends UIElement {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "badge", type: "badge", name: contract.name ?? "Badge" });
    this.label = contract.label ?? "";
    this.icon = contract.icon ?? "spark";
  }

  renderElement() {
    return (
      <span className="badge" data-onir-region="badge">
        <IconGlyph name={this.icon} size={12} />
        {this.label}
      </span>
    );
  }
}
