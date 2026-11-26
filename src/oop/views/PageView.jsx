import { PageNode } from "../core/ComponentNode.js";

export class PageView extends PageNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "page-expert-ia", type: "page", name: contract.name ?? "Page Expert IA" });
  }

  renderElement(children) {
    const { surface, dark, element, tokenStyle, appRef } = this.props;
    return (
      <main
        className="app"
        data-surface={surface}
        data-theme={dark ? "dark" : "light"}
        data-element={element}
        style={tokenStyle}
        data-onir-region="page"
        ref={appRef}
      >
        {children}
      </main>
    );
  }
}
