import { SectionNode } from "../core/ComponentNode.js";
import { AttachButton } from "../elements/AttachButton.jsx";
import { MicButton } from "../elements/MicButton.jsx";
import { SendButton } from "../elements/SendButton.jsx";

export class ComposerView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-composer", type: "composer", name: contract.name ?? "Saisie" });
  }

  renderElement() {
    const {
      fileRef, audioRef, multiple, accept, afficherPJ, afficherMicro, addFiles,
      placeholder, draft, setDraft, statusFinalisee, typing, pending = [], submitMessage,
    } = this.props;
    const envoyerDesactive = typing || statusFinalisee || (draft.trim() === "" && pending.length === 0);
    return (
      <form className="composer" id="form" onSubmit={submitMessage} data-onir-region="composer">
        {afficherPJ ? (
          <input
            type="file"
            id="file"
            multiple={multiple}
            accept={accept}
            hidden
            ref={fileRef}
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        ) : null}
        {new AttachButton({ visible: afficherPJ, onClick: () => fileRef.current?.click() }).renderElement()}
        {afficherMicro ? (
          <input
            type="file"
            id="audio"
            accept="audio/*"
            capture="user"
            hidden
            ref={audioRef}
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        ) : null}
        {new MicButton({ visible: afficherMicro, onClick: () => audioRef.current?.click() }).renderElement()}
        <input
          id="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label="Votre message"
          autoComplete="off"
          maxLength={4000}
          disabled={statusFinalisee}
        />
        {new SendButton({ disabled: envoyerDesactive }).renderElement()}
      </form>
    );
  }
}
