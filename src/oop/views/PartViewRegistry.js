// Compatibilité : API historique des vues de parties, désormais centralisée
// dans `src/oop/core/ContentRegistry.js` avec les résolveurs de blocs.
export {
  registerPartView,
  partViewType,
  partViewProps,
  createPartView,
  partViews,
} from "../core/ContentRegistry.js";
