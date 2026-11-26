# Architecture de rendu — instruction.txt / SDK / Skill

## Principe

`src/index.js` ne contient que l'enregistrement SDK des deux Custom Elements.
Toute l'interface est un arbre d'objets construit puis confié à un moteur récursif.
Aucun balisage statique n'est défini dans la coquille React : `src/app/Aurora.jsx`
ne fait que lire le contexte SDK, dériver le modèle, assembler l'arbre et appeler
`mountTree()`.

## Niveaux (instruction.txt §1)

| Niveau | Classe de base | Vue enregistrée |
| --- | --- | --- |
| Application / Experience | `ExperienceNode` | `ExperienceView` |
| Page | `PageNode` | `PageView` |
| Layout | `LayoutNode` | `LayoutView` |
| Section | `SectionNode` | `WidgetView`, `HeaderView`, `IdentityView`, `OtpView`, `NavView`, `ThreadView`, `GalleryView`, `ComposerView`, `LauncherView` |
| Component | `ComponentNode` | `ChipsView`, `TrayView`, `FinishView` |
| Subcomponent | `SubComponentNode` | `MessageView`, `MarkdownView`, `MediaPartView`, `ToolResultView`, `BlockFallbackView`, `TypingView`, `FinalStateView`, `Instruction*View`, `ResourceGridView`, `DataTableView`, `ChartView`, `ActionButtonsView` |
| UI Element | `UIElement` | `Icon` (catalogue `IconCatalog`), `Avatar`, `Badge`, `Status`, `ModeChip`, `TypingDots`, `ButtonElement` → `AttachButton`, `MicButton`, `SendButton` |

Les primitives feuilles vivent dans `src/oop/elements/` : chacune est une classe
héritant de `UIElement`, porte un **rôle** sémantique (`role` ARIA) et des
**propriétés**, et se rend via `renderElement()` — comme les vues, aucune d'elles
n'est une fonction ad hoc.

Les commandes de saisie illustrent l'**héritage** et l'**interface** : la base
`ButtonElement` définit l'interface commune (`isVisible()` + `renderElement()`) et
le rendu ; `AttachButton`, `MicButton` et `SendButton` en héritent et ne déclarent
que leurs propriétés. Chaque commande est masquable **indépendamment** (via son
`visible`) et porte une zone d'inspection (`data-onir-region`) dédiée : retirer
une commande n'affecte pas les autres, et le champ de message (flex) s'adapte.

## Contrat universel (§2)

`src/oop/core/UIElement.js` expose `id`, `type`, `name`, `version`, `props`,
`children`, `state`, `events`, `actions`, `styles`, `dependencies`. Les enfants
peuvent être des instances configurées ou des références résolues par le
`ComponentRegistry`.

## Composition et moteur (§3, §5)

- `src/app/builders/ExperienceTree.js` assemble page → layout → section →
  composants → sous-composants. Les props du parent sont propagées aux enfants.
- `src/oop/core/Renderer.jsx` parcourt l'arbre, résout les types enregistrés,
  propage les props, isole les erreurs et n'utilise ni `eval` ni code arbitraire.
- `src/oop/views/ViewRegistry.js` est le seul endroit à modifier pour ajouter
  une vue : le moteur central reste inchangé (§6).

## Génération assistée (§4)

Le catalogue est introspectable via le registre
(`componentRegistry.has(type)` / `componentRegistry.create(type)`). Une instruction
structurée est d'abord validée (`src/oop/models/Instruction.js`), puis un
`InstructionCardView` polymorphique choisit la vue adaptée (galerie, formulaire,
tableau, graphique, actions, confirmation imbriquée). Aucune action n'est
inventée : seules les actions du SDK sont appelées.

## Conversation multimodale et Markdown

- `src/oop/models/MarkdownDocument.js` : interpréteur Markdown sûr, sans
  dépendance et sans HTML brut. Il produit un arbre de blocs (titres, listes,
  citations, code, tableaux, images) et d'inline (gras, italique, code, liens,
  barré) consommé par la vue.
- `src/oop/models/MultimodalContent.js` : objet générique de contenu qui
  normalise un message — texte Markdown, `content[]` façon ChatGPT, `parts`,
  blocs ordonnés ADR-0067, champs historiques `medias` et `attachments` — en
  parties ordonnées `text | image | audio | video | file | link | structured`.
- `src/oop/core/ContentRegistry.js` : **registre unique des formats**. Il
  déclare en un seul endroit les résolveurs ADR-0067 (`text`, `image`,
  `tool_search_result`), les versions de contrat connues, le formatage des
  champs typés et la vue OOP de chaque partie (`markdown`, `media-part`,
  `tool-result`, `block-fallback`). Une `contractVersion` inconnue retombe sur
  `content`. `registerFormat()` ajoute un format en une seule déclaration.
- `src/oop/models/GenerativeBlock.js` et `src/oop/views/PartViewRegistry.js`
  sont conservés comme façades de compatibilité : leurs exports historiques
  (`registerBlockResolver()`, `registerPartView()`, etc.) pointent vers le
  registre central, sans casser les imports existants.
- Une nouvelle forme de contenu = une entrée dans `ContentRegistry`, jamais un
  `if` dans `MessageView` ni une modification du moteur récursif.
- `src/oop/views/MarkdownView.jsx`, `MediaPartView.jsx` et `ToolResultView.jsx`
  rendent ces parties. Le texte est toujours échappé par React, les liens
  passent par `actions.openMedia` et les URL sont revalidées
  (`isSafeMediaUrl`) : aucun `dangerouslySetInnerHTML`, aucun accès réseau.
- `MessageView` consomme `MultimodalContent` via ce registre ; la page et le
  widget partagent donc exactement le même rendu. Il affiche aussi
  `authorName` pour signer les messages produits par un outil.
- `OtpView` prend en charge la phase `otp` du contrat (`requestOtp` /
  `verifyOtp`), en complément des phases `identity` et `chat`.
- Paramètres : `afficher_markdown`, `afficher_multimodal` et
  `afficher_contenu_genere` (défaut `true`) permettent de revenir au texte brut,
  de masquer les médias ou de désactiver le rendu généré.

## Compatibilité d'installation

`tools/onirtech-template.mjs pack` n'embarque que l'arborescence active :
l'ancien dossier `chatbot-expert-ia/` est exclu. Les versions précédentes
produisaient une archive avec deux manifestes (racine et legacy), mais les
importateurs officiels ne lisent que le manifeste racine : ce dossier n'était
donc pas le bundle exécuté. La perte du Markdown, des images et des blocs
structurés venait du rendu 1.4.0, qui ignorait les champs du contrat courant.

Le diagnostic complet (différences, cause, preuves et corrections) est dans
[`docs/DIAGNOSTIC-INSTALLATION-1.4.0.md`](./DIAGNOSTIC-INSTALLATION-1.4.0.md).

## Classement des dossiers

- `src/app/config/` : données de personnalisation, noms des éléments, libellés.
- `src/app/services/` : lecture du protocole d'interface.
- `src/app/builders/` : assemblage de l'arbre.
- `src/oop/core/` : contrat, registre, renderer.
- `src/oop/models/` : contrôleur, paramètres, surface, instructions.
- `src/oop/styles/` : tokens CSS entièrement objectisés.
- `src/oop/views/` : toutes les vues dynamiques (sections, composants, sous-composants).
- `src/oop/elements/` : primitives feuilles objectisées — icônes (`Icon`, `IconCatalog`,
  `IconGlyph`) et éléments d'interface (`Avatar`, `Badge`, `Status`, `ModeChip`, `TypingDots`).
- `src/constants/`, `src/utils/` : bibliothèques classées.

## Vérifications

`npm test`, `npm run build`, `npm run validate`, `npm run pack` et
`npm run check:browser` (avec le harness) doivent tous être verts.
