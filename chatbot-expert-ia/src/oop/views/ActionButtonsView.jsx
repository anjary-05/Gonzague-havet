import { SubComponentNode } from "../core/ComponentNode.js";
import { ACTION_COMMANDS } from "../../app/config/InterfaceConfig.js";
import { asText } from "../../utils/format.js";

export class ActionButtonsView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "action-buttons", type: "action-buttons", name: contract.name ?? "Actions de l’interface" });
  }

  renderElement() {
    const { buttons = [], items = [], canModelForm, actions = {}, lib, statusFinalisee = false } = this.props;
    if (!buttons.length) return null;
    return (
      <div className="confirm-actions">
        {buttons.map((bouton, index) => {
          const commande = asText(bouton?.action, "");
          const libelle = asText(bouton?.label, commande);
          const regle = ACTION_COMMANDS.find((item) => item.id === commande);
          if (!regle) return null;
          if (regle.id === "ouvrir_formulaire") {
            return canModelForm && typeof actions.openCollectionForm === "function" ? (
              <button className="btn2" type="button" key={index} onClick={() => actions.openCollectionForm()}>
                {libelle}
              </button>
            ) : null;
          }
          if (regle.id === "galerie") {
            return (
              <button
                className="btn2"
                type="button"
                key={index}
                onClick={() => {
                  if (typeof items[0]?.url === "string" && /^https?:\/\//i.test(items[0].url) && typeof actions.openMedia === "function") {
                    actions.openMedia(items[0].url);
                  }
                }}
              >
                {libelle}
              </button>
            );
          }
          if (regle.id === "terminer") {
            if (statusFinalisee) return null;
            return typeof actions.finish === "function" ? (
              <button className="btn2" type="button" key={index} onClick={() => actions.finish()}>
                {libelle}
              </button>
            ) : null;
          }
          return null;
        })}
      </div>
    );
  }
}
