import { ExperienceNode } from "../core/ComponentNode.js";

// Niveau Application / Experience : ne produit aucun DOM, uniquement la composition.
export class ExperienceView extends ExperienceNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "experience-expert-ia", type: "experience", name: contract.name ?? "Expérience Expert IA" });
  }

  renderElement(children) {
    return <>{children}</>;
  }
}
