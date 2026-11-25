import { SubComponentNode } from "../core/ComponentNode.js";

export class InstructionItemView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "instruction-item", type: "instruction-item", name: contract.name ?? "Entrée d’interface générée" });
  }

  renderElement(children) {
    return <li className="instruction-item">{children}</li>;
  }
}
