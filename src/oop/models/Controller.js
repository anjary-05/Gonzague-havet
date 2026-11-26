import { TemplateParams } from "./Params.js";
import { createSurface } from "./Surface.js";

// Contrôleur : encapsule le contexte SDK et dérive l'état sans jamais l'écrire.
export class AuroraController {
  constructor(ctx = {}, surfaceOverride = null) {
    this.ctx = ctx || {};
    this.state = this.ctx.state || { phase: "identity", status: "en_cours", messages: [], typing: false };
    this.resources = this.ctx.resources || { media: { photos: [], liens: [] }, modelForm: null };
    this.params = new TemplateParams(this.ctx.params);
    this.capabilities = Array.isArray(this.ctx.capabilities) ? this.ctx.capabilities : [];
    this.actions = this.ctx.actions || {};
    this.consent = this.ctx.consent ?? null;
    this.surface = createSurface(
      surfaceOverride === "widget" || this.ctx.surface === "widget" ? "widget" : "page",
    );
  }

  has(capability) {
    return this.capabilities.includes(capability);
  }

  param(key, fallback) {
    return this.params.get(key, fallback);
  }

  appearance(path, fallback) {
    let node = this.params.object("apparence");
    for (const part of path.split(".")) {
      if (node === null || typeof node !== "object" || !(part in node)) return fallback;
      node = node[part];
    }
    return node === undefined || node === null ? fallback : node;
  }
}
