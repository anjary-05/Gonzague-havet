import { UIElement } from "../core/UIElement.js";

// Pastille de mode : UI Element feuille affichant le mode actif de l'interface
// agentique. Expose `data-onir-region="mode"`.
export class ModeChip extends UIElement {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "mode-chip", type: "mode-chip", name: contract.name ?? "Mode actif" });
    this.label = contract.label ?? "";
  }

  renderElement() {
    return (
      <span className="mode-chip" data-onir-region="mode">
        {this.label}
      </span>
    );
  }
}
