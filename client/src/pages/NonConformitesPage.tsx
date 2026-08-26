import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { NonConformite } from "../types";

export function NonConformitesPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<NonConformite>("non-conformites", {
    statutNC: "En cours",
  });

  const columns: ColumnDef<NonConformite>[] = [
    { key: "date", label: "Date NC", type: "date", width: "85px" },
    { key: "statutNC", label: "Statut", type: "select", options: opts.NC_STATUTS_SIMPLE, width: "100px" },
    {
      key: "fournisseur",
      label: "Fournisseur",
      width: "150px",
      render: (d) => <FournisseurPicker value={d.fournisseur} onChange={(v) => update(d.id, { fournisseur: v })} />,
      filterValue: (d) => d.fournisseur ?? "",
    },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    {
      key: "chant",
      label: "N° chantier",
      width: "140px",
      render: (d) => (
        <ChantierPicker
          numero={d.chant}
          onSelect={(numero, nom) => update(d.id, nom !== null ? { chant: numero, nom } : { chant: numero })}
        />
      ),
    },
    { key: "nom", label: "Nom du chantier", width: "150px" },
    { key: "ctx", label: "Contact", width: "100px" },
    { key: "montantCmd", label: "Montant cmd CHF", type: "num", width: "95px" },
    { key: "catNC", label: "Catégorie NC", type: "select", options: opts.NC_TYPOLOGIES, width: "150px" },
    { key: "typeNC", label: "Gravité", type: "select", options: opts.NC_TYPES, width: "90px" },
    { key: "montantNC", label: "Montant estimé NC", type: "num", width: "105px" },
    { key: "statut", label: "Statut détaillé", type: "select", options: opts.NC_STATUTS, width: "170px" },
    { key: "noteCredit", label: "Note crédit CHF", type: "num", width: "105px" },
    { key: "noteCreditNum", label: "N° note de crédit", width: "130px" },
    { key: "rem", label: "Remarques", width: "200px" },
  ];

  const quickFilters: QuickFilter<NonConformite>[] = [
    { label: "En cours", predicate: (d) => (d.statutNC ?? "En cours") !== "Clôturé" },
    { label: "Clôturées", predicate: (d) => (d.statutNC ?? "En cours") === "Clôturé" },
    { label: "Critique", predicate: (d) => (d.typeNC ?? "") === "Critique" },
    { label: "Majeur", predicate: (d) => (d.typeNC ?? "") === "Majeur" },
    { label: "Mineur", predicate: (d) => (d.typeNC ?? "") === "Mineur" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Non-conformités fournisseur ({rows.length})</h2>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["fournisseur", "nom", "chant", "ctx", "rem"]}
        quickFilters={quickFilters}
      />
    </div>
  );
}
