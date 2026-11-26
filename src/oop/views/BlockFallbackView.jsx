import { SubComponentNode } from "../core/ComponentNode.js";

// Secours d'un bloc structuré dont la vue n'est pas enregistrée : on affiche
// uniquement son texte, échappé par React. Jamais de JSON brut ni de HTML.
export class BlockFallbackView extends SubComponentNode {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "block-fallback",
      type: "block-fallback",
      name: contract.name ?? "Contenu généré",
    });
  }

  renderElement() {
    const { block = {} } = this.props;
    const text = block && typeof block.text === "string" ? block.text : "";
    if (text.trim() === "") return null;
    return <div className="gen-fallback" data-onir-region="contenu_genere">{text}</div>;
  }
}
