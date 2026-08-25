import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { Todo } from "../types";

export function TodoPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Todo>("todos", {
    prio: "P2",
    statut: "Actif",
  });

  const columns: ColumnDef<Todo>[] = [
    { key: "prio", label: "Priorité", type: "select", options: opts.PRIOS, width: "70px" },
    { key: "statut", label: "Statut", type: "select", options: opts.TD_STATUTS, width: "90px" },
    { key: "qui", label: "Qui", width: "130px" },
    { key: "quoi", label: "Quoi", width: "260px" },
    { key: "deadline", label: "Deadline sujet", type: "date", width: "100px" },
    { key: "action", label: "Action en cours", width: "200px" },
    { key: "deadlineAction", label: "Deadline action", type: "date", width: "100px" },
  ];

  const quickFilters: QuickFilter<Todo>[] = [
    { label: "Actif", predicate: (d) => (d.statut ?? "Actif") !== "Clôturé" },
    { label: "Clôturé", predicate: (d) => (d.statut ?? "Actif") === "Clôturé" },
    { label: "P0", predicate: (d) => (d.prio ?? "") === "P0" },
    { label: "P1", predicate: (d) => (d.prio ?? "") === "P1" },
    { label: "P2", predicate: (d) => (d.prio ?? "") === "P2" },
    { label: "P3", predicate: (d) => (d.prio ?? "") === "P3" },
    { label: "P4", predicate: (d) => (d.prio ?? "") === "P4" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">To-do ({rows.length})</h2>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["qui", "quoi", "action"]}
        quickFilters={quickFilters}
      />
    </div>
  );
}
