import { InstructionFactory } from "../../oop/models/Instruction.js";
import { RESOURCE_FILTERS, INTERFACE_MODES } from "../config/InterfaceConfig.js";
import { asObject, asText } from "../../utils/format.js";

// lecture seule du protocole : aucune action n'est déclenchée ici.
export class InterfaceProtocolService {
  constructor({ state = {}, messages = [], protocolKey = "interface_instruction" } = {}) {
    this.state = state;
    this.messages = Array.isArray(messages) ? messages : [];
    this.protocolKey = protocolKey;
  }

  collect() {
    const collected = [];
    const fromState = Array.isArray(this.state.interface_instructions) ? this.state.interface_instructions : [];
    fromState.forEach((raw, index) => {
      const source = asObject(raw);
      const instruction = InstructionFactory.create(source);
      if (!instruction) return;
      const messageId = asText(source.message_id, `state-${index}`);
      const message = this.messages.find((item) => item?.id === messageId) || null;
      collected.push({ id: `${messageId}-state-${index}`, message, instruction });
    });
    this.messages.forEach((message, index) => {
      const instruction = InstructionFactory.create(message?.[this.protocolKey]);
      if (!instruction) return;
      collected.push({ id: `${message?.id || `m-${index}`}-${index}`, message, instruction });
    });
    return collected;
  }

  resources(instruction, resources = {}, message = null) {
    const photos = Array.isArray(resources?.media?.photos) ? resources.media.photos : [];
    const liens = Array.isArray(resources?.media?.liens) ? resources.media.liens : [];
    const attaches = Array.isArray(message?.medias) ? message.medias : [];
    const tout = [
      ...photos.map((item) => ({ ...item, kind: "photo" })),
      ...liens.map((item) => ({ ...item, kind: "lien" })),
      ...attaches.map((item, index) => ({
        id: item.id || `media-${index}`,
        libelle: item.libelle || "",
        url: item.url || "",
        kind: item.type === "photo" ? "photo" : "lien",
      })),
    ];
    const cible = instruction?.resourceId || "";
    if (!cible || cible === "media") return tout;
    const filtre = RESOURCE_FILTERS.find((item) => item.id === cible);
    if (filtre) return tout.filter((item) => item.kind === filtre.kind);
    return tout.filter((item) => item.id === cible);
  }

  activeMode(instructions, defaultMode = "conversation") {
    const last = instructions[instructions.length - 1]?.instruction?.mode;
    if (INTERFACE_MODES.includes(last)) return last;
    return INTERFACE_MODES.includes(defaultMode) ? defaultMode : "conversation";
  }

  dataInstruction(instructions) {
    for (let index = instructions.length - 1; index >= 0; index -= 1) {
      const item = instructions[index].instruction;
      if (["dataTable", "chart"].includes(item.component)) return item;
    }
    return null;
  }
}
