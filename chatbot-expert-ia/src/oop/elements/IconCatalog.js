import { Icon } from "./Icon.jsx";

// Catalogue des pictogrammes : chaque entrée est un objet déclaratif (nom,
// rôle optionnel, classe, glyphe). Le moteur d'icônes résout ces entrées en
// instances `Icon` — comme le catalogue de composants, l'IA ne crée pas de
// glyphe arbitraire, elle référence un nom enregistré.
const GLYPHS = {
  spark: {
    name: "spark",
    shapes: [{ tag: "path", attrs: { d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" } }],
  },
  close: {
    name: "close",
    shapes: [{ tag: "path", attrs: { d: "M18 6 6 18M6 6l12 12" } }],
  },
  whatsapp: {
    name: "whatsapp",
    className: "wa",
    shapes: [{ tag: "path", attrs: { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" } }],
  },
  phone: {
    name: "phone",
    shapes: [{ tag: "path", attrs: { d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" } }],
  },
  calendar: {
    name: "calendar",
    shapes: [
      { tag: "rect", attrs: { x: 3, y: 4, width: 18, height: 18, rx: 2 } },
      { tag: "path", attrs: { d: "M16 2v4M8 2v4M3 10h18" } },
    ],
  },
  chevron: {
    name: "chevron",
    shapes: [{ tag: "path", attrs: { d: "m9 18 6-6-6-6" } }],
  },
  attach: {
    name: "attach",
    shapes: [{ tag: "path", attrs: { d: "m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" } }],
  },
  mic: {
    name: "mic",
    shapes: [
      { tag: "rect", attrs: { x: 9, y: 2, width: 6, height: 12, rx: 3 } },
      { tag: "path", attrs: { d: "M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" } },
    ],
  },
  send: {
    name: "send",
    shapes: [
      { tag: "path", attrs: { d: "m22 2-7 20-4-9-9-4Z" } },
      { tag: "path", attrs: { d: "M22 2 11 13" } },
    ],
  },
  check: {
    name: "check",
    shapes: [{ tag: "path", attrs: { d: "m5 13 4 4L19 7" } }],
  },
  sun: {
    name: "sun",
    shapes: [
      { tag: "circle", attrs: { cx: 12, cy: 12, r: 5 } },
      { tag: "path", attrs: { d: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" } },
    ],
  },
  moon: {
    name: "moon",
    shapes: [{ tag: "path", attrs: { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" } }],
  },
};

export class IconRegistry {
  constructor() {
    this.glyphs = new Map();
  }

  register(name, spec) {
    if (typeof name !== "string" || name === "") throw new Error("nom d'icône invalide");
    if (!spec || typeof spec !== "object") throw new Error(`icône ${name} invalide`);
    this.glyphs.set(name, spec);
    return this;
  }

  registerAll(entries) {
    Object.entries(entries).forEach(([name, spec]) => this.register(name, spec));
    return this;
  }

  has(name) {
    return this.glyphs.has(name);
  }

  create(name, overrides = {}) {
    const spec = this.glyphs.get(name);
    if (!spec) return null;
    return new Icon({
      name: spec.name ?? name,
      role: overrides.role ?? spec.role ?? "img",
      label: overrides.label ?? spec.label ?? null,
      ariaHidden: overrides.ariaHidden ?? true,
      size: overrides.size ?? spec.size ?? 18,
      className: overrides.className ?? spec.className ?? "",
      viewBox: spec.viewBox ?? "0 0 24 24",
      shapes: spec.shapes,
    });
  }
}

export const iconRegistry = new IconRegistry();
iconRegistry.registerAll(GLYPHS);
