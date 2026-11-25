import { SectionNode } from "../core/ComponentNode.js";
import { isHttpUrl } from "../../utils/format.js";

export class LauncherView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-launcher", type: "launcher", name: contract.name ?? "Lanceur" });
  }

  renderElement() {
    const { avatarUrl, initiales, openDiscussion } = this.props;
    return (
      <button
        className="launcher"
        type="button"
        onClick={openDiscussion}
        aria-label="Ouvrir la discussion"
        data-onir-region="lanceur"
      >
        {isHttpUrl(avatarUrl) ? <img className="avatar-img" src={avatarUrl} alt="" /> : initiales}
      </button>
    );
  }
}
