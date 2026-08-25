import { EditableTable, type ColumnDef } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { statutLivraison } from "../lib/dates";
import type { Livraison } from "../types";

export function LivraisonsPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Livraison>("livraisons", {
    ent: opts.ENTITES[0] ?? "",
  });

  const columns: ColumnDef<Livraison>[] = [
    { key: "chant", id: "statutCalcule", label: "Statut", computed: (r) => statutLivraison(r.dateLivraison, r.dateLivraisonReelle), width: "130px" },
    { key: "chant", label: "N° Chantier", width: "80px" },
    { key: "nom", label: "Nom du chantier", width: "160px" },
    { key: "numCmd", label: "N° Commande", width: "88px" },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "72px" },
    { key: "dem", label: "Demandeur", width: "100px" },
    { key: "fournisseur", label: "Fournisseur", width: "130px" },
    { key: "prec", label: "Produit / Préc.", width: "140px" },
    { key: "montant", label: "Montant CHF", type: "num", width: "90px" },
    { key: "dateCmd", label: "Date cmd", type: "date", width: "82px" },
    { key: "dateConfirm", label: "Date confirm.", type: "date", width: "90px" },
    { key: "dateLivraison", label: "Date liv. prévue", type: "date", width: "92px" },
    { key: "dateLivraisonReelle", label: "Date liv. réelle", type: "date", width: "92px" },
    { key: "remLiv", label: "Remarques", width: "180px" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Suivi des livraisons ({rows.length})</h2>
      <EditableTable columns={columns} rows={rows} onUpdate={update} onDelete={remove} onAdd={add} />
    </div>
  );
}
