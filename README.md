# Expert IA — Gonzague Havet (template Onirtech)

Template visuel **React** basé sur le HTML de référence (charte shadcn.io),
rendu fonctionnel avec `@onirtech/template-sdk` **0.2.0**.

Une seule archive fournit **les deux surfaces** :

| Surface | Custom Element | Rendu |
| --- | --- | --- |
| Page | `onirtech-template-chatbot-expert-ia` | Fond de page shadcn + widget centré 480×640, comme le HTML d’origine. |
| Widget | `onirtech-template-chatbot-expert-ia-widget` | Même interface dans le cadre flottant de l’hôte (ADR-0040). |

Le composant lit `ctx.surface` (repli : `page`) ; l’icône de fermeture et le
lanceur GH permettent d’ouvrir/fermer localement et d’appeler
`actions.openWidget()` / `actions.closeWidget()` quand l’hôte les fournit.

La surface **widget** (flottante) démarre **fermée** : elle est montée dans une
iframe de l’hôte de `closedSize` 64×64 (le lanceur), puis passe à `openSize`
480×640 au premier clic. La surface **page**, elle, affiche le widget directement.

## Démarrage

```bash
npm install
npm run dev            # harness mock + build watch -> http://localhost:4500
npm test
npm run build
npm run validate
npm run pack
npm run check:browser  # avec `npm run dev` actif
```

URLs utiles du harness :

- `http://localhost:4500/` → phase identité (formulaire + consentement).
- `http://localhost:4500/?phase=chat` → phase chat directe (rendu identique au HTML).
- `http://localhost:4500/?phase=chat&surface=widget` → surface widget.
- `http://localhost:4500/?phase=chat&fallback=1` → menu de secours.
- `http://localhost:4500/?phase=otp` → vérification par email.

L’archive est générée dans
`release/chatbot-expert-ia-1.5.1.onirtech-template`.

## Ce qui est câblé au SDK

- **Actions** : `submitIdentity`, `sendMessage(content, attachmentIds)`,
  `attachFile`, `removeAttachment`, `finish`, `selectFallback`,
  `openCollectionForm`, `openMedia`, `resize`, `openWidget`, `closeWidget`,
  `request`, `requestOtp`, `verifyOtp`.
- **Capacités déclarées** : `messages`, `media`, `theme`, `modelForm`,
  `attachments`, `userState`, `knowledge`, `fallback`, `data`.
- **Contexte utilisé** : `state.phase` (`identity`/`otp`/`chat`),
  `state.status/messages/typing/pendingAttachments/fallback`, `message.blocks`
  (ADR-0067), `message.authorName`, `resources.media/modelForm`, `consent`,
  `theme`, `surface`, `params`.
- **Aucun réseau dans le template** : aucun `fetch` ; liens WhatsApp/téléphone/
  rendez-vous conservés tels quels et ouverts via `actions.openMedia()` quand
  c’est disponible.
- **46 paramètres publics** (clés snake_case, `default` obligatoire) :
  42 paramètres simples (textes, couleurs, dimensions, visibilité, forme de
  l’avatar, style des icônes, protocole d’interface agentique, modes actifs,
  limite de tableau), les listes structurées `sujets_suggeres` et
  `modes_actifs`, et les objets structurés `apparence` (149 tokens) et
  `libelles_interface` (ADR-0095).
- **`apparence` : 149 tokens visuels** répartis en 18 groupes (`page`, `widget`,
  `header`, `avatar`, `nav`, `message`, `bouton`, `suggestions`, `saisie`, `pj`,
  `frappe`, `identite`, `galerie`, `fin`, `lanceur`, `sources`, `agent`, `sombre`) :
  couleurs, tailles, rayons, ombres, opacités, espacements et animations. Le
  groupe `sombre` pilotise la palette dark.
- **Couleurs par élément, sans priorité globale** : chaque zone inspectée ne
  montre que ses propres champs de couleur. Le bouton d’envoi possède la zone
  `bouton_envoi` et les champs `apparence.saisie.fond_envoi`,
  `apparence.saisie.texte_envoi`, `apparence.saisie.taille_envoi`. Le bouton
  Démarrer possède la zone `bouton_identite`. Les boutons d’action possèdent la
  zone `boutons_action`. Aucun paramètre `couleur_*` global ne peut les écraser.
- **Groupes explicites** : `bouton` = boutons d’action ; `saisie` = champ de
  message ; le bouton d’envoi est une zone séparée. Le lanceur personnalisé
  utilise sa couleur solide, sinon le dégradé de marque par défaut.
- **Zones d’inspection V1** (ADR-0105) : zones dédiées (`page`, `widget`,
  `header`, `contact_nav`, `thread`, `suggestions`, `composer`, `bouton_envoi`,
  `boutons_action`, `identity`, `bouton_identite`, `avatar`, `badge`, `statut`,
  `frappe`, `galerie`, `sources`, `fin`, `lanceur`, `theme`, `mode`) avec
  `data-onir-region` sur les conteneurs stables et `editor.bindings` vers des
  chemins imbriqués.
- **Identifiants** : `identificationModes: ["contact", "anonymous"]`.

## Fidélité au HTML d’origine

Éléments conservés : avatar GH, badge « IA DIRECTE », statut, bouton de
fermeture, nav WhatsApp / téléphone / 30 min, message d’accueil avec ses deux
boutons, indicateur de frappe animé, puces de sujets, plateau de pièces
jointes, boutons trombone/micro, champ, bouton d’envoi, thème clair/sombre,
safe-area, `prefers-reduced-motion` et `focus-visible`.

Les seuls ajouts visibles sont pilotés par le contrat hôte et n’apparaissent
que si l’hôte les fournit : sources de connaissances, gallery (`afficher_galerie`),
pièces jointes en attente, menu de secours et bouton discret « Terminer la
discussion » (appel à `actions.finish()`).

Le thème suit `mode_theme` (`auto` → `prefers-color-scheme`, `light`, `dark`) et
peut aussi être **basculé au clic** par le visiteur via le bouton soleil/lune
dans l’en-tête (variable de clic), qui surcharge temporairement le mode auto.

Chaque élément visuel est désormais paramétrable : avatar (image importée via
l'uploader ou initiales, forme, taille, couleurs, bordure, ombre), en-tête
(dégradé, titre, statut, badge), navigation, bulles et horodatage, boutons
d’accueil, puces de sujets, champ et bouton d’envoi, plateau de pièces jointes,
points de frappe,
écran d'identité, galerie, fin de discussion, lanceur, sources et icônes
(visibilité + style). Les glyphes SVG eux-mêmes restent ceux du HTML de
référence (aucun chargement réseau) ; leur affichage et leur style sont pilotés
par `afficher_icones` / `style_icones`.

Toute l'interface est un arbre d'objets (voir `docs/ARCHITECTURE.md`) : les
icônes et les primitives feuilles (avatar, badge, statut, pastille de mode,
points de frappe) sont des classes `UIElement` porteuses d'un **rôle** et de
**propriétés**, résolues via un catalogue enregistré (`src/oop/elements/`) —
aucune fonction ad hoc.

## Responsive (web + mobile)

Le widget s'adapte à toutes les tailles d'écran en **CSS natif moderne**
(`src/styles.css`), sans dépendance ajoutée :

- **Surface « page »** : carte flottante centrée (480×640) sur desktop ; sur
  mobile (< 640 px) elle passe en **plein écran natif** — 100 % de largeur,
  hauteur `100dvh`, coins et ombre supprimés, en-tête qui remonte derrière
  l'encoche et fond qui descend derrière l'indicateur d'accueil (`env(safe-area-*)`).
- **Surface « widget »** (iframe de l'hôte) : le cadre remplit l'iframe fourni ;
  sa hauteur est **mesurée dynamiquement** via `ResizeObserver`
  (`src/app/Aurora.jsx`) — `min(hauteur visée, espace alloué)` — pour que la
  saisie ne soit jamais coupée, quel que soit l'écran (aucune media query).
- **Container queries** (`container-type: inline-size` sur `.widget` +
  `@container (max-width: 430px)`) : le compactage interne s'applique à la
  **largeur réelle** du widget, donc dans les deux surfaces — en-tête resserré,
  barre de contact réduite aux icônes (`aria-label` préservé), espacements et
  boutons de saisie compacts.
- **Unités dynamiques** `dvh`/`svh` + `clamp()` : hauteur stable malgré la barre
  d'outils mobile, et fluidité sur très petits écrans (< 360 px).

### Défilement des carrousels (suggestions, pièces jointes, galerie)

Les rangées horizontales défilent **sans aucune barre de défilement visible**
(`scrollbar-width: none` + `::-webkit-scrollbar { display: none }` +
`-ms-overflow-style: none`), sur mobile comme sur web, via tous les moyens de
scroll :

- **drag tactile** et **trackpad** : natifs (`overflow-x: auto` + inertie iOS
  `-webkit-overflow-scrolling: touch`) ;
- **molette souris** : convertie en défilement horizontal par un écouteur natif
  non passif (`src/utils/Scroll.js`) ;
- **clavier** : `Tab` focalise chaque puce, qui se place automatiquement dans la
  zone visible ;
- `overscroll-behavior-x: contain` empêche le rebond/chaînage vers la page.

## Interface agentique (prompt multimodal)

Le template expose un protocole d’interface structurée pour que l’hôte puisse
déclencher des composants visuels sans code arbitraire :

- **Capacité `data`** (ADR-0026) + contrat `donnees_interface` ; chargement via
  `ctx.data.load("donnees_interface", { inputs })`.
- **Instruction structurée** lue dans `ctx.state.interface_instructions` (ou
  dans un message via `protocole_cle`, défaut `interface_instruction`) :
  `{ action, component, resource_id, props, state }`. Cette extension n’est pas
  dans le contrat `TemplateContext` v1 du SDK : si l’hôte ne fournit pas ce
  champ, aucune carte n’est rendue (repli inactif, sans erreur).
- **Verbes** : `display`, `present`, `open`, `launch`, `confirm`.
- **Composants** : `gallery`, `media`, `resources`, `form`, `dataTable`, `chart`,
  `actions`, `app`.
- **Modes** : `conversation`, `visuel`, `media`, `application`, `donnees`,
  `exploration`, `voix`. Le mode actif est détecté automatiquement et
  peut s’afficher dans l’en-tête (`afficher_indicateur_mode`).
- **Sécurité** : seules les ressources du contexte et les actions du contrat
  sont utilisées. Une instruction hors contrat (`action` ou `component` inconnu)
  est ignorée ; une ressource absente est annoncée avec une alternative, jamais
  simulée.

## Limites connues

- **Tokens d’apparence** : 143 des 154 variables CSS générées sont consommées par
  `src/styles.css`. 11 restent sans effet visuel direct : `--composer-bg`
  (le champ est désormais une carte flottante basée sur `--input-bg`),
  `--send-radius` (bouton d’envoi circulaire), `--chips-bg` / `--chips-fg` /
  `--chips-opacity` (bandeau de sujets transparent), `--agent-confirm-bg` et
  `--agent-dialog-bg` / `--agent-dialog-fg` (aucun élément modale/boîte de
  dialogue), `--muted` (token de base), et `--avatar-border-width` /
  `--avatar-border-color` (consommées de façon transitive via `--avatar-shadow`).
- **Protocole agentique** : `state.interface_instructions` et
  `message.interface_instruction` sont une extension locale au harness, hors du
  contrat `TemplateContext` v1 ; en production, la fonctionnalité reste inactive
  tant que l’hôte ne fournit pas ces champs.
- **`modes_actifs`** filtre la pastille de mode ; les cartes d’instruction déjà
  reçues ne sont pas rétroactivement filtrées.

## Provenance

Le skill le plus récent a été lu sur
<https://magic-panel.onir-cms.tech/documentation/skill> avant développement ;
voir `docs/PROVENANCE.md`. Le HTML d’origine n’a pas été modifié.
