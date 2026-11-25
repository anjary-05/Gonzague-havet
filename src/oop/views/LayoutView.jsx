import { LayoutNode } from "../core/ComponentNode.js";

// Niveau Layout : composition pure, aucun encapsuleur DOM superflu.
export class LayoutView extends LayoutNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "layout-expert-ia", type: "layout", name: contract.name ?? "Layout Expert IA" });
  }

  renderElement(children) {
    return <>{children}</>;
  }
}
