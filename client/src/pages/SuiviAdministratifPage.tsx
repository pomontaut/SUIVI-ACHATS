import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { SuiviAdministratif } from "../types";

const BL_NON_APPLICABLE = ["agrégats", "déblais"];

function blApplicable(fourn: string | null): boolean {
  return !BL_NON_APPLICABLE.includes((fourn ?? "").trim().toLowerCase());
}

/** Champ "miroir" reporté automatiquement depuis l'opération liée (dès
 * qu'un n° de commande y est saisi, à partir du 25/08/2026) : lecture
 * seule pour ces lignes, éditable pour une ligne saisie manuellement. */
function mirrorColumn(
  key: keyof SuiviAdministratif & string,
  label: string,
  width: string,
  update: (id: string, patch: Partial<SuiviAdministratif>) => void,
): ColumnDef<SuiviAdministratif> {
  return {
    key,
    label,
    width,
    render: (r) => {
      const value = (r[key] as string | null) ?? "";
      if (r.operationId) return <span className="text-slate-600">{value || "—"}</span>;
      return (
        <input
          className="input"
          defaultValue={value}
          onBlur={(e) => { if (e.target.value !== value) update(r.id, { [key]: e.target.value } as Partial<SuiviAdministratif>); }}
        />
      );
    },
  };
}

export function SuiviAdministratifPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<SuiviAdministratif>("suivi-administratif", {
    ent: opts.ENTITES[0] ?? "",
  });

  const columns: ColumnDef<SuiviAdministratif>[] = [
    {
      key: "operationId",
      label: "Origine",
      width: "100px",
      render: (r) =>
        r.operationId ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Reportée automatiquement depuis le suivi opérationnel">
            🔗 Opérationnel
          </span>
        ) : (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Manuelle</span>
        ),
      filterValue: (r) => (r.operationId ? "Opérationnel" : "Manuelle"),
    },
    mirrorColumn("chant", "N° Chantier", "100px", update),
    mirrorColumn("nom", "Nom du chantier", "160px", update),
    mirrorColumn("ent", "Entité", "72px", update),
    mirrorColumn("dem", "Demandeur", "100px", update),
    mirrorColumn("fournisseur", "Fournisseur", "150px", update),
    mirrorColumn("prec", "Produit / Préc.", "140px", update),
    mirrorColumn("numCmd", "N° Commande", "90px", update),
    mirrorColumn("dateCmd", "Date cmd", "82px", update),
    { key: "confirmation", label: "Confirmation", width: "160px" },
    {
      key: "bl",
      label: "BL",
      width: "160px",
      render: (r) =>
        blApplicable(r.fourn) ? (
          <input
            className="input"
            defaultValue={r.bl ?? ""}
            onBlur={(e) => { if (e.target.value !== (r.bl ?? "")) update(r.id, { bl: e.target.value }); }}
          />
        ) : (
          <span className="text-slate-400 italic text-[11px]">Non applicable</span>
        ),
    },
  ];

  const quickFilters: QuickFilter<SuiviAdministratif>[] = [
    { label: "Confirmation manquante", predicate: (d) => !(d.confirmation ?? "").trim() },
    { label: "BL manquant", predicate: (d) => blApplicable(d.fourn) && !(d.bl ?? "").trim() },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Suivi administratif ({rows.length})</h2>
      <p className="text-xs text-slate-500 mb-3">
        Les lignes 🔗 sont reportées automatiquement depuis le suivi opérationnel dès qu'un n° de commande y est
        saisi (à partir du 25/08/2026) ; il reste à compléter ici la confirmation de commande et le BL
        (non applicable pour les agrégats et déblais).
      </p>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        addLabel="+ Ajouter une ligne manuelle"
        searchFields={["chant", "nom", "numCmd", "fournisseur", "prec"]}
        quickFilters={quickFilters}
      />
    </div>
  );
}
