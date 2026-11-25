import { ComponentNode } from "../core/ComponentNode.js";

export class TrayView extends ComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "component-attachment-tray", type: "attachment-tray", name: contract.name ?? "Pièces en attente" });
  }

  renderElement() {
    const { pending = [], removeAttachment } = this.props;
    if (!pending.length) return null;
    return (
      <div className="tray" id="tray">
        {pending.map((item) => (
          <div className="att" key={item.id}>
            {typeof item.mime === "string" && item.mime.startsWith("image/") && item.url ? (
              <img src={item.url} alt="" />
            ) : null}
            <span>{item.originalName || item.fieldLabel || "Pièce jointe"}</span>
            <button
              type="button"
              aria-label={`Retirer ${item.originalName || "la pièce jointe"}`}
              onClick={() => removeAttachment(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }
}
