#!/usr/bin/env node
// Contrôle navigateur du template avec le harness lancé (`npm run dev`).
// Vérifie : montage Shadow DOM, identité → chat, envoi → typing → réponse,
// finish → finalisée, surface widget, absence de pageerror.
import puppeteer from "puppeteer-core";

const BASE = process.env.HARNESS_URL || "http://localhost:4500";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PAGE_ELEMENT = "onirtech-template-chatbot-expert-ia";
const WIDGET_ELEMENT = "onirtech-template-chatbot-expert-ia-widget";

const waitFor = (page, selector, element = PAGE_ELEMENT) =>
  page.waitForFunction(
    (sel, tag) => Boolean(document.querySelector(tag)?.shadowRoot?.querySelector(sel)),
    { timeout: 15000 },
    selector,
    element,
  );

const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("favicon.ico")) {
      errors.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    const location = message.location()?.url || "";
    if (message.type() === "error" && !location.includes("favicon.ico") && !message.text().includes("favicon.ico")) {
      errors.push(`console: ${message.text()} (${location})`);
    }
  });

  await page.goto(`${BASE}/?phase=identity`, { waitUntil: "networkidle0" });
  await waitFor(page, ".identity form");
  const identityText = await page.$eval(PAGE_ELEMENT, (el) => el.shadowRoot.textContent);
  if (!identityText.includes("Gonzague Havet (IA)") || !identityText.includes("IA DIRECTE")) {
    throw new Error("en-tête shadcn absent du Shadow DOM");
  }
  console.log("✓ montage du Custom Element et du formulaire d'identité");

  await page.evaluate((tag) => {
    const root = document.querySelector(tag).shadowRoot;
    root.querySelector('input[name="nom"]').value = "Alice";
    root.querySelector('input[name="email"]').value = "alice@example.fr";
    root.querySelector('input[name="consentement"]').checked = true;
    root.querySelector(".identity form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, PAGE_ELEMENT);
  await waitFor(page, ".thread");
  console.log("✓ identité → chat");

  await page.evaluate((tag) => {
    const root = document.querySelector(tag).shadowRoot;
    const input = root.querySelector("#input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Parlez-moi de votre parcours");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    root.querySelector("#form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, PAGE_ELEMENT);
  await waitFor(page, ".typing");
  await page.waitForFunction(
    (tag) => document.querySelector(tag)?.shadowRoot?.textContent?.includes("(mock) Merci, noté"),
    { timeout: 15000 },
    PAGE_ELEMENT,
  );
  console.log("✓ envoi → typing → réponse");

  // Conversation multimodale : Markdown interprété + image de média.
  const conversation = await page.evaluate((tag) => {
    const root = document.querySelector(tag).shadowRoot;
    return {
      heading: root.querySelector(".md h3")?.textContent || "",
      strong: root.querySelector(".md strong")?.textContent || "",
      code: root.querySelector(".md pre code")?.textContent || "",
      image: root.querySelector("img.m-img")?.getAttribute("alt") || "",
      link: root.querySelector("a.md-link")?.getAttribute("href") || "",
    };
  }, PAGE_ELEMENT);
  if (conversation.heading !== "Réponse (mock)") {
    throw new Error(`titre Markdown non rendu : ${conversation.heading}`);
  }
  if (!conversation.strong.includes("Parlez-moi de votre parcours")) {
    throw new Error(`gras Markdown non rendu : ${conversation.strong}`);
  }
  if (!conversation.code.includes("const multimodal = true;")) {
    throw new Error("bloc de code Markdown non rendu");
  }
  if (!conversation.image) throw new Error("image multimodale non rendue");
  if (conversation.link !== "https://example.com/doc") {
    throw new Error(`lien Markdown non rendu : ${conversation.link}`);
  }
  console.log("✓ Markdown et contenu multimodal rendus");

  // Blocs ordonnés ADR-0067 : signatures d'outils et champs typés.
  const generated = await browser.newPage();
  generated.on("pageerror", (error) => errors.push(`generated pageerror: ${error.message}`));
  await generated.goto(`${BASE}/?phase=chat`, { waitUntil: "networkidle0" });
  await waitFor(generated, ".gen-result");
  const generative = await generated.evaluate((tag) => {
    const root = document.querySelector(tag).shadowRoot;
    return {
      author: root.querySelector(".msg-author")?.textContent || "",
      tool: root.querySelector(".gen-tool")?.textContent || "",
      badges: [...root.querySelectorAll(".gen-badge")].map((node) => node.textContent),
      link: root.querySelector("a.gen-link")?.getAttribute("href") || "",
      fallbackVisible: root.textContent.includes("Ce texte de secours ne doit pas remplacer les blocs."),
    };
  }, PAGE_ELEMENT);
  if (generative.author !== "Recherche (mock)" || generative.tool !== "fiche_mock") {
    throw new Error(`blocs ADR-0067 non rendus : ${JSON.stringify(generative)}`);
  }
  if (generative.badges.join(",") !== "Paris,IA,PME") {
    throw new Error(`champs typés non rendus : ${generative.badges.join(",")}`);
  }
  if (generative.link !== "https://example.com/doc" || generative.fallbackVisible) {
    throw new Error("lien typé ou secours de bloc incorrect");
  }
  console.log("✓ blocs ADR-0067 et champs typés rendus");

  // Identification par code (phase `otp` du contrat hôte).
  const otpPage = await browser.newPage();
  otpPage.on("pageerror", (error) => errors.push(`otp pageerror: ${error.message}`));
  await otpPage.goto(`${BASE}/?phase=otp`, { waitUntil: "networkidle0" });
  await waitFor(otpPage, ".otp form");
  await otpPage.evaluate((tag) => {
    const form = document.querySelector(tag).shadowRoot.querySelector(".otp form");
    form.querySelector('input[name="email"]').value = "alice@example.fr";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, PAGE_ELEMENT);
  await otpPage.waitForFunction(
    (tag) => document.querySelector(tag)?.shadowRoot?.textContent?.includes("Code envoyé"),
    { timeout: 15000 },
    PAGE_ELEMENT,
  );
  await otpPage.evaluate((tag) => {
    const form = document.querySelector(tag).shadowRoot.querySelector(".otp form");
    form.querySelector('input[name="code"]').value = "123456";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, PAGE_ELEMENT);
  await waitFor(otpPage, ".thread");
  console.log("✓ phase otp : code demandé puis vérifié");

  await page.evaluate((tag) => {
    document.querySelector(tag).shadowRoot.querySelector(".finish").click();
  }, PAGE_ELEMENT);
  await page.waitForFunction(
    (tag) => document.querySelector(tag)?.shadowRoot?.textContent?.includes("Discussion finalisée"),
    { timeout: 15000 },
    PAGE_ELEMENT,
  );
  console.log("✓ finish → statut finalisé");

  const widget = await browser.newPage();
  widget.on("pageerror", (error) => errors.push(`widget pageerror: ${error.message}`));
  await widget.goto(`${BASE}/?phase=chat&surface=widget`, { waitUntil: "networkidle0" });
  await waitFor(widget, '.app[data-surface="widget"] .launcher', WIDGET_ELEMENT);
  await widget.evaluate((tag) => {
    document.querySelector(tag).shadowRoot.querySelector(".launcher").click();
  }, WIDGET_ELEMENT);
  await waitFor(widget, '.app[data-surface="widget"] .widget', WIDGET_ELEMENT);
  console.log("✓ surface widget : lanceur fermé puis ouverture");

  // Paramètres visuels structurés + avatar image + visibilité, dans un vrai Chrome.
  const styled = await browser.newPage();
  styled.on("pageerror", (error) => errors.push(`styled pageerror: ${error.message}`));
  const avatar = encodeURIComponent(`${BASE}/favicon.ico`);
  await styled.goto(
    `${BASE}/?phase=chat&avatar_image=${avatar}&afficher_badge=0`,
    { waitUntil: "networkidle0" },
  );
  await waitFor(styled, ".widget", PAGE_ELEMENT);
  const visual = await styled.evaluate((tag) => {
    const app = document.querySelector(tag).shadowRoot.querySelector(".app");
    return {
      avatarSrc: app.querySelector('header img.avatar-img')?.getAttribute("src") || "",
      badge: Boolean(app.querySelector('[data-onir-region="badge"]')),
      widgetBg: app.style.getPropertyValue("--widget-bg"),
      avatarSize: app.style.getPropertyValue("--avatar-size"),
      sendBg: app.style.getPropertyValue("--send-bg"),
      navBg: getComputedStyle(app.querySelector("nav")).backgroundColor,
    };
  }, PAGE_ELEMENT);
  if (visual.avatarSrc !== `${BASE}/favicon.ico`) {
    throw new Error(`avatar image non appliqué : ${visual.avatarSrc}`);
  }
  if (visual.badge) throw new Error("le badge devait être masqué par afficher_badge=0");
  if (!visual.widgetBg || !visual.avatarSize || !visual.sendBg) {
    throw new Error("les tokens de apparence ne sont pas appliqués");
  }
  if (visual.navBg === "rgba(0, 0, 0, 0)") {
    throw new Error("la couleur de navigation calculée est transparente");
  }
  console.log("✓ avatar image, visibilité et tokens apparence appliqués");

  // Interface agentique : instruction structurée + chargement de données.
  const agentPage = await browser.newPage();
  agentPage.on("pageerror", (error) => errors.push(`agent pageerror: ${error.message}`));
  await agentPage.goto(
    `${BASE}/?phase=chat&agent=1&afficher_indicateur_mode=1`,
    { waitUntil: "networkidle0" },
  );
  await waitFor(agentPage, ".widget", PAGE_ELEMENT);
  await agentPage.waitForFunction(
    (tag) => document.querySelector(tag)?.shadowRoot?.textContent?.includes("Activité (mock)"),
    { timeout: 15000 },
    PAGE_ELEMENT,
  );
  const agentVisual = await agentPage.evaluate((tag) => {
    const app = document.querySelector(tag).shadowRoot.querySelector(".app");
    return {
      mode: app.querySelector('[data-onir-region="mode"]')?.textContent || "",
      table: Boolean(app.querySelector(".data-table")),
      rows: app.querySelectorAll(".data-table tbody tr").length,
    };
  }, PAGE_ELEMENT);
  if (!agentVisual.mode.includes("Données")) throw new Error(`mode actif incorrect : ${agentVisual.mode}`);
  if (!agentVisual.table || agentVisual.rows === 0) throw new Error("tableau de données non rendu");
  console.log("✓ interface agentique et chargement de données");

  if (errors.length) {
    console.error(`✗ erreurs navigateur :\n - ${errors.join("\n - ")}`);
    process.exitCode = 1;
  } else {
    console.log("✓ aucun pageerror (hors favicon.ico)");
  }
} finally {
  await browser.close();
}
