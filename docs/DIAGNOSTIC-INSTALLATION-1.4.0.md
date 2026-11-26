# Diagnostic — différence et cause des échecs de contenu après installation du template 1.4.0

**Objet.** Comprendre pourquoi les formats de conversation, les images et les contenus
structurés s’affichaient dans `onir-cms` (template de référence `template-kit/template`)
mais disparaissaient ou s’affichaient en texte brut après l’installation de
`chatbot-expert-ia@1.4.0`.

**Périmètre comparé.**

- Hôte : `RINOHeinrich1/onir-cms`, branche `main` (`src/domain/template-contract.ts`,
  `src/domain/tool-blocks.ts`, `src/components/templates/TemplateHost.tsx`,
  `src/application/use-cases/visual-templates/import-template.ts`,
  `src/application/use-cases/visual-templates/import-organization-template.ts`,
  `template-kit/template/src/`).
- Template installé : archive `chatbot-expert-ia-1.4.0.onirtech-template` et code source
  correspondant (avant les corrections de la version 1.5.0).
- Référence fonctionnelle : template fourni avec le SDK dans `onir-cms`.

---

## 1. Réponse courte

**Différence.** Le contrat de conversation de l’hôte est plus riche que le rendu
implémenté par le template 1.4.0. L’hôte transmet des messages avec `blocks`
(ADR-0067), `authorName` (ADR-0043), des phases `identity | otp | chat` et des
formats multimodiaux ; le template de référence sait les interpréter, le template
1.4.0 ne lisait que `content` (texte brut) et quelques `medias`/`attachments`.

**Cause.** C’est une **incompatibilité de version de contrat côté rendu du template**,
pas une panne de transport, d’import ou de validation SRI. Les messages arrivaient
bien, mais le template les appauvrissait : blocs d’outils ignorés, Markdown non
interprété, champs typés invisibles, nom de l’auteur absent, phase OTP non gérée.

Un second défaut, **distinct et non causal pour l’affichage**, concernait l’archive :
elle contenait un ancien template imbriqué `chatbot-expert-ia/` (v1.3.25) en plus de
la racine v1.4.0. L’importateur officiel ne charge toutefois que le manifeste racine
(voir §4) : ce dossier n’était donc pas le bundle exécuté, mais il polluait l’archive.

---

## 2. Différences détaillées

| Élément du contrat | `onir-cms` / template de référence | Template 1.4.0 installé | Effet observé |
| --- | --- | --- | --- |
| `message.blocks` (ADR-0067) | `template-kit/template/src/blocks.js` : `resolveBlock()`, versions de contrat connues `[1]`, `renderFallbackText()` ; `index.js` appelle `appendMessageBlocks()` puis rend le Markdown | Champ totalement ignoré ; seul `content` était lu | Résultats d’outils et champs typés (`tool_search_result`) absents de l’écran |
| Champs typés (`text`, `textarea`, `number` + unité, `date`, `url`, `email`, `image`, `select`, `multi`) | `src/domain/tool-blocks.ts` définit `ToolField` ; la référence rend chaque champ | Aucun rendu dédié | Données structurées réduites à du texte, quand elles n’étaient pas vides |
| `message.authorName` (ADR-0043) | `index.js` crée un `.msg-author` ; `TemplateHost.tsx` transpose `authorName` pour les messages opérateur | Champ ignoré par `MessageView` | Le nom du conseiller n’apparaissait pas |
| Markdown / contenu structuré | `renderMarkdown()` dans la référence ; fallback texte pour les blocs inconnus | `message.content` injecté directement dans un `<p>` | Titres, listes, tableaux, liens et blocs de code affichés en texte brut |
| `parts` / `content[]` / `medias` / `attachments` | Le contrat accepte plusieurs formes ; la référence gère les médias et pièces jointes | Seules les formes simples `medias` (photos) et `attachments` (libellés) étaient traitées ; `parts` et `content[]` ignorés | Images et fichiers portés par les formats récents invisibles |
| Phase `otp` | `TemplateHost.tsx` gère `identity | otp | chat` ; la référence implémente `#otpForm()` avec `requestOtp` / `verifyOtp` | Seules `identity` et `chat` existaient dans l’arbre d’expérience | Parcours OTP bloqué à l’écran d’identité |
| Version inconnue d’un bloc | `isKnownContractVersion()` + `renderFallbackText()` : repli sûr sur `content`, sans HTML brut | Aucun mécanisme de repli | Format non reconnu = rien affiché, au lieu d’un texte lisible |

---

## 3. Cause racine

Le template 1.4.0 a été construit sur une lecture **ancienne** du contrat de messages.
L’hôte, lui, a continué à évoluer : ADR-0043 (`authorName`), ADR-0067 (`blocks` et
champs typés), ADR-0040 (surface widget), ADR-0105 (régions d’édition), phase OTP.

Le flux est le suivant :

1. L’hôte valide l’archive, vérifie l’intégrité SRI, puis expose le contexte au
   Custom Element via `sanitizeTemplateContext()` (`src/domain/template-contract.ts`).
   Cette fonction **conserve bien** `blocks` et `authorName` (lignes 527 et 535).
2. Le template reçoit donc un message complet.
3. Le rendu 1.4.0 ne consomme qu’un sous-ensemble de ce message. Le reste est
   silencieusement perdu côté interface.

La panne est donc **côté template**, après l’import : l’archive est valide, le bundle
est chargé, mais il ne sait pas afficher ce que l’hôte fournit. C’est exactement pour
cela que le même conversationnel fonctionnait avec le template de référence de
`onir-cms` : celui-ci implémente le contrat courant.

### Limite côté hôte identifiée au passage

`TemplateHost.fromApiMessage()` (lignes 172-184) ne recopie pas `blocks` pour les
messages reçus en direct (API/SSE) : il ne transmet que `content`, `medias`,
`attachments` et `authorName`. Les blocs sont conservés pour l’état initial issu de
`sanitizeTemplateContext()`, mais pas pour un message diffusé en flux. Le template
doit donc **toujours** prévoir un repli sur `content` — c’est ce que fait la version
1.5.0. Cette limite n’explique pas à elle seule l’échec de la conversation initiale,
mais elle explique pourquoi certains blocs structurés ne pouvaient pas apparaître en
direct, même avec la référence.

---

## 4. Ce qui a été écarté (avec preuves)

### 4.1 L’import n’est pas en cause

`src/application/use-cases/visual-templates/import-template.ts` et
`import-organization-template.ts` lisent **uniquement** `onirtech.template.json` à la
racine de l’archive (`files.get("onirtech.template.json")`), puis l’entrée
`manifest.ui.entry` et son SRI. Le dossier imbriqué `chatbot-expert-ia/` était stocké
comme simple asset : il n’était **pas** le bundle exécuté.

> Correction d’une hypothèse antérieure : l’idée selon laquelle l’installateur
> « pouvait charger le manifeste obsolète imbriqué » est inexacte pour les deux
> importateurs officiels vérifiés. Le double manifeste reste un défaut d’emballage
> (assets dupliqués, manifeste v1.3.25 embarqué, budget de 500 fichiers consommé,
> risque de confusion), mais ce n’est pas la cause de la perte de contenu.

### 4.2 Les capacités du manifeste n’étaient pas en cause

Le manifeste déclarait déjà `messages`, `media`, `theme`, `modelForm`, `attachments`,
`userState`, `knowledge`, `fallback` et `data`. L’hôte transmettait donc bien les
champs correspondants. Le manque était dans le **consommateur** de ces champs.

### 4.3 Le SDK n’est pas en cause

Le template et l’origine utilisent tous deux `@onirtech/template-sdk@0.2.0`. Ses
typings sont en retard sur le contrat (d’où les ajouts après `defineManifest()` pour
`editor`, `identificationModes` et les paramètres `object`/`array`), mais les champs
sont bien présents à l’exécution. Ce n’est pas un problème de version de dépendance.

### 4.4 Le transport et le SRI n’étaient pas en cause

L’import vérifie `ui.integrity` et `ui.widget.integrity` avant tout stockage. Une
archive incohérente aurait été refusée avec `ValidationError`, et non affichée avec
un contenu appauvri. Le symptôme observé (interface visible, contenu manquant) est
donc postérieur à l’import.

---

## 5. Corrections appliquées

| Correction | Fichier(s) |
| --- | --- |
| Normalisation de `content`, `parts`, `blocks`, `medias`, `attachments` en parties ordonnées | `src/oop/models/MultimodalContent.js` |
| Résolveur de blocs ADR-0067, versions connues `[1]`, repli texte, extension par `registerFormat()` (alias historique `registerBlockResolver()`) | `src/oop/core/ContentRegistry.js`, `src/oop/models/GenerativeBlock.js` |
| Registre central unique : résolveurs ADR-0067 + vues des parties, avec façades de compatibilité | `src/oop/core/ContentRegistry.js`, `src/oop/models/GenerativeBlock.js`, `src/oop/views/PartViewRegistry.js`, `src/oop/views/MessageView.jsx` |
| Rendu des champs typés, image, Markdown et repli sans HTML brut | `src/oop/views/ToolResultView.jsx`, `MediaPartView.jsx`, `MarkdownView.jsx`, `BlockFallbackView.jsx` |
| `authorName` et phase `otp` (`requestOtp` / `verifyOtp`) | `src/oop/views/MessageView.jsx`, `OtpView.jsx`, `src/app/Aurora.jsx`, `src/app/builders/ExperienceTree.js` |
| Paramètre et région d’édition `contenu_genere` (`afficher_contenu_genere`, défaut `true`) | `src/manifest.ts` |
| Archive épurée : exclusion de l’ancien dossier `chatbot-expert-ia/` | `tools/onirtech-template.mjs`, `tests/packaging.test.mjs` |
| Version corrigée et installable | `src/manifest.ts` → `1.5.0` |

Aucune dépendance réseau ajoutée, aucun `dangerouslySetInnerHTML`, aucun `eval` :
le texte reste échappé par React et les URL sont revalidées avant ouverture.

---

## 6. Vérification

```bash
npm test              # 71 tests, 6 fichiers
npm run build
npm run pack
npm run validate      # ✓ chatbot-expert-ia@1.5.0 valide (web-component)
npm run check:browser # 11 contrôles, dont blocs ADR-0067/champs typés et phase OTP
```

Archive finale : `release/chatbot-expert-ia-1.5.0.onirtech-template`
(90 fichiers, **1 seul manifeste**, aucun fichier legacy).

SHA-256 : voir `release/chatbot-expert-ia-1.5.0.release.json` (source de vérité,
calculée à chaque `npm run pack`).

---

## 7. Conclusion en une phrase

La différence tenait au **contrat de messages** : l’hôte fournit des blocs structurés,
des champs typés, `authorName` et l’OTP ; la cause de l’échec après installation est
que le **rendu du template 1.4.0 ignorait ces champs**, tandis que le double manifeste
présent dans l’archive était un défaut de packaging distinct, désormais corrigé.

---

## 8. Complément — images absentes avec la version 1.5.0

Un second défaut, restant après les corrections 1.5.0, a été identifié à partir du
lien de préproduction. L’hôte produit des URL signées **relatives à l’origine** :

- `/api/medias/:id/file?t=…` pour les photos ;
- `/api/chat/attachments/:id/file?t=…` pour les pièces jointes.

Le template 1.5.0 validait les URL multimodales avec une liste d’autorisations qui
n’acceptait que les URL absolues `http(s)`. Les URL relatives générées par l’hôte
étaient donc silencieusement rejetées : l’image arrivait bien dans le contexte, mais
`MultimodalContent` ne créait aucune partie `image`. Le template de référence
fonctionnait parce qu’il injecte directement `media.url` dans `<img src>`, sans
cette validation.

La version **1.5.1** corrige ce point :

- `isSafeMediaUrl()` accepte uniquement les chemins relatifs sûrs de `/api/…`
  (pas de `javascript:`, pas de `//`, pas de traversée `..`, pas d’URL malformée) ;
- les actions `openMedia()` reçoivent une URL absolue résolue depuis l’origine
  courante, comme l’exige le validateur de l’hôte ;
- trois tests de non-régression couvrent le rendu d’une image relative, l’ouverture
  absolue et le rejet des URL dangereuses.

Le diagnostic initial restait valable : il s’agit toujours d’un défaut côté rendu
du template, pas de l’import, du transport ou du SDK.
