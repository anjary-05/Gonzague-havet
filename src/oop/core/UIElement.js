// instruction.txt §2 : contrat universel exposé par chaque objet d'interface.
// Aucune logique de rendu ici : cette classe est la base polymorphique du modèle.
export class UIElement {
  constructor(contract = {}) {
    this.id = contract.id ?? null;
    this.type = contract.type ?? "ui-element";
    this.name = contract.name ?? this.type;
    this.version = contract.version ?? "1.3.13";
    this.props = contract.props ?? {};
    this.children = Array.isArray(contract.children) ? [...contract.children] : [];
    this.state = contract.state ?? {};
    this.events = Array.isArray(contract.events) ? [...contract.events] : [];
    this.actions = Array.isArray(contract.actions) ? [...contract.actions] : [];
    this.styles = contract.styles ?? {};
    this.dependencies = Array.isArray(contract.dependencies) ? [...contract.dependencies] : [];
  }

  // Une référence est un identifiant ; une instance est déjà un UIElement.
  add(child) {
    if (child === null || child === undefined || child === false) return this;
    if (typeof child === "string") {
      this.children.push({ type: child, id: `${this.id || this.type}-ref-${this.children.length}` });
      return this;
    }
    if (child instanceof UIElement || Array.isArray(child)) {
      this.children.push(child);
      return this;
    }
    if (typeof child === "object") {
      this.children.push({ ...child, id: child.id ?? `${this.id || this.type}-${this.children.length}` });
    }
    return this;
  }
}
