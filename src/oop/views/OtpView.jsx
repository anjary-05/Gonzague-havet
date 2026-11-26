import { SectionNode } from "../core/ComponentNode.js";
import { Avatar } from "../elements/Avatar.jsx";
import { isHttpUrl } from "../../utils/format.js";

// Phase `otp` du contrat hôte (identification par email). Vue sans état : les
// challenges et les erreurs sont portés par Aurora, qui détient les hooks React
// et appelle `ctx.actions.requestOtp()` / `verifyOtp()` via le SDK.
export class OtpView extends SectionNode {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? "section-otp",
      type: "otp",
      name: contract.name ?? "Vérification par email",
    });
  }

  renderElement() {
    const {
      voirAvatar, avatarUrl, initiales, titre, consent,
      challenge = null, email = "", error = "", submitting = false,
      onRequest, onVerify, onResend, onBack,
    } = this.props;

    return (
      <div className="identity otp" data-onir-region="identity">
        {new Avatar({ initiales, imageUrl: avatarUrl, hidden: !voirAvatar, modifier: "identity-avatar", region: true }).renderElement()}
        {challenge === null
          ? this.renderRequest({ titre, consent, error, submitting, onRequest })
          : this.renderCode({ email, error, submitting, onVerify, onResend, onBack })}
      </div>
    );
  }

  renderRequest({ titre, consent, error, submitting, onRequest }) {
    return (
      <>
        <h3>Vérifions votre email</h3>
        <p>Nous vous enverrons un code à 6 chiffres pour discuter avec l’assistant de {titre}.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (typeof onRequest !== "function") return;
          const data = new FormData(event.currentTarget);
          onRequest({
            email: String(data.get("email") ?? "").trim(),
            consentement: data.get("consentement") === "on",
          });
        }}>
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
          {error ? <p className="otp-error" role="alert">{error}</p> : null}
          <button className="primary-btn" type="submit" disabled={submitting} data-onir-region="bouton_identite">
            {submitting ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>
      </>
    );
  }

  renderCode({ email, error, submitting, onVerify, onResend, onBack }) {
    return (
      <>
        <h3>Code envoyé</h3>
        <p>Saisissez le code reçu à {email}. Il expire dans 10 minutes.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (typeof onVerify !== "function") return;
          const data = new FormData(event.currentTarget);
          onVerify({ code: String(data.get("code") ?? "").trim() });
        }}>
          <label className="field">
            Code à 6 chiffres
            <input name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" placeholder="000000" aria-label="Code à 6 chiffres" required />
          </label>
          {error ? <p className="otp-error" role="alert">{error}</p> : null}
          <button className="primary-btn" type="submit" disabled={submitting} data-onir-region="bouton_identite">
            {submitting ? "Vérification…" : "Vérifier et démarrer"}
          </button>
          <div className="otp-links">
            <button type="button" className="link-button" onClick={onResend}>Renvoyer le code</button>
            <button type="button" className="link-button" onClick={onBack}>Changer d’email</button>
          </div>
        </form>
      </>
    );
  }
}
