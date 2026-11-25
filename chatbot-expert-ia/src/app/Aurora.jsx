import { useEffect, useMemo, useRef, useState } from "react";
import { useTemplate } from "@onirtech/template-sdk/react";

import { AuroraController } from "../oop/models/Controller.js";
import { mountTree } from "../oop/core/Renderer.jsx";
import { createCssTokens } from "../oop/styles/CssTokens.js";
import { InterfaceProtocolService } from "./services/InterfaceProtocolService.js";
import { buildExperienceTree } from "./builders/ExperienceTree.js";
import { PAGE_ELEMENT } from "./config/Elements.js";
import {
  AVATAR_SHAPES, DEFAULT_ACCEPT, DEFAULT_CHIPS, DEFAULT_INTERFACE_LABELS,
  DEFAULT_WELCOME, INTERFACE_MODES, VISIBILITY_RULES, WELCOME_ACTIONS,
} from "./config/InterfaceConfig.js";
import { asNumber, asObject, asText } from "../utils/format.js";

// Coquille SDK uniquement : hooks + contexte -> arbre d'objets -> renderer récursif.
// Aucun balisage statique n'est défini ici.
export function Aurora({ surfaceOverride } = {}) {
  const { ctx, phase, messages, params, capabilities, actions } = useTemplate();
  const controller = new AuroraController(ctx, surfaceOverride);
  const state = controller.state;
  const resources = controller.resources;
  const consent = controller.consent;
  const surface = controller.surface.name;
  const statusFinalisee = state.status === "finalisee";
  const typing = Boolean(state.typing);

  const canMedia = controller.has("media");
  const canAttachments = controller.has("attachments");
  const canTheme = controller.has("theme");
  const canModelForm = controller.has("modelForm");
  const canFallback = controller.has("fallback");
  const canData = controller.has("data");

  const p = (key, fallback) => controller.param(key, fallback);
  const visible = (key) => {
    const rule = VISIBILITY_RULES.find((item) => item.key === key);
    if (p(key, true) === false) return false;
    return rule ? controller.appearance(rule.path, true) !== false : true;
  };

  const titre = asText(p("titre_chat"), "Gonzague Havet (IA)");
  const initiales = asText(p("initiales"), "GH");
  const avatarUrl = asText(p("avatar_image"), "");
  const avatarFormeBrute = p("avatar_forme", "rond");
  const avatarForme = avatarFormeBrute in AVATAR_SHAPES ? avatarFormeBrute : "rond";
  const badge = asText(p("badge"), "IA DIRECTE");
  const statut = asText(p("statut"), "Disponible · France · Maroc · Madagascar");
  const messageAccueil = asText(p("message_accueil"), DEFAULT_WELCOME);
  const libelleRdvBulle = asText(p("libelle_rdv_bulle"), "Réserver 30 min");
  const libelleWhatsappBulle = asText(p("libelle_whatsapp_bulle"), "WhatsApp direct");
  const urlRdv = asText(p("url_rdv"), "https://cal.com/gonzague-havet/30min");
  const urlWhatsapp = asText(p("url_whatsapp"), "https://wa.me/33632161919");
  const placeholder = asText(p("placeholder"), "Posez votre question à Gonzague (IA)…");
  const libelleIdentite = asText(p("libelle_identite"), "Avant de commencer");
  const libelleDemarrer = asText(p("libelle_demarrer"), "Démarrer la discussion");
  const libelleTerminer = asText(p("libelle_terminer"), "Terminer la discussion");
  const texteFinalise = asText(p("texte_finalise"), "Discussion finalisée");
  const largeur = asNumber(p("largeur_widget"), 480, 280, 720);
  const hauteur = asNumber(p("hauteur_widget"), 640, 320, 1200);

  // Surface widget : démarre fermée (lanceur) ; la surface page affiche directement.
  const [open, setOpen] = useState(surface === "page");

  // Référence sur la coquille `.app` pour mesurer la place réellement disponible.
  const appRef = useRef(null);

  // Surface widget : hauteur mesurée dynamiquement (ResizeObserver) une fois le
  // widget OUVERT, pour que la saisie ne soit jamais coupée, quel que soit
  // l'écran. Initialisée à la hauteur visée : aucun écrasement à l'ouverture
  // (l'iframe fermée fait 64 px, on ne la mesure pas).
  const [availableHeight, setAvailableHeight] = useState(hauteur);

  useEffect(() => {
    if (surface !== "widget" || !open || typeof window === "undefined") return undefined;
    const measure = () => {
      const viewport = window.innerHeight || document.documentElement?.clientHeight || 0;
      const top = appRef.current?.getBoundingClientRect?.().top ?? 0;
      const h = viewport - top;
      // L'iframe fermée (lanceur) mesure 64 px : on ignore toute mesure en
      // dessous de 160 px pour ne pas écraser le widget à l'ouverture.
      if (h >= 160) setAvailableHeight(h);
    };
    let observer = null;
    if (typeof ResizeObserver === "function" && document.documentElement) {
      observer = new ResizeObserver(measure);
      observer.observe(document.documentElement);
    }
    window.addEventListener("resize", measure);
    const vv = window.visualViewport;
    if (vv && typeof vv.addEventListener === "function") vv.addEventListener("resize", measure);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", measure);
      if (vv && typeof vv.removeEventListener === "function") vv.removeEventListener("resize", measure);
    };
  }, [surface, open, hauteur]);

  const afficherNav = p("afficher_nav") !== false;
  const afficherSujets = p("afficher_sujets") !== false;
  const afficherPJ = p("afficher_piece_jointe") !== false;
  const afficherMicro = p("afficher_micro") !== false;
  const afficherGalerie = p("afficher_galerie") === true;
  const themeMode = ["auto", "light", "dark"].includes(p("mode_theme")) ? p("mode_theme") : "auto";
  const voirAvatar = visible("afficher_avatar");
  const voirBadge = visible("afficher_badge");
  const voirStatut = visible("afficher_statut");
  const voirHorodatage = visible("afficher_horodatage");
  const voirBoutonsAccueil = visible("afficher_boutons_accueil");
  const voirFrappe = visible("afficher_frappe");
  const voirSources = visible("afficher_sources");
  const voirFin = visible("afficher_fin");
  const voirIcones = p("afficher_icones") !== false;
  const styleIcones = p("style_icones") === "pleins" ? "pleins" : "traits";

  // Détection du thème du site : classe `dark`/`light` ou attribut
  // `data-theme`/`data-mode` sur <html>. Renvoie null si le site n'en donne pas.
  const detectSiteDark = () => {
    if (typeof window === "undefined" || !document.documentElement) return null;
    const html = document.documentElement;
    const attr = html.getAttribute("data-theme") || html.getAttribute("data-mode") || "";
    const cls = typeof html.className === "string" ? html.className : "";
    if (attr === "dark" || /\bdark\b/.test(cls)) return true;
    if (attr === "light" || /\blight\b/.test(cls)) return false;
    return null;
  };

  const [siteDark, setSiteDark] = useState(detectSiteDark);
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Réagit aux changements de thème du site (classe/attribut sur <html>).
  useEffect(() => {
    if (typeof window === "undefined" || typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() => setSiteDark(detectSiteDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-mode"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemDark(Boolean(event.matches));
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  // Bascule manuelle clair/sombre (variable de clic) : `null` = suivre le mode
  // automatique (`mode_theme` + thème du site + prefers-color-scheme).
  const [themeOverride, setThemeOverride] = useState(null);
  const dark = themeOverride !== null
    ? themeOverride === "dark"
    : (themeMode === "dark" || (themeMode === "auto" && (siteDark ?? systemDark)));
  const toggleTheme = () => setThemeOverride(dark ? "light" : "dark");
  // Surface widget : la hauteur épouse l'espace réellement disponible (plafonné
  // à la hauteur visée). Surface page : hauteur nominale (le CSS la borne déjà).
  const widgetHeight = surface === "widget"
    ? Math.max(0, Math.min(hauteur, availableHeight))
    : hauteur;

  const tokenStyle = useMemo(() => createCssTokens({
    params,
    hostTheme: ctx?.theme,
    canTheme,
    dark,
    largeur,
    hauteur: widgetHeight,
    avatarForme,
    voirIcones,
    styleIcones,
    controller,
  }), [params, ctx?.theme, canTheme, dark, largeur, widgetHeight, avatarForme, voirIcones, styleIcones]);

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(() => new Set());
  const [dataResult, setDataResult] = useState(null);
  const threadRef = useRef(null);
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  const cleProtocole = asText(p("protocole_cle"), "interface_instruction");
  const modesActifs = (Array.isArray(p("modes_actifs")) ? p("modes_actifs") : INTERFACE_MODES.slice(0, 6))
    .filter((mode) => INTERFACE_MODES.includes(mode));
  const voirMode = p("afficher_indicateur_mode") === true;
  const voirCartes = p("afficher_cartes_instruction") !== false;
  const limiteTableau = asNumber(p("limite_lignes_tableau"), 5, 1, 20);
  const libelles = asObject(p("libelles_interface", {}));
  const lib = (key, fallback) => asText(libelles[key], DEFAULT_INTERFACE_LABELS[key] ?? fallback);
  const listeMessages = Array.isArray(messages) ? messages : [];

  const protocol = useMemo(() => new InterfaceProtocolService({
    state,
    messages: listeMessages,
    protocolKey: cleProtocole,
  }), [state, listeMessages, cleProtocole]);
  const instructions = useMemo(() => protocol.collect(), [protocol]);
  const dataInstruction = useMemo(() => protocol.dataInstruction(instructions), [protocol, instructions]);
  const activeMode = protocol.activeMode(instructions, p("mode_par_defaut"));
  const dataSignature = dataInstruction
    ? JSON.stringify([dataInstruction.resourceId, dataInstruction.props?.inputs ?? {}, limiteTableau])
    : "";

  useEffect(() => {
    if (!dataInstruction || !canData || typeof ctx?.data?.load !== "function") {
      setDataResult(null);
      return undefined;
    }
    let vivant = true;
    setDataResult({ status: "loading" });
    const inputs = asObject(dataInstruction.props?.inputs);
    void ctx.data
      .load("donnees_interface", {
        inputs: {
          ...inputs,
          resource_id: dataInstruction.resourceId || asText(inputs.resource_id, ""),
          limite: limiteTableau,
        },
      })
      .then((result) => {
        if (vivant) setDataResult(result || { status: "error", message: "Réponse vide" });
      })
      .catch(() => {
        if (vivant) setDataResult({ status: "error", code: "DATA_PROVIDER_ERROR", message: "Chargement impossible" });
      });
    return () => { vivant = false; };
  }, [dataSignature, canData, limiteTableau]);

  const pending = canAttachments && Array.isArray(state.pendingAttachments) ? state.pendingAttachments : [];
  const fileField = useMemo(() => {
    const fields = canModelForm && Array.isArray(resources.modelForm) ? resources.modelForm : [];
    return fields.find((field) => field?.type === "file") ?? null;
  }, [canModelForm, resources.modelForm]);
  const accept = fileField?.accept?.join?.(",") || DEFAULT_ACCEPT;
  const multiple = fileField?.maxFiles !== 1;

  const chips = useMemo(() => {
    const configured = p("sujets_suggeres");
    const list = Array.isArray(configured) ? configured : DEFAULT_CHIPS;
    return list
      .filter((item) => typeof item === "string" && item.trim() !== "")
      .slice(0, 8)
      .map((item) => item.trim());
  }, [params]);

  const menu = canFallback && state.fallback && Array.isArray(state.fallback.questions)
    ? state.fallback
    : null;
  const welcomeActions = WELCOME_ACTIONS.map((definition) => ({
    id: definition.id,
    label: asText(
      params[definition.labelParam],
      definition.id === "rdv" ? libelleRdvBulle : libelleWhatsappBulle,
    ),
    url: asText(params[definition.urlParam], definition.id === "rdv" ? urlRdv : urlWhatsapp),
  }));

  useEffect(() => { if (phase === "chat") setSubmitting(false); }, [phase]);
  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages?.length, typing, statusFinalisee]);

  function send(text, attachmentIds = []) {
    const content = String(text ?? "").trim().slice(0, 4000);
    if (typing || statusFinalisee || (!content && attachmentIds.length === 0)) return;
    if (typeof actions?.sendMessage !== "function") return;
    actions.sendMessage(content, attachmentIds.length ? attachmentIds : undefined);
    setDraft("");
  }

  async function addFiles(list) {
    if (!list || !list.length || typeof actions?.attachFile !== "function") return;
    const fieldName = fileField?.name || "piece_jointe";
    for (const file of Array.from(list)) {
      try {
        await actions.attachFile(fieldName, file);
      } catch {
        // L'hôte gère son propre bandeau d'erreur.
      }
    }
  }

  function removeAttachment(id) {
    if (typeof actions?.removeAttachment === "function") void actions.removeAttachment(id);
  }

  function closeDiscussion() {
    if (typeof actions?.closeWidget === "function") actions.closeWidget();
    setOpen(false);
  }

  function openDiscussion() {
    if (typeof actions?.openWidget === "function") actions.openWidget({ width: largeur, height: hauteur });
    // Demande explicite de hauteur à l'hôte (l'iframe passe de 64px à 640px).
    if (typeof actions?.resize === "function") actions.resize(hauteur);
    setOpen(true);
  }

  function submitIdentity(event) {
    event.preventDefault();
    if (submitting || typeof actions?.submitIdentity !== "function") return;
    const data = new FormData(event.currentTarget);
    const nom = String(data.get("nom") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (nom === "" || email === "") return;
    setSubmitting(true);
    actions.submitIdentity({
      nom,
      email,
      consentement: data.get("consentement") === "on",
    });
  }

  function submitMessage(event) {
    event.preventDefault();
    send(draft, pending.map((item) => item.id).filter(Boolean));
  }

  const shownMessages = listeMessages.length > 0
    ? listeMessages
    : [{
        id: "accueil-local",
        role: "assistant",
        content: messageAccueil,
        medias: [],
        at: new Date().toISOString(),
      }];

  const tree = buildExperienceTree({
    element: PAGE_ELEMENT,
    surface,
    dark,
    toggleTheme,
    tokenStyle,
    appRef,
    titre,
    params,
    consent,
    open,
    phase,
    statusFinalisee,
    typing,
    instructions,
    shownMessages,
    dataResult,
    pending,
    chips,
    menu,
    resources,
    actions,
    send,
    addFiles,
    removeAttachment,
    closeDiscussion,
    openDiscussion,
    submitIdentity,
    submitMessage,
    threadRef,
    fileRef,
    audioRef,
    setDraft,
    draft,
    submitting,
    confirmed,
    setConfirmed,
    resolveResources: (instruction, message) => protocol.resources(instruction, resources, message),
    voirAvatar,
    avatarUrl,
    initiales,
    voirBadge,
    badge,
    voirMode,
    modesActifs,
    activeMode,
    lib,
    voirStatut,
    statut,
    libelleIdentite,
    libelleDemarrer,
    afficherNav,
    afficherSujets,
    afficherPJ,
    afficherMicro,
    afficherGalerie,
    canMedia,
    voirHorodatage,
    voirSources,
    voirBoutonsAccueil,
    voirFrappe,
    voirCartes,
    voirFin,
    libelleTerminer,
    texteFinalise,
    placeholder,
    accept,
    multiple,
    limiteTableau,
    canData,
    canModelForm,
    welcomeActions,
    largeur,
    hauteur,
  });

  return mountTree(tree, { props: {} });
}
