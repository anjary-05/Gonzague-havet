import { SectionNode } from "../core/ComponentNode.js";
import { Avatar } from "../elements/Avatar.jsx";
import { Badge } from "../elements/Badge.jsx";
import { ModeChip } from "../elements/ModeChip.jsx";
import { Status } from "../elements/Status.jsx";
import { IconGlyph } from "../elements/IconGlyph.jsx";

export class HeaderView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-header", type: "header", name: contract.name ?? "En-tête" });
  }

  renderElement() {
    const {
      voirAvatar, avatarUrl, initiales, titre, voirBadge, badge, voirMode,
      modesActifs = [], activeMode, lib, voirStatut, statut, closeDiscussion,
      dark, toggleTheme,
    } = this.props;
    return (
      <header data-onir-region="header">
        {new Avatar({ initiales, imageUrl: avatarUrl, hidden: !voirAvatar, region: true }).renderElement()}
        <div className="who">
          <div className="row">
            <h2>{titre}</h2>
            {voirBadge ? new Badge({ label: badge }).renderElement() : null}
            {voirMode && modesActifs.includes(activeMode)
              ? new ModeChip({ label: lib(activeMode, activeMode) }).renderElement()
              : null}
          </div>
          {voirStatut ? new Status({ label: statut }).renderElement() : null}
        </div>
        {typeof toggleTheme === "function" ? (
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
          >
            <IconGlyph name={dark ? "sun" : "moon"} size={18} />
          </button>
        ) : null}
        <button className="close" type="button" onClick={closeDiscussion} aria-label="Fermer la discussion">
          <IconGlyph name="close" size={20} />
        </button>
      </header>
    );
  }
}
