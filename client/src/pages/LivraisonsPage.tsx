import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { livraisonCategorie, statutLivraisonLabel } from "../lib/dates";
import type { Livraison } from "../types";

/** Champ "miroir" reporté automatiquement depuis une opération liée
 * (syncLivraisonsFromOperations) : affiché en lecture seule pour ces
 * lignes (toute modification serait écrasée au prochain rechargement),
 * éditable normalement pour une ligne saisie manuellement. */
function mirrorColumn(
  key: keyof Livraison & string,
  label: string,
  width: string,
  update: (id: string, patch: Partial<Livraison>) => void,
  opts?: { type?: ColumnDef<Livraison>["type"]; options?: string[] },
): ColumnDef<Livraison> {
  return {
    key,
    label,
    width,
    type: opts?.type,
    options: opts?.options,
    render: (r) => {
      const value = (r[key] as string | null) ?? "";
      if (r.operationId) return <span className="text-slate-600">{value || "—"}</span>;
      if (opts?.type === "select") {
        return (
          <select className="input" value={value} onChange={(e) => update(r.id, { [key]: e.target.value } as Partial<Livraison>)}>
            <option value=""></option>
            {(opts.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      }
      return (
        <input
          className="input"
          defaultValue={value}
          onBlur={(e) => { if (e.target.value !== value) update(r.id, { [key]: e.target.value } as Partial<Livraison>); }}
        />
      );
    },
  };
}

export function LivraisonsPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<Livraison>("livraisons", {
    ent: opts.ENTITES[0] ?? "",
  });

  const columns: ColumnDef<Livraison>[] = [
    {
      key: "chant",
      id: "statutCalcule",
      label: "Statut",
      computed: (r) => statutLivraisonLabel(r.dateLivraison, r.dateLivraisonReelle),
      filterValue: (r) => livraisonCategorie(r.dateLivraison, r.dateLivraisonReelle),
      width: "130px",
    },
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
    {
      key: "chant",
      label: "N° Chantier",
      width: "140px",
      render: (r) =>
        r.operationId ? (
          <span className="text-slate-600">{r.chant || "—"}</span>
        ) : (
          <ChantierPicker
            numero={r.chant}
            onSelect={(numero, nom) => update(r.id, nom !== null ? { chant: numero, nom } : { chant: numero })}
          />
        ),
    },
    mirrorColumn("nom", "Nom du chantier", "160px", update),
    mirrorColumn("numCmd", "N° Commande", "88px", update),
    mirrorColumn("ent", "Entité", "72px", update, { type: "select", options: opts.ENTITES }),
    mirrorColumn("dem", "Demandeur", "100px", update),
    {
      key: "fournisseur",
      label: "Fournisseur",
      width: "150px",
      render: (r) =>
        r.operationId ? (
          <span className="text-slate-600">{r.fournisseur || "—"}</span>
        ) : (
          <FournisseurPicker value={r.fournisseur} onChange={(v) => update(r.id, { fournisseur: v })} />
        ),
    },
    mirrorColumn("prec", "Produit / Préc.", "140px", update),
    mirrorColumn("montant", "Montant CHF", "90px", update, { type: "num" }),
    mirrorColumn("dateCmd", "Date cmd", "82px", update, { type: "date" }),
    { key: "dateConfirm", label: "Date confirm.", type: "date", width: "90px" },
    mirrorColumn("dateLivraison", "Date liv. prévue", "92px", update, { type: "date" }),
    { key: "dateLivraisonReelle", label: "Date liv. réelle", type: "date", width: "92px" },
    { key: "remLiv", label: "Remarques", width: "180px" },
  ];

  const quickFilters: QuickFilter<Livraison>[] = [
    { label: "Actif", predicate: (d) => livraisonCategorie(d.dateLivraison, d.dateLivraisonReelle) !== "livre" },
    { label: "En cours", predicate: (d) => livraisonCategorie(d.dateLivraison, d.dateLivraisonReelle) === "encours" },
    { label: "En retard", predicate: (d) => livraisonCategorie(d.dateLivraison, d.dateLivraisonReelle) === "retard" },
    { label: "Clôturés", predicate: (d) => livraisonCategorie(d.dateLivraison, d.dateLivraisonReelle) === "livre" },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Suivi des livraisons ({rows.length})</h2>
      <p className="text-xs text-slate-500 mb-3">
        Les lignes 🔗 sont reportées automatiquement depuis le suivi opérationnel (chantiers avec n° de commande) ;
        seules les dates de confirmation/réception et les remarques restent à compléter ici.
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
        defaultQuickFilter="Actif"
      />
    </div>
  );
}
