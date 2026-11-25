import { UIElement } from "../core/UIElement.js";

// Statut : UI Element feuille (rôle ARIA "status") — pastille de disponibilité
// + libellé. Expose `data-onir-region="statut"`.
export class Status extends UIElement {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "status", type: "status", name: contract.name ?? "Statut" });
    this.role = "status";
    this.label = contract.label ?? "";
  }

  renderElement() {
    return (
      <p className="status" role={this.role} data-onir-region="statut">
        <span className="dot" />
        {this.label}
      </p>
    );
  }
}
