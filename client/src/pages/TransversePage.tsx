import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { PrioSelect } from "../components/PrioBadge";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { prioRank } from "../lib/priority";
import type { Transverse } from "../types";

const PRIO_ROW_BORDER: Record<string, string> = {
  P0: "border-l-4 !border-l-red-400",
  P1: "border-l-4 !border-l-amber-400",
};

function isClosTr(d: Transverse): boolean {
  const prec = (d.prec ?? "").toLowerCase();
  const action = (d.action ?? "").toLowerCase();
  const statut = d.statut ?? "Actif";
  return statut === "Clôturé" || prec.includes("cloturé") || prec.includes("clôturé") || action.includes("cloturé") || action.includes("clôturé");
}
function isAttTr(d: Transverse): boolean {
  const prec = (d.prec ?? "").toLowerCase();
  const action = (d.action ?? "").toLowerCase();
  const rem = (d.rem ?? "").toLowerCase();
  return prec.includes("attente") || action.includes("attente") || rem.includes("attente");
}

export function TransversePage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Transverse>("transverses", {
    prio: "P2",
    statut: "Actif",
    ent: "ACHATS",
    type: opts.TYPES_TR[0] ?? "",
  });

  const columns: ColumnDef<Transverse>[] = [
    {
      key: "prio",
      label: "Priorité",
      width: "80px",
      render: (d) => <PrioSelect value={d.prio} options={opts.PRIOS} onChange={(v) => update(d.id, { prio: v })} />,
    },
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

  const quickFilters: QuickFilter<Transverse>[] = [
    { label: "Urgent (P0/P1)", predicate: (d) => prioRank(d.prio) <= 1 && !isClosTr(d) },
    { label: "Actif", predicate: (d) => !isClosTr(d) },
    { label: "Clôturé", predicate: isClosTr },
    { label: "En attente", predicate: (d) => isAttTr(d) && !isClosTr(d) },
    { label: "Mgt Achat", predicate: (d) => (d.type ?? "") === "Mgt Achat" },
    { label: "Projet IT", predicate: (d) => (d.type ?? "") === "Projet IT" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Sujets transverses ({rows.length})</h2>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["nom", "dem", "prec", "action"]}
        quickFilters={quickFilters}
        defaultQuickFilter="Actif"
        rowClassName={(d) => (isClosTr(d) ? "" : (PRIO_ROW_BORDER[d.prio ?? ""] ?? ""))}
      />
    </div>
  );
}
