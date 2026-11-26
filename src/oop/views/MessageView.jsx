import { cloneElement, isValidElement } from "react";
import { SubComponentNode } from "../core/ComponentNode.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { Avatar } from "../elements/Avatar.jsx";
import { IconGlyph } from "../elements/IconGlyph.jsx";
import { MultimodalContent } from "../models/MultimodalContent.js";
import { createPartView } from "../core/ContentRegistry.js";

function withKey(element, key) {
  return isValidElement(element) ? cloneElement(element, { key }) : element;
}

export class MessageView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "message", type: "message", name: contract.name ?? "Message" });
  }

  renderElement() {
    const {
      message = {}, role = "assistant", index = 0, initiales, actions = {},
      voirHorodatage, voirSources, voirBoutonsAccueil, statusFinalisee,
      welcomeActions = [], voirMarkdown = true, voirMultimodal = true,
      voirContenuGenere = true,
    } = this.props;

    // Objet générique : texte Markdown + parties multimodales/générées.
    const content = MultimodalContent.from(message, {
      markdown: voirMarkdown,
      multimodal: voirMultimodal,
      generated: voirContenuGenere,
    });
    const knowledge = Array.isArray(message.knowledge) ? message.knowledge : [];
    const mood = message.userState ?? null;
    const showActions = role === "assistant" && index === 0 && !statusFinalisee && voirBoutonsAccueil;
    const messageId = message.id || `m-${index}`;
    // Les messages d'outils sont exposés avec `role: assistant` ; `authorName`
    // permet de les signer sans changer le rôle (contrat hôte v1).
    const authorName = typeof message.authorName === "string" && message.authorName.trim() !== ""
      ? message.authorName.trim()
      : "";

    return (
      <li className={`msg ${role}`}>
        {role === "assistant" ? new Avatar({ initiales }).renderElement() : null}
        <div
          className="bubble"
          title={mood ? `${mood.label || "neutral"} (${Math.round(Number(mood.confidence || 0) * 100)}%)` : undefined}
        >
          {authorName !== "" ? <div className="msg-author">{authorName}</div> : null}
          {content.parts.map((part, partIndex) => {
            // Le choix de la vue est dynamique : une nouvelle partie n'exige
            // qu'une entrée dans `ContentRegistry`, jamais un if ici.
            const view = createPartView(part, {
              actions,
              markdown: voirMarkdown,
            }, `message-${messageId}-part-${partIndex}`);
            return view ? withKey(view.renderElement(), `part-${partIndex}`) : null;
          })}
          {knowledge.length && voirSources ? (
            <div className="sources" data-onir-region="sources">
              Références : {knowledge.map((item) => item.titre || item.ref).join(", ")}
            </div>
          ) : null}
          {showActions ? (
            <div className="actions" data-onir-region="boutons_action">
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
