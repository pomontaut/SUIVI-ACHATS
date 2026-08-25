import { useState } from "react";
import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { PrioBadge } from "../components/PrioBadge";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { isAtt, isClos } from "../lib/etape";
import { isAutoPrioType, operationNeedsWarning, operationPrio, prioRank } from "../lib/priority";
import type { Operation } from "../types";

const PRIO_ROW_BORDER: Record<string, string> = {
  P0: "border-l-4 !border-l-red-400",
  P1: "border-l-4 !border-l-amber-400",
};

export function OperationsPage() {
  const opts = useOptions();
  const [hideClosed, setHideClosed] = useState(false);
  const { rows, add, update, remove, loading } = useResource<Operation>("operations", {
    prio: "P2",
    ent: opts.ENTITES[0] ?? "",
    type: opts.TYPES_OP[0] ?? "",
    fourn: opts.FOURNITURES[0] ?? "",
    etape: opts.ETAPES[0] ?? "",
  });

  const columns: ColumnDef<Operation>[] = [
    {
      key: "prio",
      label: "Priorité",
      width: "90px",
      // Calculée automatiquement (échéance retourMax pour l'exploitation,
      // retour pour la soumission / Suivi SLA) : lecture seule pour ces
      // types, éditable manuellement pour les autres (ex. Devis PV).
      render: (o) =>
        isAutoPrioType(o.type) ? (
          <PrioBadge prio={operationPrio(o)} warning={operationNeedsWarning(o)} />
        ) : (
          <select className="input" value={o.prio ?? ""} onChange={(e) => update(o.id, { prio: e.target.value })}>
            <option value=""></option>
            {opts.PRIOS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ),
      filterValue: (o) => operationPrio(o),
    },
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

  // Reprend les filtres rapides de l'outil d'origine (opFilter) : chaque
  // prédicat respecte en plus l'interrupteur "Masquer clôturés" (opHideClos),
  // qui peut se combiner à n'importe quel filtre rapide.
  const withHide = (pred: (o: Operation) => boolean) => (o: Operation) => (!hideClosed || !isClos(o.etape)) && pred(o);
  const quickFilters: QuickFilter<Operation>[] = [
    { label: "Urgent (P0/P1)", predicate: withHide((o) => prioRank(operationPrio(o)) <= 1 && !isClos(o.etape)) },
    { label: "Actif", predicate: withHide((o) => !isClos(o.etape)) },
    { label: "Clôturé", predicate: withHide((o) => isClos(o.etape)) },
    { label: "En attente", predicate: withHide((o) => isAtt(o.etape)) },
    { label: "BAT GE", predicate: withHide((o) => (o.ent ?? "").toUpperCase().includes("GE")) },
    { label: "BAT VD", predicate: withHide((o) => (o.ent ?? "").toUpperCase().includes("VD")) },
    { label: "GC", predicate: withHide((o) => (o.ent ?? "").toUpperCase() === "GC") },
    { label: "EG", predicate: withHide((o) => (o.ent ?? "").toUpperCase() === "EG") },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Suivi opérationnel des achats ({rows.length})</h2>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["nom", "dem", "chant", "fourn", "fournisseur", "prec"]}
        quickFilters={quickFilters}
        extraToggle={{ label: "Masquer clôturés", active: hideClosed, onToggle: () => setHideClosed((h) => !h) }}
        rowClassName={(o) => (isClos(o.etape) ? "" : (PRIO_ROW_BORDER[operationPrio(o)] ?? ""))}
      />
    </div>
  );
}
