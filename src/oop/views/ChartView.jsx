import { SubComponentNode } from "../core/ComponentNode.js";
import { asNumber, asText } from "../../utils/format.js";

export class ChartView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "chart", type: "chart", name: contract.name ?? "Graphique" });
  }

  renderElement() {
    const { lignes = [] } = this.props;
    const max = Math.max(1, ...lignes.map((row) => Math.abs(asNumber(row?.valeur, 0, 0, 1e9))));
    return (
      <div className="chart">
        {lignes.map((row, index) => {
          const valeur = Math.abs(asNumber(row?.valeur, 0, 0, 1e9));
          return (
            <div className="chart-row" key={index}>
              <span>{asText(row?.libelle, `Ligne ${index + 1}`)}</span>
              <div className="chart-bar">
                <i style={{ width: `${Math.round((valeur / max) * 100)}%` }} />
              </div>
              <b>{asText(row?.valeur, "0")}</b>
            </div>
          );
        })}
      </div>
    );
  }
}
