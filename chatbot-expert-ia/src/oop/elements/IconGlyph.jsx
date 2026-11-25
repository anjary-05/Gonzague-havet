import { iconRegistry } from "./IconCatalog.js";

// Pont React vers le catalogue d'icônes : les vues désignent une icône par son
// nom enregistré, le moteur résout l'objet `Icon` correspondant (rôle + propriétés)
// et le rend. Aucun SVG en dur dans les vues.
export function IconGlyph({ name, ...props }) {
  const icon = iconRegistry.create(name, props);
  return icon ? icon.renderElement() : null;
}
