import { SubComponentNode } from "../core/ComponentNode.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { Avatar } from "../elements/Avatar.jsx";
import { IconGlyph } from "../elements/IconGlyph.jsx";

export class MessageView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "message", type: "message", name: contract.name ?? "Message" });
  }

  renderElement() {
    const {
      message = {}, role = "assistant", index = 0, initiales, actions = {},
      voirHorodatage, voirSources, voirBoutonsAccueil, statusFinalisee,
      welcomeActions = [],
    } = this.props;
    const medias = Array.isArray(message.medias) ? message.medias : [];
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const knowledge = Array.isArray(message.knowledge) ? message.knowledge : [];
    const mood = message.userState ?? null;
    const hasBody = typeof message.content === "string" && message.content !== "";
    const showActions = role === "assistant" && index === 0 && !statusFinalisee && voirBoutonsAccueil;

    return (
      <li className={`msg ${role}`}>
        {role === "assistant" ? new Avatar({ initiales }).renderElement() : null}
        <div
          className="bubble"
          title={mood ? `${mood.label || "neutral"} (${Math.round(Number(mood.confidence || 0) * 100)}%)` : undefined}
        >
          {medias.map((media, mediaIndex) =>
            media?.type === "photo" ? (
              <img className="m-img" key={`media-${mediaIndex}`} src={media.url} alt={media.libelle || ""} />
            ) : (
              <button
                className="m-file"
                type="button"
                key={`media-${mediaIndex}`}
                onClick={() => {
                  if (typeof media?.url === "string" && /^https?:\/\//i.test(media.url) && typeof actions.openMedia === "function") {
                    actions.openMedia(media.url);
                  }
                }}
              >
                {media.libelle || "Lien"}
              </button>
            ),
          )}
          {attachments.map((attachment, attachmentIndex) => (
            <span className="m-file" key={`att-${attachmentIndex}`}>
              {attachment.originalName || attachment.fieldLabel || "Pièce jointe"}
            </span>
          ))}
          {hasBody ? <p>{message.content}</p> : null}
          {knowledge.length && voirSources ? (
            <div className="sources">
              Références : {knowledge.map((item) => item.titre || item.ref).join(", ")}
            </div>
          ) : null}
          {showActions ? (
            <div className="actions">
              {welcomeActions.map((bouton) =>
                safeExternalLink(
                  bouton.url,
                  actions,
                  bouton.label,
                  <>
                    {bouton.label} <IconGlyph name="chevron" />
                  </>,
                  "btn2",
                  bouton.id,
                ),
              )}
            </div>
          ) : null}
          {voirHorodatage ? <time>À l’instant</time> : null}
        </div>
      </li>
    );
  }
}
