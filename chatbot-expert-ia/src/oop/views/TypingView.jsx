import { SubComponentNode } from "../core/ComponentNode.js";
import { Avatar } from "../elements/Avatar.jsx";
import { TypingDots } from "../elements/TypingDots.jsx";

export class TypingView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "typing", type: "typing", name: contract.name ?? "Indicateur de frappe" });
  }

  renderElement() {
    const { voirAvatar, avatarUrl, initiales } = this.props;
    return (
      <li className="msg assistant" data-onir-region="frappe">
        {new Avatar({ initiales, imageUrl: avatarUrl, hidden: !voirAvatar }).renderElement()}
        <div className="bubble">
          <p>
            {new TypingDots().renderElement()}
          </p>
        </div>
      </li>
    );
  }
}
