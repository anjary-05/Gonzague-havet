import { UIElement } from "../core/UIElement.js";
import { IconGlyph } from "./IconGlyph.jsx";

// Base des commandes (boutons) — INTERFACE commune à toute commande visuelle :
// rôle ARIA, libellé accessible, visibilité, état désactivé et clic. Les
// boutons concrets (pièce jointe, micro, envoi) en HÉRITENT et ne redéfinissent
// que leurs propriétés, sans dupliquer le rendu.
export class ButtonElement extends UIElement {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? `button-${contract.type ?? "control"}`,
      type: contract.type ?? "button",
      name: contract.name ?? "Commande",
    });
    this.role = "button";
    this.icon = contract.icon ?? null;
    this.ariaLabel = contract.ariaLabel ?? "";
    this.visible = contract.visible !== false;
    this.disabled = contract.disabled ?? false;
    this.onClick = contract.onClick ?? null;
    this.className = contract.className ?? "icon-btn";
    this.buttonType = contract.buttonType ?? "button";
    this.iconSize = contract.iconSize ?? 18;
    this.domId = contract.domId ?? null;
    this.region = contract.region ?? null;
  }

  // Interface : une commande sait dire si elle doit être rendue. Un bouton
  // masqué est retiré du DOM ; la mise en page (flex) s'adapte naturellement.
  isVisible() {
    return this.visible;
  }

  renderElement() {
    if (!this.isVisible()) return null;
    return (
      <button
        className={this.className}
        id={this.domId ?? undefined}
        type={this.buttonType}
        aria-label={this.ariaLabel}
        disabled={this.disabled || undefined}
        onClick={this.onClick ?? undefined}
        data-onir-region={this.region ?? undefined}
      >
        {this.icon ? <IconGlyph name={this.icon} size={this.iconSize} /> : null}
      </button>
    );
  }
}
