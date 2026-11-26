import { UIElement } from "../core/UIElement.js";

// Points de frappe : UI Element feuille (rôle ARIA "status") qui signale que
// l'assistant rédige une réponse. L'animation est pilotée par les tokens
// --typing-* (taille, couleur, vitesse) et respecte prefers-reduced-motion.
export class TypingDots extends UIElement {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "typing-dots", type: "typing-dots", name: contract.name ?? "Indicateur de frappe" });
    this.role = "status";
    this.label = contract.label ?? "L'assistant rédige une réponse";
  }

  renderElement() {
    return (
      <span className="typing" role={this.role} aria-label={this.label}>
        <i />
        <i />
        <i />
      </span>
    );
  }
}
