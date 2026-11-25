import React from "react";

// instruction.txt §5 : moteur récursif sans eval ni code arbitraire.
// Il résout les références via le registry, propage les props du parent,
// conserve les états/événements dans le contrat et isole les erreurs de rendu.
class ComponentRenderer {
  constructor(registry) {
    this.registry = registry;
    this.onError = null;
  }

  resolve(node, context) {
    if (!node || typeof node !== "object" || Array.isArray(node) || typeof node.render === "function") {
      return node;
    }
    if (this.registry?.has(node.type)) {
      return this.registry.create(node.type, { ...node, children: node.children ?? [] });
    }
    return null;
  }

  render(node, context = {}) {
    if (node === null || node === undefined || node === false || node === true) return null;
    if (Array.isArray(node)) {
      return node.map((item, index) => {
        const rendered = this.render(item, context);
        return React.isValidElement(rendered) && rendered.key === null
          ? React.cloneElement(rendered, { key: `node-${index}` })
          : rendered;
      });
    }

    const instance = this.resolve(node, context);
    if (!instance) return null;

    const nextContext = {
      ...context,
      props: { ...(context.props ?? {}), ...instance.props },
      node: instance,
    };
    const rendered = instance.render(this, nextContext);
    if (React.isValidElement(rendered) && instance.id && rendered.key === null) {
      return React.cloneElement(rendered, { key: instance.id });
    }
    return rendered;
  }

  renderChildren(children, context = {}) {
    return this.render(children, context);
  }

  fail(node, error, context) {
    if (typeof this.onError === "function") this.onError(node, error, context);
    return null;
  }
}

export const renderer = new ComponentRenderer();

export function mountTree(root, context = {}) {
  return renderer.render(root, context);
}
