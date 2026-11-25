import { SubComponentNode } from "../core/ComponentNode.js";

export class ConfirmView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "instruction-confirm", type: "instruction-confirm", name: contract.name ?? "Confirmation" });
  }

  renderElement() {
    const { libelle, lib, onConfirme, onAnnule } = this.props;
    return (
      <div className="instruction-card">
        <p className="instruction-texte">{libelle}</p>
        <div className="confirm-actions">
          <button className="btn2" type="button" onClick={() => onConfirme()}>
            {lib("confirmer", "Confirmer")}
          </button>
          <button className="chip" type="button" onClick={() => onAnnule()}>
            {lib("annuler", "Annuler")}
          </button>
        </div>
      </div>
    );
  }
}
