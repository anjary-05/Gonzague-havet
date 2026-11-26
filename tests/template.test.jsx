import { act } from "react";
import { expect, it, vi } from "vitest";
import { createMockContext, mountTemplate } from "@onirtech/template-sdk/testing";
import "../src/index.js";

const ELEMENT = "onirtech-template-chatbot-expert-ia";
const WIDGET_ELEMENT = "onirtech-template-chatbot-expert-ia-widget";

// React 19 : les mises à jour de test doivent être enveloppées dans `act`.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(ctx, element = ELEMENT) {
  let result;
  act(() => {
    result = mountTemplate(element, ctx);
  });
  return result;
}

function submitForm(root, selector) {
  const form = root.querySelector(selector);
  expect(form).not.toBeNull();
  act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function typeInto(root, selector, value) {
  const input = root.querySelector(selector);
  expect(input).not.toBeNull();
  act(() => {
    // React 19 suit la valeur via un setter natif : écrire `input.value`
    // directement ne déclenche pas onChange.
    const setter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}

it("rend la coquille shadcn et le sas d'identité avec le consentement", () => {
  const ctx = createMockContext({
    params: { titre_chat: "Expert custom", initiales: "EX" },
    consent: { texte: "J'accepte la politique", lien: "https://example.com/politique" },
  });
  const { el } = mount(ctx);
  const text = el.shadowRoot.textContent;

  expect(text).toContain("Expert custom");
  expect(text).toContain("EX");
  expect(text).toContain("IA DIRECTE");
  expect(text).toContain("Avant de commencer");
  expect(text).toContain("J'accepte la politique");
  expect(el.shadowRoot.querySelector(".widget")).not.toBeNull();
  expect(el.shadowRoot.querySelector('[data-onir-region="header"]')).not.toBeNull();
});

it("soumet l'identité via l'action du SDK", () => {
  const submitIdentity = vi.fn();
  const ctx = createMockContext({
    consent: { texte: "Consentement", lien: "https://example.com/c" },
    actions: { submitIdentity },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  typeInto(root, 'input[name="nom"]', "  Alice  ");
  typeInto(root, 'input[name="email"]', " Alice@Exemple.fr ");
  act(() => {
    const checkbox = root.querySelector('input[name="consentement"]');
    checkbox.checked = true;
  });
  submitForm(root, ".identity form");

  expect(submitIdentity).toHaveBeenCalledTimes(1);
  expect(submitIdentity).toHaveBeenCalledWith({
    nom: "Alice",
    email: "Alice@Exemple.fr",
    consentement: true,
  });
});

it("affiche les messages, médias, connaissances et l'indicateur de frappe", () => {
  const ctx = createMockContext({
    state: {
      phase: "chat",
      typing: true,
      messages: [
        {
          id: "m1",
          role: "assistant",
          content: "Bonjour test",
          medias: [{ type: "photo", libelle: "Photo test", url: "https://example.com/p.png" }],
          knowledge: [{ ref: "k1", titre: "Référence test" }],
          at: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.textContent).toContain("Bonjour test");
  expect(root.textContent).toContain("Référence test");
  expect(root.querySelector(".typing")).not.toBeNull();
  expect(root.querySelector(".msg.user")).toBeNull();
  expect(root.querySelector("img.m-img")?.getAttribute("alt")).toBe("Photo test");
});

it("envoie le message saisi via actions.sendMessage", () => {
  const sendMessage = vi.fn();
  const ctx = createMockContext({
    state: { phase: "chat", messages: [] },
    actions: { sendMessage },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  typeInto(root, "#input", "Ma question");
  submitForm(root, "#form");

  expect(sendMessage).toHaveBeenCalledWith("Ma question", undefined);
  expect(root.querySelector("#input").value).toBe("");
});

it("masque le micro ou la pièce jointe indépendamment (sans toucher l'autre)", () => {
  const sansMicro = createMockContext({
    params: { afficher_micro: false },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(sansMicro);
  expect(el.shadowRoot.querySelector("#mic")).toBeNull();
  expect(el.shadowRoot.querySelector("#attach")).not.toBeNull();
  expect(el.shadowRoot.querySelector("#input")).not.toBeNull();

  const sansPJ = createMockContext({
    params: { afficher_piece_jointe: false },
    state: { phase: "chat", messages: [] },
  });
  const { el: el2 } = mount(sansPJ);
  expect(el2.shadowRoot.querySelector("#attach")).toBeNull();
  expect(el2.shadowRoot.querySelector("#mic")).not.toBeNull();
  expect(el2.shadowRoot.querySelector("#input")).not.toBeNull();
});

it("envoie une puce de sujet déclarée en paramètre structuré", () => {
  const sendMessage = vi.fn();
  const ctx = createMockContext({
    params: { sujets_suggeres: ["Sujet A", "Sujet B"] },
    state: { phase: "chat", messages: [] },
    actions: { sendMessage },
  });
  const { el } = mount(ctx);
  const chips = [...el.shadowRoot.querySelectorAll(".chip")];

  expect(chips.map((chip) => chip.textContent)).toEqual(["Sujet A", "Sujet B"]);
  act(() => chips[1].click());

  expect(sendMessage).toHaveBeenCalledWith("Sujet B", undefined);
});

it("affiche les pièces en attente et appelle removeAttachment", () => {
  const removeAttachment = vi.fn();
  const ctx = createMockContext({
    state: {
      phase: "chat",
      messages: [],
      pendingAttachments: [
        {
          id: "att1",
          fieldName: "piece_jointe",
          fieldLabel: "Pièce jointe",
          originalName: "cv.pdf",
          mime: "application/pdf",
          sizeBytes: 123,
          url: "",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    actions: { removeAttachment },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".tray").textContent).toContain("cv.pdf");
  act(() => root.querySelector(".tray button").click());
  expect(removeAttachment).toHaveBeenCalledWith("att1");
});

it("ferme et réouvre le widget via les actions hôte", () => {
  const closeWidget = vi.fn();
  const openWidget = vi.fn();
  const ctx = createMockContext({
    state: { phase: "chat", messages: [] },
    actions: { closeWidget, openWidget },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  act(() => root.querySelector(".close").click());
  expect(closeWidget).toHaveBeenCalledTimes(1);
  expect(root.querySelector(".launcher")).not.toBeNull();

  act(() => root.querySelector(".launcher").click());
  expect(openWidget).toHaveBeenCalledWith({ width: 480, height: 640 });
  expect(root.querySelector(".widget")).not.toBeNull();
});

it("monte la surface widget fermée (lanceur) puis l'ouvre via l'action hôte", () => {
  const openWidget = vi.fn();
  const ctx = createMockContext({
    state: { phase: "chat", messages: [] },
    actions: { openWidget },
  });
  const { el } = mount(ctx, WIDGET_ELEMENT);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.getAttribute("data-surface")).toBe("widget");
  expect(el.shadowRoot.querySelector(".launcher")).not.toBeNull();
  expect(el.shadowRoot.querySelector(".widget")).toBeNull();

  act(() => el.shadowRoot.querySelector(".launcher").click());
  expect(openWidget).toHaveBeenCalledWith({ width: 480, height: 640 });
  expect(el.shadowRoot.querySelector(".widget")).not.toBeNull();
});

it("applique les tokens du thème du lien aux variables CSS", () => {
  const ctx = createMockContext({
    theme: { primary: "#123456", page: "#abcdef" },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--primary")).toBe("#123456");
  expect(app.style.getPropertyValue("--page")).toBe("#abcdef");
});

it("bascule le thème clair/sombre via le bouton (variable de clic)", () => {
  const ctx = createMockContext({ state: { phase: "chat", messages: [] } });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");
  const toggle = el.shadowRoot.querySelector(".theme-toggle");

  expect(toggle).not.toBeNull();
  expect(app.getAttribute("data-theme")).toBe("light");
  act(() => toggle.click());
  expect(app.getAttribute("data-theme")).toBe("dark");
  act(() => toggle.click());
  expect(app.getAttribute("data-theme")).toBe("light");
});

it("termine la discussion une fois via actions.finish", () => {
  const finish = vi.fn();
  const ctx = createMockContext({
    state: {
      phase: "chat",
      messages: [{ id: "m1", role: "assistant", content: "Bonjour", medias: [], at: "2026-01-01T00:00:00.000Z" }],
    },
    actions: { finish },
  });
  const { el } = mount(ctx);

  act(() => el.shadowRoot.querySelector(".finish").click());
  expect(finish).toHaveBeenCalledTimes(1);
});

it("rend le menu de secours quand l'hôte le fournit", () => {
  const selectFallback = vi.fn();
  const ctx = createMockContext({
    state: {
      phase: "chat",
      messages: [],
      fallback: {
        intro: "Je peux aider",
        questions: [{ id: "q1", label: "Question secours" }],
        showCollectionForm: false,
      },
    },
    actions: { selectFallback },
  });
  const { el } = mount(ctx);
  const chip = el.shadowRoot.querySelector(".chip");

  expect(chip.textContent).toBe("Question secours");
  act(() => chip.click());
  expect(selectFallback).toHaveBeenCalledWith("q1");
});

it("réagit à une nouvelle assignation du contexte", () => {
  const ctx = createMockContext();
  const { el, update } = mount(ctx);

  expect(el.shadowRoot.textContent).toContain("Avant de commencer");

  act(() => {
    update(
      createMockContext({
        state: { phase: "chat", messages: [{ role: "assistant", content: "Nouveau message" }] },
      }),
    );
  });

  expect(el.shadowRoot.textContent).toContain("Nouveau message");
  expect(el.shadowRoot.textContent).not.toContain("Avant de commencer");
});

it("utilise l'avatar image et masque badge/statut quand demandé", () => {
  const ctx = createMockContext({
    params: {
      avatar_image: "https://example.com/avatar.png",
      afficher_badge: false,
      afficher_statut: false,
    },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector('header [data-onir-region="avatar"] img.avatar-img').getAttribute("src"))
    .toBe("https://example.com/avatar.png");
  expect(root.querySelector('[data-onir-region="badge"]')).toBeNull();
  expect(root.querySelector('[data-onir-region="statut"]')).toBeNull();
});

it("applique les tokens visuels du paramètre structuré apparence", () => {
  const ctx = createMockContext({
    params: {
      apparence: {
        widget: { fond: "#123456", rayon: 8, largeur_bordure: 3 },
        header: { debut: "#010203" },
        avatar: { taille: 40 },
        saisie: { fond_envoi: "#ff0000" },
      },
    },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--widget-bg")).toBe("#123456");
  expect(app.style.getPropertyValue("--widget-radius")).toBe("8px");
  expect(app.style.getPropertyValue("--widget-border-width")).toBe("3px");
  expect(app.style.getPropertyValue("--header-start")).toBe("#010203");
  expect(app.style.getPropertyValue("--avatar-size")).toBe("40px");
  expect(app.style.getPropertyValue("--send-bg")).toBe("#ff0000");
});

it("le bouton d'envoi est piloté uniquement par sa propre couleur", () => {
  const ctx = createMockContext({
    params: {
      apparence: {
        saisie: { fond_envoi: "#ff0000" },
        bouton: { fond: "#123456" },
      },
    },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--send-bg")).toBe("#ff0000");
  expect(app.style.getPropertyValue("--btn-bg")).toBe("#123456");
  expect(el.shadowRoot.querySelector('[data-onir-region="bouton_envoi"]')).not.toBeNull();
});

it("le bouton Démarrer est piloté par ses propres couleurs", () => {
  const ctx = createMockContext({
    params: { apparence: { identite: { fond_bouton: "#abcdef", texte_bouton: "#111111" } } },
    state: { phase: "identity", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--id-btn-bg")).toBe("#abcdef");
  expect(app.style.getPropertyValue("--id-btn-fg")).toBe("#111111");
  expect(el.shadowRoot.querySelector('[data-onir-region="bouton_identite"]')).not.toBeNull();
});

it("les boutons d'action ont leur propre couleur, sans effet sur l'envoi", () => {
  const ctx = createMockContext({
    params: { apparence: { bouton: { fond: "#123456" } } },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--btn-bg")).toBe("#123456");
  expect(app.style.getPropertyValue("--send-bg")).toBe("#4f46e5");
});

it("une couleur de lanceur personnalisée remplace le dégradé de marque", () => {
  const ctx = createMockContext({
    params: { apparence: { lanceur: { fond: "#654321" } } },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--launcher-bg")).toBe("#654321");
  expect(app.style.getPropertyValue("--launcher-gradient")).toContain("#654321");
});

it("masque horodatage, boutons d'accueil et indicateur de frappe", () => {
  const ctx = createMockContext({
    params: {
      afficher_horodatage: false,
      afficher_boutons_accueil: false,
      afficher_frappe: false,
    },
    state: {
      phase: "chat",
      typing: true,
      messages: [{ id: "m1", role: "assistant", content: "Bonjour", medias: [], at: "2026-01-01T00:00:00.000Z" }],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector("time")).toBeNull();
  expect(root.querySelector(".btn2")).toBeNull();
  expect(root.querySelector(".typing")).toBeNull();
});

it("pilote le style global des icônes sans chargement réseau", () => {
  const ctx = createMockContext({
    params: { afficher_icones: false, style_icones: "pleins" },
    state: { phase: "chat", messages: [] },
  });
  const { el } = mount(ctx);
  const app = el.shadowRoot.querySelector(".app");

  expect(app.style.getPropertyValue("--icon-display")).toBe("none");
  expect(app.style.getPropertyValue("--icon-fill")).toBe("currentColor");
  expect(app.style.getPropertyValue("--icon-stroke-width")).toBe("0");
});

it("rend une instruction structurée gallery et le mode actif", () => {
  const ctx = createMockContext({
    params: { afficher_indicateur_mode: true },
    resources: {
      media: {
        photos: [{ id: "p1", libelle: "Photo", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='%23023777'/%3E%3C/svg%3E" }],
        liens: [],
      },
      modelForm: null,
    },
    state: {
      phase: "chat",
      messages: [{
        id: "m1",
        role: "assistant",
        content: "Voici les visuels",
        medias: [],
        at: "2026-01-01T00:00:00.000Z",
      }],
      interface_instructions: [{
        message_id: "m1",
        action: "display",
        component: "gallery",
        resource_id: "photos",
        props: { titre: "Galerie" },
        state: { mode: "visuel" },
      }],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".mode-chip")?.textContent).toContain("Visuel");
  expect(root.querySelector(".instruction-card")).not.toBeNull();

  expect(root.querySelectorAll(".resource-item").length).toBeGreaterThan(0);
});

it("charge une instruction dataTable via ctx.data.load (capacité data)", async () => {
  const load = vi.fn().mockResolvedValue({
    status: "ok",
    data: { colonnes: ["libelle", "valeur"], lignes: [{ libelle: "IA", valeur: 42 }] },
    meta: { cached: false, generatedAt: "2026-01-01T00:00:00.000Z", revision: 1, truncated: false },
  });
  const ctx = createMockContext({
    capabilities: ["messages", "data"],
    data: { load },
    state: {
      phase: "chat",
      messages: [{
        id: "m2",
        role: "assistant",
        content: "Données",
        medias: [],
        at: "2026-01-01T00:00:00.000Z",
      }],
      interface_instructions: [{
        message_id: "m2",
        action: "display",
        component: "dataTable",
        resource_id: "donnees_interface",
        props: { titre: "Tableau" },
        state: { mode: "donnees" },
      }],
    },
  });
  let result;
  await act(async () => {
    result = mountTemplate(ELEMENT, ctx);
    await Promise.resolve();
  });
  const root = result.el.shadowRoot;

  expect(load).toHaveBeenCalledWith("donnees_interface", expect.objectContaining({ inputs: expect.any(Object) }));
  expect(root.querySelector(".data-table")?.textContent).toContain("IA");
});


it("demande confirmation avant de révéler l'instruction imbriquée", () => {
  const openMedia = vi.fn();
  const ctx = createMockContext({
    actions: { openMedia },
    resources: {
      media: {
        photos: [],
        liens: [{ id: "l1", libelle: "Documentation", url: "https://example.com/doc" }],
      },
      modelForm: null,
    },
    state: {
      phase: "chat",
      messages: [{
        id: "m4",
        role: "assistant",
        content: "Ouvrir ?",
        medias: [],
        at: "2026-01-01T00:00:00.000Z",
      }],
      interface_instructions: [{
        message_id: "m4",
        action: "confirm",
        component: "actions",
        resource_id: "",
        props: {
          titre: "Ouvrir la documentation ?",
          instruction: {
            action: "display",
            component: "resources",
            resource_id: "l1",
            props: { titre: "Documentation" },
            state: { mode: "exploration" },
          },
        },
      }],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;
  const card = root.querySelector(".instruction-card");

  expect(card.textContent).toContain("Confirmer");
  expect(root.querySelector(".resource-item")).toBeNull();
  act(() => {
    card.querySelector(".btn2").click();
  });
  expect(root.textContent).toContain("Documentation");
});
