import { ButtonElement } from "./ButtonElement.jsx";

// Commande « micro » (message vocal) : indépendante de la pièce jointe — on
// peut la masquer seule via `afficher_micro`, sans toucher la pièce jointe.
export class MicButton extends ButtonElement {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "mic-button",
      type: "mic-button",
      name: "Message vocal",
      icon: "mic",
      ariaLabel: "Ajouter un message vocal",
      domId: "mic",
      region: "micro",
    });
  }
}
