// Catalogue extensible (instruction.txt §4) : l'IA choisit un type enregistré,
// elle ne crée pas de composant arbitraire et le moteur reste inchangé.
export class ComponentRegistry {
  constructor() {
    this.types = new Map();
  }

  register(type, NodeClass) {
    if (typeof type !== "string" || type === "") throw new Error("type de composant invalide");
    if (typeof NodeClass !== "function") throw new Error(`composant ${type} invalide`);
    this.types.set(type, NodeClass);
    return this;
  }

  registerAll(entries) {
    Object.entries(entries).forEach(([type, NodeClass]) => this.register(type, NodeClass));
    return this;
  }

  has(type) {
    return this.types.has(type);
  }

  create(type, contract = {}) {
    const NodeClass = this.types.get(type);
    if (!NodeClass) throw new Error(`composant non enregistré : ${type}`);
    return new NodeClass({ ...contract, type: contract.type ?? type });
  }
}

export const componentRegistry = new ComponentRegistry();
