import { act } from "react";
import { expect, it } from "vitest";
import { createMockContext, mountTemplate } from "@onirtech/template-sdk/testing";
import { GenerativeBlock, formatToolFieldValue, resolveBlock } from "../src/oop/models/GenerativeBlock.js";
import {
  CONTENT_FORMATS,
  partViewType,
  registerFormat,
  resolveBlock as resolveBlockCentral,
} from "../src/oop/core/ContentRegistry.js";
import { partViewType as legacyPartViewType } from "../src/oop/views/PartViewRegistry.js";
import { MarkdownDocument } from "../src/oop/models/MarkdownDocument.js";
import { MultimodalContent } from "../src/oop/models/MultimodalContent.js";
import { isSafeMediaUrl, toOpenableUrl } from "../src/utils/format.js";
import "../src/index.js";

const ELEMENT = "onirtech-template-chatbot-expert-ia";
const WIDGET_ELEMENT = "onirtech-template-chatbot-expert-ia-widget";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(ctx, element = ELEMENT) {
  let result;
  act(() => {
    result = mountTemplate(element, ctx);
  });
  return result;
}

function chatContext(overrides = {}) {
  return createMockContext({
    state: { phase: "chat", messages: [], ...overrides },
  });
}

it("interprète les blocs Markdown (titres, listes, code, tableaux)", () => {
  const doc = new MarkdownDocument([
    "# Titre",
    "",
    "Un **paragraphe** avec du `code` et un [lien](https://example.com).",
    "",
    "- premier",
    "- second",
    "",
    "```js",
    "const multimodal = true;",
    "```",
    "",
    "| Colonne | Valeur |",
    "| --- | ---: |",
    "| IA | 42 |",
  ].join("\n"));

  expect(doc.blocks.map((block) => block.type)).toEqual([
    "heading", "paragraph", "list", "code", "table",
  ]);
  expect(doc.blocks[0].level).toBe(1);
  expect(doc.plainText).toContain("Un paragraphe");
  expect(doc.plainText).toContain("const multimodal = true;");
});

it("normalise un message texte, médias et pièces jointes", () => {
  const content = MultimodalContent.from({
    content: "Bonjour **monde**",
    medias: [{ type: "photo", libelle: "Photo", url: "https://example.com/p.png" }],
    attachments: [
      {
        id: "a1",
        fieldName: "piece_jointe",
        fieldLabel: "Pièce jointe",
        originalName: "note.mp3",
        mime: "audio/mpeg",
        sizeBytes: 2048,
        url: "https://example.com/note.mp3",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  expect(content.parts.map((part) => part.kind)).toEqual(["text", "image", "audio"]);
  expect(content.hasText).toBe(true);
  expect(content.hasMedia).toBe(true);
  expect(content.parts[0].document.blocks[0].type).toBe("paragraph");
});

it("accepte les parties façon ChatGPT (content[] et parts[])", () => {
  const fromContent = MultimodalContent.from({
    content: [
      { type: "text", text: "Voici l'image :" },
      { type: "image_url", image_url: { url: "https://example.com/i.png" } },
      { type: "file", file: { name: "guide.pdf", url: "https://example.com/g.pdf", mime: "application/pdf" } },
    ],
  });
  expect(fromContent.parts.map((part) => part.kind)).toEqual(["text", "image", "file"]);

  const fromParts = MultimodalContent.from({
    parts: [
      { type: "input_audio", input_audio: { data: "AAAA", format: "wav" } },
      { type: "text", text: "Transcription" },
    ],
  });
  expect(fromParts.parts.map((part) => part.kind)).toEqual(["audio", "text"]);
  expect(fromParts.parts[0].url).toMatch(/^data:audio\/wav;base64,/);
});

it("rejette les URL dangereuses et les pièces sans URL restent visibles", () => {
  const content = MultimodalContent.from({
    content: [
      { type: "image_url", image_url: { url: "javascript:alert(1)" } },
      { type: "link", url: "javascript:alert(1)", label: "piège" },
    ],
    attachments: [
      {
        id: "a2",
        fieldName: "piece_jointe",
        fieldLabel: "Pièce jointe",
        originalName: "cv.pdf",
        mime: "application/pdf",
        sizeBytes: 123,
        url: "",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  expect(content.parts.map((part) => part.kind)).toEqual(["file"]);
  expect(content.parts[0].url).toBe("");
  expect(content.parts[0].name).toBe("cv.pdf");
});

it("accepte les URL signées relatives du serveur sans relâcher les garde-fous", () => {
  const signed = "/api/medias/550e8400/file?t=1780000000.abc-DEF_123";
  expect(isSafeMediaUrl(signed, "image")).toBe(true);
  expect(toOpenableUrl(signed)).toBe(`http://localhost:3000${signed}`);
  expect(isSafeMediaUrl("//evil.example.com/x.png", "image")).toBe(false);
  expect(isSafeMediaUrl("/api/../secret", "image")).toBe(false);
  expect(isSafeMediaUrl("javascript:alert(1)", "image")).toBe(false);
  expect(toOpenableUrl("javascript:alert(1)")).toBe("");
});

it("normalise les médias signés relatifs renvoyés par le backend", () => {
  const content = MultimodalContent.from({
    content: "",
    medias: [{ type: "photo", libelle: "Façade", url: "/api/medias/abc/file?t=1.sig" }],
  });
  expect(content.parts.map((part) => part.kind)).toEqual(["image"]);
  expect(content.parts[0].url).toBe("/api/medias/abc/file?t=1.sig");
});

it("affiche une image signée relative et ouvre son URL absolue", () => {
  const opened = [];
  const ctx = chatContext({
    messages: [{
      id: "m-rel",
      role: "assistant",
      content: "",
      medias: [{ type: "photo", libelle: "Façade", url: "/api/medias/abc/file?t=1.sig" }],
      at: "2026-01-01T00:00:00.000Z",
    }],
  });
  ctx.actions.openMedia = (url) => opened.push(url);
  const { el } = mount(ctx);
  const image = el.shadowRoot.querySelector("img.m-img");
  expect(image?.getAttribute("src")).toBe("/api/medias/abc/file?t=1.sig");
  image.dispatchEvent(new Event("click", { bubbles: true }));
  expect(opened).toEqual(["http://localhost:3000/api/medias/abc/file?t=1.sig"]);
});

it("interprète le Markdown dans la conversation de la page", () => {
  const ctx = chatContext({
    messages: [{
      id: "m1",
      role: "assistant",
      content: [
        "### Titre",
        "",
        "Un **texte gras** et un [lien](https://example.com).",
        "",
        "- premier",
        "- second",
      ].join("\n"),
      medias: [],
      at: "2026-01-01T00:00:00.000Z",
    }],
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".md h3")?.textContent).toBe("Titre");
  expect(root.querySelector(".md strong")?.textContent).toBe("texte gras");
  expect([...root.querySelectorAll(".md ul li")].map((item) => item.textContent)).toEqual(["premier", "second"]);
  expect(root.querySelector("a.md-link")?.getAttribute("href")).toBe("https://example.com");
});

it("affiche les parties multimodales d'un message (image + fichier)", () => {
  const ctx = chatContext();
  ctx.state.messages = [{
    id: "m2",
    role: "assistant",
    content: "Voici le visuel :",
    medias: [{ type: "photo", libelle: "Photo test", url: "https://example.com/p.png" }],
    attachments: [{
      id: "a1",
      fieldName: "piece_jointe",
      fieldLabel: "Pièce jointe",
      originalName: "cv.pdf",
      mime: "application/pdf",
      sizeBytes: 2048,
      url: "https://example.com/cv.pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
    }],
    at: "2026-01-01T00:00:00.000Z",
  }];
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector("img.m-img")?.getAttribute("alt")).toBe("Photo test");
  expect(root.textContent).toContain("cv.pdf");
  expect(root.querySelector(".md")).not.toBeNull();
});

it("neutralise le HTML brut et les liens javascript:", () => {
  const ctx = chatContext({
    messages: [{
      id: "m3",
      role: "assistant",
      content: "<script>alert(1)</script>\n\n[lien piégé](javascript:alert(1))",
      medias: [],
      at: "2026-01-01T00:00:00.000Z",
    }],
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector("script")).toBeNull();
  expect(root.textContent).toContain("<script>alert(1)</script>");
  expect(root.querySelector('a[href^="javascript"]')).toBeNull();
  expect(root.querySelector(".md-link-disabled")?.textContent).toBe("lien piégé");
});

it("applique le Markdown sur la surface widget", () => {
  const ctx = chatContext({
    messages: [{
      id: "m4",
      role: "assistant",
      content: "**Widget multimodal**",
      medias: [],
      at: "2026-01-01T00:00:00.000Z",
    }],
  });
  const { el } = mount(ctx, WIDGET_ELEMENT);

  act(() => el.shadowRoot.querySelector(".launcher").click());
  expect(el.shadowRoot.querySelector(".md strong")?.textContent).toBe("Widget multimodal");
});

it("respecte afficher_markdown=false (texte brut préservé)", () => {
  const ctx = createMockContext({
    params: { afficher_markdown: false },
    state: {
      phase: "chat",
      messages: [{
        id: "m5",
        role: "assistant",
        content: "**gras**",
        medias: [],
        at: "2026-01-01T00:00:00.000Z",
      }],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".md strong")).toBeNull();
  expect(root.querySelector(".md-plain")?.textContent).toContain("**gras**");
});

it("interprète les blocs ADR-0067 et les champs typés", () => {
  const raw = {
    type: "tool_search_result",
    contractVersion: 1,
    tool: "recherche_fiche",
    layout: "card",
    items: [{
      fields: [
        { key: "date", label: "Date", type: "date", value: "2026-03-09" },
        { key: "budget", label: "Budget", type: "number", value: 1200, unit: "€" },
        { key: "tags", label: "Tags", type: "multi", value: ["IA", "PME"] },
        { key: "fichier", label: "Fichier", type: "file", value: "secret.pdf" },
      ],
    }],
    meta: { total: 1, hasMore: true },
  };

  const resolved = resolveBlock(raw);
  expect(resolved.type).toBe("tool_search_result");
  expect(resolved.layout).toBe("card");
  expect(resolved.items[0].fields.map((field) => field.type)).toEqual(["date", "number", "multi"]);
  expect(formatToolFieldValue(resolved.items[0].fields[0])).toBe("09/03/2026");
  expect(formatToolFieldValue(resolved.items[0].fields[1])).toBe("1200 €");
  // Une version non comprise retombe sur `content`, sans casser le message.
  expect(resolveBlock({ ...raw, contractVersion: 99 })).toBeNull();
  expect(resolveBlock({ type: "inconnu", text: "ignore" })).toBeNull();
  expect(new GenerativeBlock({ blocks: [raw] }).structured).toHaveLength(1);
});

it("normalise message.blocks et conserve un texte de secours", () => {
  const content = MultimodalContent.from({
    content: "Texte de secours",
    blocks: [
      { type: "text", text: "**Riche**" },
      { type: "image", url: "https://example.com/a.png", alt: "Visuel A" },
      {
        type: "tool_search_result",
        contractVersion: 1,
        tool: "fiche",
        items: [{ fields: [{ key: "ville", label: "Ville", type: "text", value: "Paris" }] }],
      },
      { type: "inconnu", text: "ignoré" },
    ],
    medias: [{ type: "photo", url: "https://example.com/b.png" }],
  });

  expect(content.parts.map((part) => part.kind)).toEqual(["text", "image", "structured", "image"]);
  expect(content.hasStructured).toBe(true);
  expect(content.text).toContain("Riche");
  expect(content.text).not.toContain("Texte de secours");

  const fallback = MultimodalContent.from({
    content: "Texte de secours",
    blocks: [{ type: "future", contractVersion: 99, text: "non compris" }],
  });
  expect(fallback.parts.map((part) => part.kind)).toEqual(["text"]);
  expect(fallback.text).toBe("Texte de secours");

  const disabled = MultimodalContent.from({
    content: "Texte de secours",
    blocks: [{ type: "text", text: "Riche" }],
  }, { generated: false });
  expect(disabled.text).toBe("Texte de secours");
});

it("rend les résultats d'outils typés et la signature d'un message", () => {
  const ctx = chatContext();
  ctx.state.messages = [{
    id: "gen1",
    role: "assistant",
    authorName: "Recherche interne",
    content: "Ce texte ne doit pas être affiché",
    blocks: [{
      type: "tool_search_result",
      contractVersion: 1,
      tool: "fiche",
      layout: "card",
      items: [{
        fields: [
          { key: "ville", label: "Ville", type: "select", value: "Paris" },
          { key: "tags", label: "Tags", type: "multi", value: ["IA", "PME"] },
          { key: "site", label: "Site", type: "url", value: "https://example.com" },
        ],
      }],
      meta: { total: 1 },
    }],
    medias: [],
    at: "2026-01-01T00:00:00.000Z",
  }];
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".msg-author")?.textContent).toBe("Recherche interne");
  expect(root.querySelector(".gen-result")?.getAttribute("data-onir-region")).toBe("contenu_genere");
  expect(root.querySelector(".gen-tool")?.textContent).toBe("fiche");
  expect([...root.querySelectorAll(".gen-badge")].map((node) => node.textContent)).toEqual(["Paris", "IA", "PME"]);
  expect(root.querySelector("a.gen-link")?.getAttribute("href")).toBe("https://example.com");
  expect(root.textContent).not.toContain("Ce texte ne doit pas être affiché");
});

it("respecte afficher_contenu_genere=false", () => {
  const ctx = createMockContext({
    params: { afficher_contenu_genere: false },
    state: {
      phase: "chat",
      messages: [{
        id: "gen2",
        role: "assistant",
        content: "Secours",
        blocks: [{ type: "text", text: "Riche" }],
        medias: [],
        at: "2026-01-01T00:00:00.000Z",
      }],
    },
  });
  const { el } = mount(ctx);
  const root = el.shadowRoot;
  expect(root.querySelector(".gen-result")).toBeNull();
  expect(root.textContent).toContain("Secours");
});

it("gère la phase otp (demande puis vérification du code)", async () => {
  const ctx = createMockContext({
    state: { phase: "otp", status: "en_cours", messages: [], typing: false },
    consent: { texte: "J'accepte", lien: "https://example.com/confidentialite" },
  });
  ctx.actions.requestOtp = async () => ({ challengeId: "c1", transport: "platform" });
  let verified = null;
  ctx.actions.verifyOtp = async (data) => { verified = data; };
  const { el } = mount(ctx);
  const root = el.shadowRoot;

  expect(root.querySelector(".otp h3")?.textContent).toBe("Vérifions votre email");

  await act(async () => {
    const form = root.querySelector(".otp form");
    form.querySelector('input[name="email"]').value = "alice@example.fr";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(root.querySelector(".otp h3")?.textContent).toBe("Code envoyé");
  expect(root.textContent).toContain("alice@example.fr");

  await act(async () => {
    const form = root.querySelector(".otp form");
    form.querySelector('input[name="code"]').value = "123456";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(verified).toEqual({ challengeId: "c1", code: "123456" });
});

it("centralise tous les formats dans un seul registre", () => {
  // Les anciens modules restent des façades : aucune API n'est cassée.
  expect(resolveBlock).toBe(resolveBlockCentral);
  expect(legacyPartViewType).toBe(partViewType);
  expect(CONTENT_FORMATS.map((format) => format.partKey)).toEqual([
    "text", "image", "audio", "video", "file", "link",
    "structured", "structured:tool_search_result",
  ]);
  expect(partViewType({ kind: "structured", block: { type: "tool_search_result" } })).toBe("tool-result");
  expect(partViewType({ kind: "structured", block: { type: "future" } })).toBe("block-fallback");
});

it("étend le registre central sans toucher à MessageView", () => {
  registerFormat({
    key: "custom_weather",
    partKey: "structured:custom_weather",
    block: "custom_weather",
    resolver: (block) => ({ type: "custom_weather", text: `Météo ${block.ville}` }),
    view: "block-fallback",
  });

  expect(resolveBlock({ type: "custom_weather", ville: "Paris" })).toEqual({
    type: "custom_weather",
    text: "Météo Paris",
  });
  expect(partViewType({ kind: "structured", block: { type: "custom_weather" } })).toBe("block-fallback");
});
