import { UIElement } from "./UIElement.js";

// instruction.txt §1 : Component et Subcomponent sont des nœuds récursifs.
// Le rendu est délégué au moteur (injection de dépendances), jamais à eval.
export class ComponentNode extends UIElement {
  constructor(contract = {}) {
    super(contract);
  }

  render(renderer, context = {}) {
    try {
      const childContext = {
        ...context,
        parent: this,
        props: { ...(context.props ?? {}), ...this.props },
      };
      const children = renderer.renderChildren(this.children, childContext);
      return this.renderElement(children, childContext, renderer);
    } catch (error) {
      return renderer.fail(this, error, context);
    }
  }

  renderElement() {
    return null;
  }
}

// Différenciation explicite des niveaux de la hiérarchie.
export class SubComponentNode extends ComponentNode {}
export class SectionNode extends ComponentNode {}
export class LayoutNode extends SectionNode {}
export class PageNode extends LayoutNode {}
export class ExperienceNode extends PageNode {}
