import { EditableTable, type ColumnDef } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { Operation } from "../types";

export function OperationsPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Operation>("operations", {
    prio: "P2",
    ent: opts.ENTITES[0] ?? "",
    type: opts.TYPES_OP[0] ?? "",
    fourn: opts.FOURNITURES[0] ?? "",
    etape: opts.ETAPES[0] ?? "",
  });

  const columns: ColumnDef<Operation>[] = [
    { key: "prio", label: "Priorité", type: "select", options: opts.PRIOS, width: "70px" },
    { key: "date", label: "Date", type: "date", width: "80px" },
    { key: "dem", label: "Demandeur", width: "110px" },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    { key: "chant", label: "N° Chantier", width: "80px" },
    { key: "nom", label: "Nom du chantier", width: "160px" },
    { key: "type", label: "Type", type: "select", options: opts.TYPES_OP, width: "120px" },
    { key: "impl", label: "Impl.", type: "select", options: opts.IMPL, width: "70px" },
    { key: "fourn", label: "Fournitures", type: "select", options: opts.FOURNITURES, width: "130px" },
    { key: "prec", label: "Précisions", width: "140px" },
    { key: "etape", label: "Étape", type: "select", options: opts.ETAPES, width: "170px" },
    { key: "rem", label: "Remarques", width: "150px" },
    { key: "launch", label: "Lancement", type: "date", width: "80px" },
    { key: "retour", label: "Retour", type: "date", width: "80px" },
    { key: "retourMax", label: "Retour max", type: "date", width: "80px" },
    { key: "dateCmd", label: "Date cmd", type: "date", width: "80px" },
    { key: "dateLivraison", label: "Date livraison", type: "date", width: "90px" },
    { key: "numCmd", label: "N° cmd", width: "80px" },
    { key: "budget", label: "Budget", type: "num", width: "80px" },
    { key: "typeBudget", label: "Type budget", type: "select", options: opts.BUDGET_TYPE_OPTS, width: "150px" },
    { key: "montant", label: "Montant", type: "num", width: "90px" },
    { key: "gain", label: "Gain/perte", type: "num", width: "80px" },
    { key: "tco", label: "TCO", type: "select", options: opts.TCO_OPTS, width: "60px" },
    { key: "fournisseur", label: "Fournisseur", width: "130px" },
    { key: "comment", label: "Commentaire", type: "select", options: opts.COMMENT_OPTS, width: "180px" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Suivi opérationnel des achats ({rows.length})</h2>
      <EditableTable columns={columns} rows={rows} onUpdate={update} onDelete={remove} onAdd={add} />
    </div>
  );
}
