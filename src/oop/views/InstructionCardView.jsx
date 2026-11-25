import { SubComponentNode } from "../core/ComponentNode.js";
import { InstructionFactory } from "../models/Instruction.js";
import {
  DEFAULT_ALTERNATIVE, INTERFACE_COMPONENTS,
} from "../../app/config/InterfaceConfig.js";
import { asNumber, asText } from "../../utils/format.js";
import { ResourceGridView } from "./ResourceGridView.jsx";
import { DataTableView } from "./DataTableView.jsx";
import { ChartView } from "./ChartView.jsx";
import { ActionButtonsView } from "./ActionButtonsView.jsx";
import { ConfirmView } from "./ConfirmView.jsx";

// Carte polymorphique : le type de l'instruction choisit le sous-composant.
export class InstructionCardView extends SubComponentNode {
  constructor(contract = {}) {
    super({
      ...contract,
      id: contract.id ?? `instruction-card-${contract.instruction?.id ?? "state"}`,
      type: "instruction-card",
      name: contract.name ?? "Interface générée",
    });
  }

  unavailable(alternative, lib) {
    return (
      <p className="instruction-texte">
        {lib("non_disponible", "Ressource non disponible dans cette interface")}. {alternative}
      </p>
    );
  }

  renderElement(children, context, renderer) {
    const p = this.props;
    const instruction = p.instruction;
    const alternative = asText(instruction.props.alternative, DEFAULT_ALTERNATIVE);
    const libelle = asText(instruction.props.libelle, instruction.label(instruction.component));
    const items = Array.isArray(p.items) ? p.items : [];
    const nested = p.depth < 2 ? InstructionFactory.create(instruction.props.instruction) : null;

    if (instruction.action === "confirm" && !p.confirme) {
      return renderer.render(new ConfirmView({
        id: `${this.id}-confirm`,
        props: {
          libelle,
          lib: p.lib,
          onConfirme: p.onConfirme,
          onAnnule: p.onAnnule,
        },
      }), context);
    }

    if (instruction.action === "confirm" && p.confirme && nested) {
      const nestedItems = typeof p.resolveResources === "function"
        ? p.resolveResources(nested, p.message)
        : [];
      return renderer.render(new InstructionCardView({
        id: `${this.id}-nested`,
        props: {
          ...p,
          instruction: nested,
          items: nestedItems,
          confirme: false,
          depth: p.depth + 1,
        },
      }), context);
    }

    let contenu = null;
    const composant = instruction.component;

    if (INTERFACE_COMPONENTS.includes(composant) && ["gallery", "media", "resources"].includes(composant)) {
      contenu = items.length
        ? renderer.render(new ResourceGridView({ id: `${this.id}-resources`, props: { items, actions: p.actions, lib: p.lib } }), context)
        : this.unavailable(alternative, p.lib);
    } else if (composant === "form") {
      contenu = p.canModelForm && typeof p.actions?.openCollectionForm === "function"
        ? (
            <button className="btn2" type="button" onClick={() => p.actions.openCollectionForm()}>
              {p.lib("ouvrir", "Ouvrir")} · {libelle}
            </button>
          )
        : this.unavailable(alternative, p.lib);
    } else if (["dataTable", "chart"].includes(composant)) {
      if (!p.canData) {
        contenu = this.unavailable(alternative, p.lib);
      } else if (!p.dataResult || p.dataResult.status === "loading") {
        contenu = <p className="instruction-texte">Chargement des données…</p>;
      } else if (p.dataResult.status !== "ok") {
        contenu = (
          <p className="instruction-texte">
            {p.dataResult.message || "Données indisponibles"}. {alternative}
          </p>
        );
      } else {
        const colonnes = Array.isArray(p.dataResult.data?.colonnes) ? p.dataResult.data.colonnes : [];
        const lignes = (Array.isArray(p.dataResult.data?.lignes) ? p.dataResult.data.lignes : [])
          .slice(0, asNumber(p.limiteLignes, 5, 1, 20));
        contenu = composant === "chart"
          ? renderer.render(new ChartView({ id: `${this.id}-chart`, props: { lignes } }), context)
          : renderer.render(new DataTableView({ id: `${this.id}-table`, props: { colonnes, lignes } }), context);
      }
    } else if (composant === "actions") {
      const boutons = Array.isArray(instruction.props.buttons) ? instruction.props.buttons : [];
      contenu = boutons.length
        ? renderer.render(new ActionButtonsView({
            id: `${this.id}-actions`,
            props: {
              buttons: boutons,
              items,
              canModelForm: p.canModelForm,
              actions: p.actions,
              lib: p.lib,
              statusFinalisee: p.statusFinalisee,
            },
          }), context)
        : this.unavailable(alternative, p.lib);
    } else {
      contenu = (
        <>
          {this.unavailable(alternative, p.lib)}
          {items.length
            ? renderer.render(new ResourceGridView({ id: `${this.id}-resources`, props: { items, actions: p.actions, lib: p.lib } }), context)
            : null}
        </>
      );
    }

    return (
      <div className="instruction-card">
        <div className="instruction-head">
          <span className="instruction-mode">{instruction.modeLabel(p.lib)}</span>
          <strong>{libelle}</strong>
          <small>
            {instruction.resourceId
              ? `${instruction.resourceId} · v${instruction.version}`
              : `v${instruction.version}`}
          </small>
        </div>
        {contenu}
      </div>
    );
  }
}
