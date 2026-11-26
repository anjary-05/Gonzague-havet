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
