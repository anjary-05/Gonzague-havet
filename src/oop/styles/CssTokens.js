import {
  DARK, LEGACY_CSS_VARS, LIGHT, THEME_ALIASES,
} from "../../constants/Palette.js";
import { AVATAR_SHAPES } from "../../app/config/InterfaceConfig.js";
import { asNumber, asText } from "../../utils/format.js";

const LAUNCHER_DEFAULT = "#4f46e5";

// Toute la charte est un objet de tokens : la vue ne contient aucune couleur en dur.
class CssTokenService {
  constructor({ params = {}, hostTheme = {}, canTheme = false, dark = false, largeur = 480, hauteur = 640, avatarForme = "rond", voirIcones = true, styleIcones = "traits", controller = null }) {
    this.params = params;
    this.hostTheme = hostTheme;
    this.canTheme = canTheme;
    this.dark = dark;
    this.largeur = largeur;
    this.hauteur = hauteur;
    this.avatarForme = avatarForme;
    this.voirIcones = voirIcones;
    this.styleIcones = styleIcones;
    this.controller = controller;
    this.style = {};
  }

  param(key, fallback) {
    const value = this.params?.[key];
    return value === undefined || value === null ? fallback : value;
  }

  appearance(path, fallback) {
    if (this.controller && typeof this.controller.appearance === "function") {
      return this.controller.appearance(path, fallback);
    }
    let node = this.params?.apparence;
    for (const part of path.split(".")) {
      if (node === null || typeof node !== "object" || !(part in node)) return fallback;
      node = node[part];
    }
    return node === undefined || node === null ? fallback : node;
  }

  appText(path, fallback) {
    return asText(this.appearance(path, fallback), fallback);
  }

  appNumber(path, fallback) {
    return asNumber(this.appearance(path, fallback), fallback, -10000, 10000);
  }

  appBool(path, fallback) {
    const value = this.appearance(path, fallback);
    return typeof value === "boolean" ? value : fallback;
  }

  build() {
    const tokens = { ...(this.dark ? DARK : LIGHT) };

    this.style = {
      "--bg": tokens.bg,
      "--fg": tokens.fg,
      "--card": tokens.card,
      "--primary": tokens.primary,
      "--primary-fg": tokens.primaryFg,
      "--secondary": tokens.secondary,
      "--secondary-fg": tokens.secondaryFg,
      "--muted": tokens.muted,
      "--muted-fg": tokens.mutedFg,
      "--accent": tokens.accent,
      "--border": tokens.border,
      "--ring": tokens.ring,
      "--ink": tokens.ink,
      "--mist": tokens.mist,
      "--success": tokens.success,
      "--whatsapp": tokens.whatsapp,
      "--page": tokens.page,
      "--widget-width": `${this.largeur}px`,
      "--widget-height": `${this.hauteur}px`,
    };

    if (this.canTheme && this.hostTheme && typeof this.hostTheme === "object") {
      Object.entries(this.hostTheme).forEach(([key, value]) => {
        const token = THEME_ALIASES[key];
        const cssVar = token ? LEGACY_CSS_VARS[token] : null;
        if (cssVar && typeof value === "string" && value !== "") this.style[cssVar] = value;
      });
    }

    // Mode sombre : re-forcer les tokens de base avec les valeurs sombres.
    // Le thème de l'hôte (clair) écrase sinon `--fg`/`--card`/`--accent`/...,
    // rendant textes et survols invisibles (noir sur noir) en mode nuit.
    // Les clés équivalentes restent personnalisables via le groupe `sombre`.
    if (this.dark) {
      this.style["--bg"] = this.appText("sombre.saisie_fond", tokens.bg);
      this.style["--fg"] = this.appText("sombre.message_texte", tokens.fg);
      this.style["--card"] = this.appText("sombre.champ_fond", tokens.card);
      this.style["--primary"] = this.appText("sombre.message_utilisateur_fond", tokens.primary);
      this.style["--primary-fg"] = tokens.primaryFg;
      this.style["--secondary"] = this.appText("sombre.bouton_fond", tokens.secondary);
      this.style["--secondary-fg"] = this.appText("sombre.bouton_texte", tokens.secondaryFg);
      this.style["--muted"] = tokens.muted;
      this.style["--muted-fg"] = this.appText("sombre.texte_attenue", tokens.mutedFg);
      this.style["--accent"] = this.appText("sombre.nav_fond", tokens.accent);
      this.style["--border"] = this.appText("sombre.bordure", tokens.border);
      this.style["--ring"] = tokens.ring;
      this.style["--ink"] = tokens.ink;
      this.style["--mist"] = tokens.mist;
      this.style["--success"] = tokens.success;
      this.style["--whatsapp"] = tokens.whatsapp;
      this.style["--page"] = this.appText("sombre.page", tokens.page);
    }

    this.color("page.fond", "--page-bg", tokens.page, "page");
    this.num("page.marge_verticale", "--page-py", 24);
    this.num("page.marge_laterale", "--page-px", 12);
    this.color("widget.fond", "--widget-bg", tokens.bg, "widget");
    this.color("widget.bordure", "--widget-border", tokens.border, "bordure");
    this.num("widget.largeur_bordure", "--widget-border-width", 1);
    this.num("widget.rayon", "--widget-radius", 22);
    this.str("widget.ombre", "--widget-shadow", "0 24px 60px rgba(30, 27, 58, 0.28)");

    this.color("header.debut", "--header-start", tokens.ink, "header_debut");
    this.color("header.fin", "--header-end", tokens.mist, "header_fin");
    this.color("header.texte", "--header-fg", "#ffffff", "header_texte");
    this.str("header.texte_statut", "--header-status-fg", "rgba(255, 255, 255, 0.72)");
    this.num("header.taille_titre", "--header-title-size", 17);
    this.num("header.taille_statut", "--header-status-size", 13);
    this.color("header.point_couleur", "--status-dot", tokens.success);
    this.num("header.point_taille", "--status-dot-size", 10);
    this.str("header.fond_badge", "--badge-bg", "rgba(255, 255, 255, 0.15)");
    this.str("header.bordure_badge", "--badge-border", "rgba(255, 255, 255, 0.25)");
    this.color("header.texte_badge", "--badge-fg", "#ffffff");
    this.num("header.taille_badge", "--badge-size", 11);
    this.num("header.rayon_badge", "--badge-radius", 7);

    this.num("avatar.taille", "--avatar-size", 56);
    this.num("avatar.taille_message", "--avatar-msg-size", 36);
    this.color("avatar.fond", "--avatar-bg", tokens.secondary, "avatar_fond");
    this.color("avatar.texte", "--avatar-fg", tokens.secondaryFg, "avatar_texte");
    this.num("avatar.taille_texte", "--avatar-font-size", 18);
    this.num("avatar.taille_texte_message", "--avatar-msg-font-size", 12);
    this.num("avatar.bordure_largeur", "--avatar-border-width", 2);
    this.color("avatar.bordure_couleur", "--avatar-border-color", "#ffffff");
    this.style["--avatar-radius"] = AVATAR_SHAPES[this.avatarForme] ?? AVATAR_SHAPES.rond;
    this.style["--avatar-shadow"] = this.appBool("avatar.ombre_active", true)
      ? "0 0 0 var(--avatar-border-width) var(--avatar-border-color)"
      : "none";

    this.color("nav.fond", "--nav-bg", tokens.accent, "nav_fond");
    this.num("nav.opacite", "--nav-opacity", 0.75, "");
    this.color("nav.texte", "--nav-fg", tokens.fg, "nav_texte");
    this.num("nav.taille_texte", "--nav-font-size", 13.5);
    this.num("nav.espacement", "--nav-gap", 8);
    this.num("nav.marge_laterale", "--nav-px", 16);
    this.color("nav.couleur_whatsapp", "--nav-whatsapp", tokens.whatsapp);
    this.num("nav.rayon_lien", "--nav-link-radius", 6);

    this.color("message.fond", "--msg-bg", tokens.card, "message_fond");
    this.color("message.texte", "--msg-fg", tokens.fg, "message_texte");
    this.color("message.fond_utilisateur", "--msg-user-bg", tokens.primary, "message_utilisateur_fond");
    this.color("message.texte_utilisateur", "--msg-user-fg", tokens.primaryFg);
    this.num("message.rayon", "--msg-radius", 18);
    this.num("message.marge_interne", "--msg-pad", 16);
    this.num("message.largeur_max", "--msg-max-width", 85, "%");
    this.num("message.taille_texte", "--msg-font-size", 15);
    this.num("message.interligne", "--msg-line-height", 1.6, "");
    this.num("message.espacement", "--msg-gap", 16);
    this.str("message.ombre", "--msg-shadow", "0 1px 3px rgba(30, 27, 58, 0.1)");
    this.color("message.heure_couleur", "--time-fg", tokens.mutedFg, "texte_attenue");
    this.num("message.heure_taille", "--time-size", 12);

    this.color("bouton.fond", "--btn-bg", tokens.secondary, "bouton_fond");
    this.color("bouton.texte", "--btn-fg", tokens.secondaryFg, "bouton_texte");
    this.color("bouton.bordure", "--btn-border", tokens.border, "bordure");
    this.num("bouton.rayon", "--btn-radius", 9);
    this.num("bouton.hauteur", "--btn-height", 36);
    this.num("bouton.taille_texte", "--btn-font-size", 14);

    this.color("suggestions.fond", "--chips-bg", tokens.muted);
    this.num("suggestions.opacite", "--chips-opacity", 0.7, "");
    this.color("suggestions.texte", "--chips-fg", tokens.mutedFg, "texte_attenue");
    this.color("suggestions.fond_puce", "--chip-bg", tokens.card, "champ_fond");
    this.color("suggestions.texte_puce", "--chip-fg", tokens.mutedFg, "texte_attenue");
    this.color("suggestions.bordure_puce", "--chip-border", tokens.border, "bordure");
    this.num("suggestions.rayon_puce", "--chip-radius", 999);
    this.num("suggestions.hauteur_puce", "--chip-height", 44);
    this.num("suggestions.taille_puce", "--chip-font-size", 15);

    this.color("saisie.fond_champ", "--input-bg", tokens.card, "champ_fond");
    this.color("saisie.texte", "--input-fg", tokens.fg);
    this.color("saisie.placeholder", "--input-placeholder", tokens.mutedFg, "texte_attenue");
    this.color("saisie.bordure", "--input-border", tokens.border, "bordure");
    this.num("saisie.rayon_champ", "--input-radius", 14);
    this.num("saisie.hauteur_champ", "--input-height", 48);
    this.num("saisie.taille_texte", "--input-font-size", 15);
    this.color("saisie.couleur_icone", "--icon-fg", tokens.mutedFg, "texte_attenue");
    this.color("saisie.fond_envoi", "--send-bg", tokens.primary);
    this.color("saisie.texte_envoi", "--send-fg", tokens.primaryFg);
    this.num("saisie.taille_envoi", "--send-size", 48);
    this.num("saisie.opacite_desactive", "--disabled-opacity", 0.55, "");
    this.color("pj.fond", "--tray-bg", tokens.card, "champ_fond");
    this.color("pj.bordure", "--tray-border", tokens.border, "bordure");
    this.color("pj.texte", "--tray-fg", tokens.fg, "message_texte");
    this.num("pj.rayon", "--tray-radius", 12);
    this.num("pj.taille_image", "--tray-img-size", 36);
    this.color("pj.couleur_supprimer", "--tray-remove-fg", tokens.mutedFg, "texte_attenue");

    this.color("frappe.couleur", "--typing-fg", tokens.mutedFg, "texte_attenue");
    this.num("frappe.taille_point", "--typing-size", 6);
    this.num("frappe.vitesse", "--typing-speed", 1, "s");
    this.num("identite.taille_avatar", "--id-avatar-size", 64);
    this.color("identite.fond_avatar", "--id-avatar-bg", tokens.secondary, "avatar_fond");
    this.color("identite.texte_avatar", "--id-avatar-fg", tokens.secondaryFg, "avatar_texte");
    this.num("identite.taille_titre", "--id-title-size", 18);
    this.color("identite.texte_description", "--id-text-fg", tokens.mutedFg, "texte_attenue");
    this.color("identite.fond_champ", "--id-input-bg", tokens.card, "champ_fond");
    this.color("identite.bordure_champ", "--id-input-border", tokens.border, "bordure");
    this.num("identite.rayon_champ", "--id-input-radius", 12);
    this.num("identite.hauteur_champ", "--id-input-height", 46);
    this.color("identite.fond_bouton", "--id-btn-bg", tokens.primary);
    this.color("identite.texte_bouton", "--id-btn-fg", tokens.primaryFg);
    this.num("identite.rayon_bouton", "--id-btn-radius", 14);
    this.num("identite.hauteur_bouton", "--id-btn-height", 48);
    this.color("identite.accent_case", "--id-check-accent", tokens.primary);
    this.color("galerie.fond", "--gallery-bg", tokens.bg, "saisie_fond");
    this.color("galerie.bordure", "--gallery-border", tokens.border, "bordure");
    this.num("galerie.taille_miniature", "--gallery-thumb-size", 52);
    this.num("galerie.rayon_miniature", "--gallery-thumb-radius", 10);
    this.color("fin.couleur", "--finish-fg", tokens.mutedFg, "texte_attenue");
    this.num("fin.taille_texte", "--finish-font-size", 13);
    this.num("fin.taille_icone", "--finish-icon-size", 14);
    this.color("lanceur.fond", "--launcher-bg", tokens.primary);
    this.color("lanceur.texte", "--launcher-fg", tokens.primaryFg);
    this.num("lanceur.taille", "--launcher-size", 60);
    this.str("lanceur.ombre", "--launcher-shadow", "0 0 0 4px rgba(99, 102, 241, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.25)");
    // Dégradé de marque par défaut. Dès que le lanceur est personnalisé
    // (couleur simple ou apparence.lanceur.fond), on utilise sa couleur solide
    // pour que le réglage ait un effet réel.
    const launcherBg = this.style["--launcher-bg"];
    this.style["--launcher-gradient"] =
      launcherBg && launcherBg !== LAUNCHER_DEFAULT
        ? `linear-gradient(135deg, ${launcherBg} 0%, ${launcherBg} 100%)`
        : "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)";
    this.color("sources.couleur", "--sources-fg", tokens.mutedFg, "texte_attenue");
    this.num("sources.taille_texte", "--sources-font-size", 12);

    this.color("agent.fond_carte", "--agent-card-bg", tokens.card, "champ_fond");
    this.color("agent.bordure_carte", "--agent-card-border", tokens.border, "bordure");
    this.num("agent.rayon_carte", "--agent-card-radius", 14);
    this.color("agent.texte_carte", "--agent-card-fg", tokens.fg, "message_texte");
    this.color("agent.fond_mode", "--agent-mode-bg", tokens.secondary, "bouton_fond");
    this.color("agent.texte_mode", "--agent-mode-fg", tokens.secondaryFg, "bouton_texte");
    this.num("agent.rayon_mode", "--agent-mode-radius", 999);
    this.num("agent.taille_mode", "--agent-mode-size", 11);
    this.str("agent.fond_confirm", "--agent-confirm-bg", "rgba(30, 27, 58, 0.35)");
    this.color("agent.fond_dialogue", "--agent-dialog-bg", tokens.card, "champ_fond");
    this.color("agent.texte_dialogue", "--agent-dialog-fg", tokens.fg, "message_texte");
    this.color("agent.fond_table", "--agent-table-bg", tokens.bg, "saisie_fond");
    this.color("agent.bordure_table", "--agent-table-border", tokens.border, "bordure");
    this.num("agent.taille_table", "--agent-table-size", 12);
    this.color("agent.fond_entete_table", "--agent-table-head", tokens.secondary, "bouton_fond");

    this.style["--icon-display"] = this.voirIcones ? "inline" : "none";
    this.style["--icon-fill"] = this.styleIcones === "pleins" ? "currentColor" : "none";
    this.style["--icon-stroke-width"] = this.styleIcones === "pleins" ? "0" : "2";
    return this.style;
  }

  color(path, cssVar, fallback, darkKey) {
    this.style[cssVar] = this.dark && darkKey
      ? this.appText(`sombre.${darkKey}`, fallback)
      : this.appText(path, fallback);
  }

  str(path, cssVar, fallback) {
    this.style[cssVar] = asText(this.appearance(path, undefined), fallback);
  }

  num(path, cssVar, fallback, unit = "px") {
    this.style[cssVar] = `${this.appNumber(path, fallback)}${unit}`;
  }
}

export function createCssTokens(options) {
  return new CssTokenService(options).build();
}
