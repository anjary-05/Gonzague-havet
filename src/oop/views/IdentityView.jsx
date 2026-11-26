import { SectionNode } from "../core/ComponentNode.js";
import { Avatar } from "../elements/Avatar.jsx";
import { isHttpUrl } from "../../utils/format.js";

export class IdentityView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-identity", type: "identity", name: contract.name ?? "Sas d’identité" });
  }

  renderElement() {
    const {
      voirAvatar, avatarUrl, initiales, libelleIdentite, titre, consent,
      submitIdentity, submitting, libelleDemarrer,
    } = this.props;
    return (
      <div className="identity" data-onir-region="identity">
        {new Avatar({ initiales, imageUrl: avatarUrl, hidden: !voirAvatar, modifier: "identity-avatar", region: true }).renderElement()}
        <h3>{libelleIdentite}</h3>
        <p>Indiquez vos coordonnées pour discuter avec l’assistant de {titre}.</p>
        <form onSubmit={submitIdentity}>
          <label className="field">
            Nom
            <input name="nom" type="text" placeholder="Votre nom" aria-label="Nom" required />
          </label>
          <label className="field">
            Email
            <input name="email" type="email" placeholder="vous@exemple.fr" aria-label="Email" required />
          </label>
          {consent && typeof consent.texte === "string" && consent.texte !== "" ? (
            <label className="check">
              <input name="consentement" type="checkbox" />
              <span>
                {consent.texte}{" "}
                {isHttpUrl(consent.lien) ? (
                  <a href={consent.lien} target="_blank" rel="noopener noreferrer">
                    (politique de confidentialité)
                  </a>
                ) : null}
              </span>
            </label>
          ) : null}
          <button className="primary-btn" type="submit" disabled={submitting} data-onir-region="bouton_identite">
            {libelleDemarrer}
          </button>
        </form>
      </div>
    );
  }
}
