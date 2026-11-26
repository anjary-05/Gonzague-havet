import { SectionNode } from "../core/ComponentNode.js";

export class ThreadView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-thread", type: "thread", name: contract.name ?? "Discussion" });
  }

  renderElement(children) {
    return (
      <ol className="thread" ref={this.props.threadRef} aria-live="polite" data-onir-region="thread">
        {children}
      </ol>
    );
  }
}
