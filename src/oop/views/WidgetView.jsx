import { SectionNode } from "../core/ComponentNode.js";

// Niveau Section : le cadre du chatbot, page ou widget.
export class WidgetView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-widget", type: "widget", name: contract.name ?? "Cadre de discussion" });
  }

  renderElement(children) {
    const { surface, titre, onPaste } = this.props;
    return (
      <section
        className="widget"
        style={surface === "page" ? { maxWidth: "100%" } : undefined}
        aria-label={`Discussion avec l’assistant de ${titre}`}
        data-onir-region="widget"
        onPaste={onPaste}
      >
        {children}
      </section>
    );
  }
}
