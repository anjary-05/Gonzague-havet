import { ComponentNode } from "../core/ComponentNode.js";
import { IconGlyph } from "../elements/IconGlyph.jsx";

export class FinishView extends ComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "component-finish", type: "finish", name: contract.name ?? "Terminer" });
  }

  renderElement() {
    const { show, libelleTerminer, actions } = this.props;
    if (!show) return null;
    return (
      <button
        className="finish"
        type="button"
        data-onir-region="fin"
        onClick={() => typeof actions?.finish === "function" && actions.finish()}
      >
        <IconGlyph name="check" />
        {libelleTerminer}
      </button>
    );
  }
}
