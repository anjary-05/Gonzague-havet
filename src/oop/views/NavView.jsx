import { SectionNode } from "../core/ComponentNode.js";
import { safeExternalLink } from "../../utils/Link.jsx";
import { IconGlyph } from "../elements/IconGlyph.jsx";
import { CONTACT_LINKS } from "../../app/config/InterfaceConfig.js";

const ICONS = { whatsapp: "whatsapp", telephone: "phone", rdv: "calendar" };

export class NavView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-contact-nav", type: "contact-nav", name: contract.name ?? "Contacts directs" });
  }

  renderElement() {
    const { params = {}, actions } = this.props;
    const links = CONTACT_LINKS.map((definition) => {
      const icon = ICONS[definition.id];
      if (definition.kind === "tel") {
        const value = String(params[definition.valueParam] ?? "");
        return {
          key: definition.id,
          external: false,
          href: `tel:${value.replace(/\s/g, "")}`,
          label: value,
          icon,
        };
      }
      return {
        key: definition.id,
        external: true,
        url: params[definition.urlParam] ?? "",
        label: params[definition.labelParam] ?? "",
        icon,
      };
    });

    return (
      <nav aria-label="Contacter directement" data-onir-region="contact_nav">
        {links.map((link) =>
          link.external
            ? safeExternalLink(
                link.url,
                actions,
                link.label,
                <>
                  <IconGlyph name={link.icon} />
                  <span className="contact-label">{link.label}</span>
                </>,
                "contact-link",
                link.key,
              )
            : (
                <a key={link.key} className="contact-link" href={link.href} aria-label={link.label}>
                  <IconGlyph name={link.icon} />
                  <span className="contact-label">{link.label}</span>
                </a>
              ),
        )}
      </nav>
    );
  }
}
