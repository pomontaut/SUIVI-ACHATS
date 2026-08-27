import { useState } from "react";
import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { PrioBadge } from "../components/PrioBadge";
import { VuCheckbox } from "../components/VuCheckbox";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { ConsultationPicker } from "../components/ConsultationPicker";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { isAtt, isClos } from "../lib/etape";
import { isAutoPrioType, operationNeedsWarning, operationPrio, prioRank } from "../lib/priority";
import type { Operation } from "../types";

const PRIO_ROW_BORDER: Record<string, string> = {
  P0: "border-l-4 !border-l-red-400",
  P1: "border-l-4 !border-l-amber-400",
};

/** Gain/perte = Montant - Budget (négatif = économie, positif = dépassement,
 * cohérent avec le signe attendu par gainPct ci-dessous). Calculé
 * automatiquement dès que le budget et le montant sont tous les deux
 * renseignés ; retourne null sinon (saisie manuelle conservée dans ce cas). */
function autoGain(budget: string | null, montant: string | null): string | null {
  const b = parseFloat(budget ?? "");
  const m = parseFloat(montant ?? "");
  if (Number.isNaN(b) || Number.isNaN(m)) return null;
  return String(Math.round((m - b) * 100) / 100);
}

/** Reprend le calcul de gainPct de l'outil d'origine : pourcentage
 * d'économie (positif) ou de dépassement (négatif) par rapport au budget.
 * Priorité au gain calculé en direct depuis budget/montant (cohérent avec
 * la colonne Gain/perte et avec dashboard.ts), à défaut la valeur stockée. */
function gainPct(o: Operation): number | null {
  const budget = parseFloat(o.budget ?? "");
  if (Number.isNaN(budget) || budget === 0) return null;
  const auto = autoGain(o.budget, o.montant);
  const gain = parseFloat(auto ?? o.gain ?? "");
  if (Number.isNaN(gain)) return null;
  return Math.round(((-gain / budget) * 100) * 10) / 10;
}

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
      key: "vuDate",
      label: "✓ Vu",
      width: "40px",
      noFilter: true,
      render: (o) => <VuCheckbox vuDate={o.vuDate} onChange={(v) => update(o.id, { vuDate: v })} />,
    },
    {
      key: "etape",
      id: "etapeStatut",
      label: "Statut",
      width: "80px",
      render: (o) => (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isClos(o.etape) ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
          {isClos(o.etape) ? "Clôturé" : "En cours"}
        </span>
      ),
      filterValue: (o) => (isClos(o.etape) ? "Clôturé" : "En cours"),
    },
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
    {
      key: "chant",
      label: "N° Chantier",
      width: "140px",
      render: (o) => (
        <ChantierPicker
          numero={o.chant}
          onSelect={(numero, nom) => update(o.id, nom !== null ? { chant: numero, nom } : { chant: numero })}
        />
      ),
    },
    { key: "nom", label: "Nom du chantier", width: "160px" },
    { key: "type", label: "Type", type: "select", options: opts.TYPES_OP, width: "120px" },
    { key: "impl", label: "Impl.", type: "select", options: opts.IMPL, width: "70px" },
    { key: "fourn", label: "Fournitures", type: "select", options: opts.FOURNITURES, width: "130px" },
    { key: "prec", label: "Précisions", width: "140px" },
    { key: "etape", id: "etapeSelect", label: "Étape", type: "select", options: opts.ETAPES, width: "170px" },
    {
      key: "consult",
      label: "Consultation",
      width: "170px",
      render: (o) => <ConsultationPicker value={o.consult} onChange={(v) => update(o.id, { consult: v })} />,
      filterValue: (o) => o.consult ?? "",
    },
    { key: "rem", label: "Remarques", width: "150px" },
    { key: "launch", label: "Lancement", type: "date", width: "80px" },
    { key: "retour", label: "Retour", type: "date", width: "80px" },
    { key: "retourMax", label: "Retour max", type: "date", width: "80px" },
    { key: "dateCmd", label: "Date cmd", type: "date", width: "80px" },
    { key: "dateLivraison", label: "Date livraison", type: "date", width: "90px" },
    { key: "numCmd", label: "N° cmd", width: "80px" },
    {
      key: "budget",
      label: "Budget",
      type: "num",
      width: "80px",
      render: (o) => (
        <input
          className="input"
          defaultValue={o.budget ?? ""}
          onBlur={(e) => {
            if (e.target.value === (o.budget ?? "")) return;
            const patch: Partial<Operation> = { budget: e.target.value };
            const g = autoGain(e.target.value, o.montant);
            if (g !== null) patch.gain = g;
            update(o.id, patch);
          }}
        />
      ),
    },
    { key: "typeBudget", label: "Type budget", type: "select", options: opts.BUDGET_TYPE_OPTS, width: "150px" },
    {
      key: "montant",
      label: "Montant",
      type: "num",
      width: "90px",
      render: (o) => (
        <input
          className="input"
          defaultValue={o.montant ?? ""}
          onBlur={(e) => {
            if (e.target.value === (o.montant ?? "")) return;
            const patch: Partial<Operation> = { montant: e.target.value };
            const g = autoGain(o.budget, e.target.value);
            if (g !== null) patch.gain = g;
            update(o.id, patch);
          }}
        />
      ),
    },
    {
      key: "gain",
      label: "Gain/perte",
      width: "80px",
      filterValue: (o) => autoGain(o.budget, o.montant) ?? (o.gain ?? ""),
      render: (o) => {
        const auto = autoGain(o.budget, o.montant);
        if (auto !== null) {
          return <span className="text-slate-600" title="Calculé automatiquement (Montant − Budget)">{auto}</span>;
        }
        return (
          <input
            className="input"
            defaultValue={o.gain ?? ""}
            onBlur={(e) => { if (e.target.value !== (o.gain ?? "")) update(o.id, { gain: e.target.value }); }}
          />
        );
      },
    },
    {
      key: "gain",
      id: "gainPct",
      label: "Gain/perte %",
      width: "80px",
      render: (o) => {
        const pct = gainPct(o);
        return <span className={pct !== null && pct < 0 ? "text-red-700" : pct !== null && pct > 0 ? "text-green-700" : "text-slate-400"}>{pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}</span>;
      },
      noFilter: true,
    },
    { key: "tco", label: "TCO", type: "select", options: opts.TCO_OPTS, width: "60px" },
    {
      key: "fournisseur",
      label: "Fournisseur",
      width: "150px",
      render: (o) => <FournisseurPicker value={o.fournisseur} onChange={(v) => update(o.id, { fournisseur: v })} />,
      filterValue: (o) => o.fournisseur ?? "",
    },
    { key: "typeActionAchat", label: "Type action achat", type: "select", options: opts.COMMENT_OPTS, width: "180px" },
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
