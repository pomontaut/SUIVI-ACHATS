import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { DemandeAchat } from "../types";

const STATUT_COLOR: Record<string, string> = {
  "Validée": "!bg-green-100 !text-green-800 hover:!bg-green-100",
  "Refusée": "!bg-red-100 !text-red-800 hover:!bg-red-100",
  "Transformée en commande": "!bg-blue-100 !text-blue-800 hover:!bg-blue-100",
};

export function DemandeAchatPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<DemandeAchat>("demandes-achat", {
    ent: opts.ENTITES[0] ?? "",
    statut: opts.STATUT_DEMANDE_OPTS[0] ?? "En attente",
  });

  const columns: ColumnDef<DemandeAchat>[] = [
    { key: "date", label: "Date", type: "date", width: "90px" },
    { key: "dem", label: "Demandeur", width: "110px", singleLine: true },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    {
      key: "chant",
      label: "N° Chantier",
      width: "130px",
      render: (d) => (
        <ChantierPicker
          numero={d.chant}
          onSelect={(numero, nom) => update(d.id, nom !== null ? { chant: numero, nom } : { chant: numero })}
        />
      ),
    },
    { key: "nom", label: "Nom du chantier", width: "150px" },
    { key: "objet", label: "Objet de la demande", width: "220px" },
    { key: "justification", label: "Justification du besoin", width: "220px" },
    { key: "montantEstime", label: "Montant estimé (CHF)", type: "num", width: "120px" },
    {
      key: "fournisseur",
      label: "Fournisseur pressenti",
      width: "150px",
      render: (d) => <FournisseurPicker value={d.fournisseur} onChange={(v) => update(d.id, { fournisseur: v })} />,
      filterValue: (d) => d.fournisseur ?? "",
    },
    { key: "urgence", label: "Urgence", type: "select", options: opts.PRIOS, width: "80px" },
    {
      key: "statut",
      label: "Statut",
      type: "select",
      options: opts.STATUT_DEMANDE_OPTS,
      width: "170px",
      render: (d) => (
        <select
          className={`input ${STATUT_COLOR[d.statut ?? ""] ?? ""}`}
          value={d.statut ?? ""}
          onChange={(e) => update(d.id, { statut: e.target.value })}
        >
          <option value=""></option>
          {opts.STATUT_DEMANDE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { key: "rem", label: "Remarque", width: "200px" },
  ];

  const quickFilters: QuickFilter<DemandeAchat>[] = [
    { label: "En attente", predicate: (d) => (d.statut ?? "") === "En attente" },
    { label: "Validée", predicate: (d) => (d.statut ?? "") === "Validée" },
    { label: "Refusée", predicate: (d) => (d.statut ?? "") === "Refusée" },
    { label: "Transformée en commande", predicate: (d) => (d.statut ?? "") === "Transformée en commande" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Demandes d'achat ({rows.length})</h2>
      <p className="text-xs text-slate-500 mb-3">
        Étape amont de l'Opérationnel : la demande initiale d'un besoin, avant validation et création éventuelle d'un sujet suivi.
      </p>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["dem", "chant", "nom", "objet", "fournisseur"]}
        quickFilters={quickFilters}
      />
    </div>
  );
}
