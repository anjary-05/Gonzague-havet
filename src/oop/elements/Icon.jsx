import { UIElement } from "../core/UIElement.js";

// instruction.txt §1/§2 : un pictogramme est un UI Element à part entière.
// Il expose le contrat universel (id/type/name/version/props/children/state/
// events/actions/styles/dependencies) plus un rôle sémantique et un glyphe,
// et se rend comme n'importe quel autre objet d'interface.
export class Icon extends UIElement {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? `icon-${contract.name ?? "glyph"}`,
      type: "icon",
      name: contract.name ?? "Icône",
      props: {
        size: contract.size ?? 18,
        className: contract.className ?? "",
        ...(contract.props ?? {}),
      },
    });
    // Rôle ARIA : "img" (décorative par défaut) ; "presentation" pour un glyphe
    // purement ornemental. Les propriétés `label`/`ariaHidden` pilotent le nom
    // accessible quand l'icône est informative.
    this.role = contract.role ?? "img";
    this.ariaHidden = contract.ariaHidden !== false;
    this.label = contract.label ?? null;
    this.viewBox = contract.viewBox ?? "0 0 24 24";
    this.shapes = Array.isArray(contract.shapes) ? contract.shapes : [];
  }

  // Rend l'objet en SVG. La taille, le remplissage et l'épaisseur de trait
  // restent pilotés par les tokens --icon-* injectés sur `.app` (params
  // `afficher_icones` / `style_icones`), donc sans aucune couleur en dur ici.
  renderElement() {
    const { viewBox, shapes, role, ariaHidden, label } = this;
    const { size = 18, className = "" } = this.props;
    return (
      <svg
        viewBox={viewBox}
        className={className || undefined}
        style={size !== 18 ? { width: size, height: size } : undefined}
        role={role}
        aria-hidden={ariaHidden ? "true" : undefined}
        aria-label={ariaHidden ? undefined : (label || undefined)}
      >
        {shapes.map((shape, index) => {
          if (shape.tag === "rect") return <rect key={index} {...shape.attrs} />;
          if (shape.tag === "circle") return <circle key={index} {...shape.attrs} />;
          return <path key={index} d={shape.attrs?.d ?? shape.d} />;
        })}
      </svg>
    );
  }
}
