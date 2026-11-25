import { SubComponentNode } from "../core/ComponentNode.js";
import { asText } from "../../utils/format.js";

export class DataTableView extends SubComponentNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "data-table", type: "data-table", name: contract.name ?? "Tableau de données" });
  }

  renderElement() {
    const { colonnes = [], lignes = [] } = this.props;
    return (
      <table className="data-table">
        <thead>
          <tr>{colonnes.map((colonne, index) => <th key={index}>{asText(colonne, `Colonne ${index + 1}`)}</th>)}</tr>
        </thead>
        <tbody>
          {lignes.map((row, index) => (
            <tr key={index}>
              {colonnes.map((colonne, cell) => (
                <td key={cell}>{asText(row?.[colonne], "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
