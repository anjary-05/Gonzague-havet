import { ButtonElement } from "./ButtonElement.jsx";

// Commande d'envoi : bouton `submit` (cercle primaire). Hérite du rendu commun,
// ne diffère que par la classe, le type et la taille d'icône.
export class SendButton extends ButtonElement {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "send-button",
      type: "send-button",
      name: "Envoyer",
      icon: "send",
      ariaLabel: "Envoyer",
      domId: "send",
      className: "send",
      buttonType: "submit",
      region: "bouton_envoi",
      iconSize: 20,
    });
  }
}
