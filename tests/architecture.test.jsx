import { expect, it } from "vitest";
import { componentRegistry } from "../src/oop/views/ViewRegistry.js";
import { iconRegistry } from "../src/oop/elements/IconCatalog.js";
import { Icon } from "../src/oop/elements/Icon.jsx";
import { UIElement } from "../src/oop/core/UIElement.js";
import { ButtonElement } from "../src/oop/elements/ButtonElement.jsx";
import { AttachButton } from "../src/oop/elements/AttachButton.jsx";
import { MicButton } from "../src/oop/elements/MicButton.jsx";
import { SendButton } from "../src/oop/elements/SendButton.jsx";
import { Avatar } from "../src/oop/elements/Avatar.jsx";
import { Badge } from "../src/oop/elements/Badge.jsx";
import { Status } from "../src/oop/elements/Status.jsx";
import { ModeChip } from "../src/oop/elements/ModeChip.jsx";
import { TypingDots } from "../src/oop/elements/TypingDots.jsx";

const CONTRACT_KEYS = [
  "id", "type", "name", "version", "props", "children",
  "state", "events", "actions", "styles", "dependencies",
];

const EXPECTED_TYPES = [
  "experience", "page", "layout", "widget", "header", "identity",
  "contact-nav", "thread", "message", "markdown", "media-part", "tool-result",
  "block-fallback", "otp", "typing", "final-state",
  "instruction-item", "instruction-card", "resource-grid", "data-table",
  "chart", "action-buttons", "instruction-confirm", "gallery", "chips",
  "attachment-tray", "composer", "finish", "launcher",
];

it("expose un catalogue hiérarchique extensible", () => {
  EXPECTED_TYPES.forEach((type) => expect(componentRegistry.has(type)).toBe(true));

  const node = componentRegistry.create("widget", {
    id: "test-widget",
    props: { titre: "Test" },
  });

  CONTRACT_KEYS.forEach((key) => expect(key in node).toBe(true));
  expect(node.id).toBe("test-widget");
  expect(node.props.titre).toBe("Test");
  expect(typeof node.render).toBe("function");
});

it("permet la composition récursive sans modifier le moteur", () => {
  const parent = componentRegistry.create("experience", { id: "experience-test" });
  const child = componentRegistry.create("page", { id: "page-test" });
  const grandChild = componentRegistry.create("layout", { id: "layout-test" });

  parent.add(child);
  child.add(grandChild);

  expect(parent.children).toHaveLength(1);
  expect(parent.children[0].children[0].id).toBe("layout-test");
  expect(parent.children[0].children[0].type).toBe("layout");
});

it("expose les icônes comme objets UIElement (rôle + propriétés)", () => {
  const names = [
    "spark", "close", "whatsapp", "phone", "calendar",
    "chevron", "attach", "mic", "send", "check",
  ];
  names.forEach((name) => expect(iconRegistry.has(name)).toBe(true));

  const icon = iconRegistry.create("close", { size: 20 });
  expect(icon).toBeInstanceOf(Icon);
  CONTRACT_KEYS.forEach((key) => expect(key in icon).toBe(true));
  expect(icon.type).toBe("icon");
  expect(icon.role).toBe("img");
  expect(icon.ariaHidden).toBe(true);
  expect(icon.props.size).toBe(20);
  expect(Array.isArray(icon.shapes)).toBe(true);
  expect(icon.shapes.length).toBeGreaterThan(0);

  expect(iconRegistry.create("inconnu")).toBeNull();
});

it("expose chaque primitive visuelle comme objet UIElement (rôle + contrat)", () => {
  const elements = [
    new Avatar({ initiales: "GH", imageUrl: "" }),
    new Badge({ label: "IA DIRECTE" }),
    new Status({ label: "Disponible" }),
    new ModeChip({ label: "Données" }),
    new TypingDots(),
  ];

  elements.forEach((element) => {
    CONTRACT_KEYS.forEach((key) => expect(key in element).toBe(true));
    expect(typeof element.renderElement).toBe("function");
    expect(typeof element.type).toBe("string");
    expect(element.type).not.toBe("");
  });

  expect(new Avatar().role).toBe("img");
  expect(new Status().role).toBe("status");
  expect(new TypingDots().role).toBe("status");
});

it("expose les commandes de saisie via héritage + interface (ButtonElement)", () => {
  const attache = new AttachButton({ visible: false });
  const micro = new MicButton({});
  const envoi = new SendButton({});

  [attache, micro, envoi].forEach((commande) => {
    expect(commande).toBeInstanceOf(ButtonElement);
    expect(commande).toBeInstanceOf(UIElement);
    CONTRACT_KEYS.forEach((key) => expect(key in commande).toBe(true));
    expect(typeof commande.isVisible).toBe("function");
    expect(typeof commande.renderElement).toBe("function");
    expect(commande.role).toBe("button");
  });

  // Interface : une commande masquée ne rend rien (retrait du DOM → flex s'adapte).
  expect(attache.isVisible()).toBe(false);
  expect(attache.renderElement()).toBeNull();
  expect(micro.isVisible()).toBe(true);
});
