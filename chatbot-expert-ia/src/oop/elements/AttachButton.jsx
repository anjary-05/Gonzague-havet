import { ButtonElement } from "./ButtonElement.jsx";

// Commande « pièce jointe » : hérite de ButtonElement, n'ajoute que ses
// propriétés (icône, libellé accessible, zone d'inspection « piece_jointe »).
export class AttachButton extends ButtonElement {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "attach-button",
      type: "attach-button",
      name: "Pièce jointe",
      icon: "attach",
      ariaLabel: "Joindre une image ou un fichier",
      domId: "attach",
      region: "piece_jointe",
    });
  }
}
