import { SubComponentNode } from "../core/ComponentNode.js";
import { Avatar } from "../elements/Avatar.jsx";

export class FinalStateView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "final-state", type: "final-state", name: contract.name ?? "Discussion finalisée" });
  }

  renderElement() {
    const { voirAvatar, avatarUrl, initiales, texteFinalise } = this.props;
    return (
      <li className="msg assistant">
        {new Avatar({ initiales, imageUrl: avatarUrl, hidden: !voirAvatar }).renderElement()}
        <div className="bubble">
          <p>{texteFinalise}</p>
        </div>
      </li>
    );
  }
}
