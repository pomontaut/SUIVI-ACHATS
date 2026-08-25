import { EditableTable, type ColumnDef } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { AppelOffre } from "../types";

export function AppelsOffresPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<AppelOffre>("appels-offres", {
    statut: "En cours",
    ent: opts.ENTITES[0] ?? "",
  });

  const columns: ColumnDef<AppelOffre>[] = [
    { key: "statut", label: "Statut", type: "select", options: opts.AO_STATUT_OPTS, width: "100px" },
    { key: "date", label: "Date", type: "date", width: "85px" },
    { key: "chant", label: "N° Chantier", width: "80px" },
    { key: "nom", label: "Nom du chantier", width: "160px" },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    { key: "dem", label: "Demandeur", width: "110px" },
    { key: "fournisseur", label: "Fournisseur consulté", width: "150px" },
    { key: "prec", label: "Objet / Précisions", width: "160px" },
    { key: "dateEnvoi", label: "Date envoi", type: "date", width: "85px" },
    { key: "dateRetour", label: "Date retour", type: "date", width: "85px" },
    { key: "rem", label: "Remarques", width: "180px" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Appels d'offres ({rows.length})</h2>
      <EditableTable columns={columns} rows={rows} onUpdate={update} onDelete={remove} onAdd={add} />
    </div>
  );
}
