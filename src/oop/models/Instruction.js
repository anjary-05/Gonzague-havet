import { UIElement } from "../core/UIElement.js";
import {
  INTERFACE_ACTIONS, INTERFACE_COMPONENTS, INTERFACE_MODES,
  DEFAULT_INTERFACE_LABELS,
} from "../../app/config/InterfaceConfig.js";
import { asNumber, asObject, asText } from "../../utils/format.js";

// instruction.txt §1/§2 : une instruction est un objet du catalogue, pas un HTML.
class InterfaceInstruction extends UIElement {
  constructor(raw = {}) {
    const source = asObject(raw);
    const props = asObject(source.props);
    const state = asObject(source.state);
    super({
      id: asText(source.id, `instruction-${source.message_id || "state"}`),
      type: "instruction",
      name: asText(props.titre, asText(source.component, "instruction")),
      version: asNumber(props.version, 1, 1, 99),
      props,
      state,
      actions: [asText(source.action, "")].filter(Boolean),
    });
    this.messageId = asText(source.message_id, "");
    this.action = asText(source.action, "");
    this.component = asText(source.component, "");
    this.resourceId = asText(source.resource_id, "");
    this.mode = INTERFACE_MODES.includes(source.mode ?? state.mode)
      ? (source.mode ?? state.mode)
      : null;
    this.raw = source;
  }

  isValid() {
    return INTERFACE_ACTIONS.includes(this.action) && INTERFACE_COMPONENTS.includes(this.component);
  }

  label(fallback = this.component) {
    return asText(this.props.titre, fallback);
  }

  modeLabel(lib) {
    const key = this.mode || "conversation";
    return typeof lib === "function" ? lib(key, key) : (DEFAULT_INTERFACE_LABELS[key] ?? key);
  }
}

export class InstructionFactory {
  static create(raw) {
    const instruction = new InterfaceInstruction(raw);
    return instruction.isValid() ? instruction : null;
  }
}
