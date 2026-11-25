# Provenance du skill et du SDK

## Skill utilisé

- Source : <https://magic-panel.onir-cms.tech/documentation/skill>
- Date de consultation : 24/11/2026
- Contenu récupéré : `SKILL.md` complet intégré à la page « Skill SDK »,
  version plus récente que la copie locale `onirtech-template-sdk` :
  - zones d’inspection `editor` / `data-onir-region` (ADR-0105) ;
  - paramètres structurés `object` / `array` (ADR-0095) ;
  - capacités `attachments`, `fallback`, `data` ;
  - actions `attachFile`, `removeAttachment`, `openCollectionForm` ;
  - obligation `npm test`, `build`, `validate`, `pack` + contrôle navigateur.

Le skill local installé dans l’environnement datait d’une version antérieure :
la page de documentation a fait foi, conformément à la demande.

## SDK installé

- `@onirtech/template-sdk` **0.2.0** (npm, `npm view @onirtech/template-sdk version`).
- `@onirtech/create-onirtech-template` 0.1.0 pour le scaffold React.

## Adjustments de compatibilité

- `defineManifest` (SDK 0.2.0) ne typifie pas encore `editor`,
  `identificationModes` ni les paramètres `object`/`array` : ces champs sont
  ajoutés dans `src/manifest.ts` après l’appel à `defineManifest`, jamais dans
  le JSON généré `onirtech.template.json` (qui reste produit par le build).
- `tools/onirtech-template.mjs` (CLI copiée par le générateur) a été alignée
  sur le contrat courant : 64 paramètres / 64 Kio, validation récursive
  `object`/`array`, validation du bloc `editor`, SRI de la surface widget.
- La personnalisation visuelle complète passe par un unique paramètre `object`
  `apparence` (18 groupes / 149 tokens, chacun avec `default`), conformément à
  l’ADR-0095. Il est ajouté après `defineManifest` pour contourner l’absence de
  typage des objets dans le SDK 0.2.0, sans éditer le JSON généré.
- `harness/host.mjs` (hôte simulé, fichier du projet) a été enrichi pour les
  actions d'attachement, le menu de secours, `ctx.surface` et les tokens de
  la charte shadcn. Aucun fichier du cœur ONIR CMS n'a été modifié.

## Refactor 1.3.0

- L'architecture hiérarchique demandée dans `instruction.txt` est décrite dans
  `docs/ARCHITECTURE.md` : arbre d'objets, contrat universel, registre et renderer
  récursif, vues classées par dossier.
- Le template ne fait toujours aucun appel réseau : seules les actions du SDK
  sont utilisées. Le manifeste reste généré depuis `src/manifest.ts`.
