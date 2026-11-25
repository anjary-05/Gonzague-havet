import { ComponentNode } from "../core/ComponentNode.js";
import { horizontalWheelRef } from "../../utils/Scroll.js";

export class ChipsView extends ComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "component-chips", type: "chips", name: contract.name ?? "Sujets suggérés" });
    this.scrollRef = horizontalWheelRef();
  }

  renderElement() {
    const { afficherSujets, menu, chips = [], actions, send } = this.props;
    if (!(afficherSujets || menu)) return null;
    return (
      <div
        className="chips"
        role="group"
        aria-label="Sujets suggérés"
        data-onir-region="suggestions"
        ref={this.scrollRef}
      >
        {menu
          ? menu.questions.map((question) => (
              <button
                className="chip"
                type="button"
                key={question.id}
                onClick={() => typeof actions?.selectFallback === "function" && actions.selectFallback(question.id)}
              >
                {question.label}
              </button>
            ))
          : afficherSujets
          ? chips.map((chip) => (
              <button className="chip" type="button" key={chip} onClick={() => send(chip)}>
                {chip}
              </button>
            ))
          : null}
      </div>
    );
  }
}
