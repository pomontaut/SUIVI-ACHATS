import { EditableTable, type ColumnDef } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { Transverse } from "../types";

export function TransversePage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Transverse>("transverses", {
    prio: "P2",
    statut: "Actif",
    ent: "ACHATS",
    type: opts.TYPES_TR[0] ?? "",
  });

  const columns: ColumnDef<Transverse>[] = [
    { key: "prio", label: "Priorité", type: "select", options: opts.PRIOS, width: "70px" },
    { key: "statut", label: "Statut", type: "select", options: ["Actif", "Clôturé"], width: "90px" },
    { key: "date", label: "Date", type: "date", width: "85px" },
    { key: "dem", label: "Demandeur", width: "110px" },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    { key: "nom", label: "Nom dossier", width: "160px" },
    { key: "type", label: "Type", type: "select", options: opts.TYPES_TR, width: "110px" },
    { key: "prec", label: "Précisions", width: "155px" },
    { key: "budget", label: "Budget", width: "70px" },
    { key: "rem", label: "Remarques", width: "195px" },
    { key: "action", label: "Actions en cours", type: "select", options: opts.ACTIONS_TR, width: "180px" },
    { key: "retour", label: "Date retour", type: "date", width: "88px" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Sujets transverses ({rows.length})</h2>
      <EditableTable columns={columns} rows={rows} onUpdate={update} onDelete={remove} onAdd={add} />
    </div>
  );
}
