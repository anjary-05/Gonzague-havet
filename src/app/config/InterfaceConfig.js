// Toute la personnalisation fonctionnelle est déclarée ici sous forme de données.
// Le moteur et les vues ne contiennent pas de valeurs métier en dur.
export const INTERFACE_MODES = [
  "conversation", "visuel", "media", "application", "donnees", "exploration", "voix",
];

export const INTERFACE_ACTIONS = ["display", "present", "open", "launch", "confirm"];

export const INTERFACE_COMPONENTS = [
  "gallery", "media", "form", "dataTable", "chart", "resources", "actions", "app",
];

export const DEFAULT_INTERFACE_LABELS = {
  conversation: "Conversation",
  visuel: "Visuel",
  media: "Média",
  application: "Application",
  donnees: "Données",
  exploration: "Exploration",
  voix: "Voix",
  confirmer: "Confirmer",
  annuler: "Annuler",
  non_disponible: "Ressource non disponible dans cette interface",
  ouvrir: "Ouvrir",
};

export const RESOURCE_FILTERS = [
  { id: "photos", kind: "photo" },
  { id: "liens", kind: "lien" },
];

export const ACTION_COMMANDS = [
  { id: "ouvrir_formulaire", capability: "modelForm", action: "openCollectionForm" },
  { id: "galerie", capability: "media", action: "openMedia" },
  { id: "terminer", capability: null, action: "finish" },
];

export const WELCOME_ACTIONS = [
  { id: "rdv", urlParam: "url_rdv", labelParam: "libelle_rdv_bulle" },
  { id: "whatsapp", urlParam: "url_whatsapp", labelParam: "libelle_whatsapp_bulle" },
];

export const CONTACT_LINKS = [
  { id: "whatsapp", kind: "external", urlParam: "url_whatsapp", labelParam: "libelle_whatsapp" },
  { id: "telephone", kind: "tel", valueParam: "telephone", labelParam: "telephone" },
  { id: "rdv", kind: "external", urlParam: "url_rdv", labelParam: "libelle_rdv" },
];

export const VISIBILITY_RULES = [
  { key: "afficher_avatar", path: "avatar.visible" },
  { key: "afficher_badge", path: "header.visible_badge" },
  { key: "afficher_statut", path: "header.visible_statut" },
  { key: "afficher_horodatage", path: "message.visible_horodatage" },
  { key: "afficher_boutons_accueil", path: "message.visible_boutons" },
  { key: "afficher_frappe", path: "frappe.visible" },
  { key: "afficher_sources", path: "sources.visible" },
  { key: "afficher_fin", path: "fin.visible" },
];

export const AVATAR_SHAPES = {
  rond: "50%",
  carre: "0px",
  arrondi: "12px",
};

export const DEFAULT_ALTERNATIVE =
  "Vous pouvez poursuivre la conversation ou consulter les ressources disponibles.";

export const DEFAULT_CHIPS = [
  "Parcours & Vision",
  "Accompagnement PME / ETI",
  "Territoires d’intervention",
];

export const DEFAULT_WELCOME =
  "Bonjour ! Je suis l’assistant conversationnel IA de Gonzague Havet. Je réponds à vos questions sur ses expertises, ses territoires d’intervention (France, Maroc, Madagascar) ou pour préparer un échange direct avec lui.";

export const DEFAULT_ACCEPT = "image/*,audio/*,application/pdf,text/*";
