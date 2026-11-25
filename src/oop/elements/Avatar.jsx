import { UIElement } from "../core/UIElement.js";
import { isHttpUrl } from "../../utils/format.js";

// Avatar : UI Element feuille (rôle "img"). Affiche une image http(s) ou des
// initiales, piloté par ses propriétés (initiales, imageUrl, forme via les
// tokens --avatar-*, visibilité) — aucun rendu en dur dans les vues parentes.
export class Avatar extends UIElement {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "avatar", type: "avatar", name: contract.name ?? "Avatar" });
    this.role = "img";
    this.initiales = contract.initiales ?? "";
    this.imageUrl = contract.imageUrl ?? "";
    this.hidden = contract.hidden ?? false;
    this.region = contract.region ?? false;
    this.modifier = contract.modifier ?? "";
  }

  renderElement() {
    const { initiales, imageUrl, hidden, region, modifier } = this;
    const className = `avatar${modifier ? ` ${modifier}` : ""}${hidden ? " avatar-hidden" : ""}`;
    return (
      <div className={className} role={this.role} data-onir-region={region ? "avatar" : undefined}>
        {isHttpUrl(imageUrl) ? <img className="avatar-img" src={imageUrl} alt="" /> : initiales}
      </div>
    );
  }
}
