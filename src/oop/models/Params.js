import { asObject } from "../../utils/format.js";

// Encapsulation des paramètres publics du lien (jamais de secret).
export class TemplateParams {
  constructor(raw = {}) {
    this.raw = asObject(raw);
  }

  get(key, fallback = undefined) {
    const value = this.raw[key];
    return value === undefined || value === null ? fallback : value;
  }

  object(key, fallback = {}) {
    return asObject(this.get(key, fallback));
  }
}
