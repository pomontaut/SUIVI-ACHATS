import { useMemo, useState } from "react";
import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { Modal } from "../components/Modal";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import type { AppelOffre } from "../types";

const chf = (v: number) => new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(v);

export function AppelsOffresPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<AppelOffre>("appels-offres", {
    statut: "En cours",
    ent: opts.ENTITES[0] ?? "",
  });

  const columns: ColumnDef<AppelOffre>[] = [
    { key: "statut", label: "Statut", type: "select", options: opts.AO_STATUT_OPTS, width: "100px" },
    { key: "date", label: "Date", type: "date", width: "85px" },
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
    { key: "nom", label: "Nom du chantier", width: "160px" },
    { key: "ent", label: "Entité", type: "select", options: opts.ENTITES, width: "80px" },
    { key: "dem", label: "Demandeur", width: "110px" },
    {
      key: "fournisseur",
      label: "Fournisseur consulté",
      width: "150px",
      render: (r) =>
        r.operationId ? (
          <span className="text-slate-600">{r.fournisseur || "—"}</span>
        ) : (
          <FournisseurPicker value={r.fournisseur} onChange={(v) => update(r.id, { fournisseur: v })} />
        ),
    },
    { key: "prec", label: "Objet / Précisions", width: "160px" },
    { key: "dateEnvoi", label: "Date envoi", type: "date", width: "85px" },
    { key: "dateRetour", label: "Date retour", type: "date", width: "85px" },
    { key: "offreFournisseur", label: "Offre HT (CHF)", type: "num", width: "100px" },
    { key: "rem", label: "Remarques", width: "180px" },
  ];

  const quickFilters: QuickFilter<AppelOffre>[] = opts.AO_STATUT_OPTS.filter(Boolean).map((s) => ({
    label: s,
    predicate: (d) => (d.statut ?? "En cours") === s,
  }));

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Appels d'offres ({rows.length})</h2>
        <EditableTable
          columns={columns}
          rows={rows}
          onUpdate={update}
          onDelete={remove}
          onAdd={add}
          searchFields={["nom", "chant", "dem", "fournisseur", "prec"]}
          quickFilters={quickFilters}
        />
      </div>
      <ComparatifsSection rows={rows} onUpdate={update} />
    </div>
  );
}

interface Groupe {
  key: string;
  chant: string;
  nom: string;
  rows: AppelOffre[];
}

function ComparatifsSection({ rows, onUpdate }: { rows: AppelOffre[]; onUpdate: (id: string, patch: Partial<AppelOffre>) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groupes = useMemo(() => {
    const map = new Map<string, Groupe>();
    for (const r of rows) {
      if (!r.fournisseur) continue;
      const key = `${r.chant ?? ""}|${r.nom ?? ""}`;
      const g = map.get(key) ?? { key, chant: r.chant ?? "", nom: r.nom ?? "—", rows: [] };
      g.rows.push(r);
      map.set(key, g);
    }
    return [...map.values()].filter((g) => g.rows.length >= 2).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rows]);

  if (groupes.length === 0) return null;

  const openGroupe = groupes.find((g) => g.key === openKey) ?? null;

  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Comparatifs par sujet</h3>
      <p className="text-xs text-slate-400 mb-3">Sujets ayant au moins 2 fournisseurs consultés — générez le tableau comparatif technique et financier (en HT).</p>
      <div className="space-y-1.5">
        {groupes.map((g) => (
          <div key={g.key} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div>
              <span className="font-medium">{g.nom}</span>
              {g.chant && <span className="text-slate-400"> — chantier {g.chant}</span>}
              <span className="text-slate-400"> · {g.rows.length} fournisseurs consultés</span>
            </div>
            <button
              className="text-indigo-600 hover:underline font-medium"
              onClick={() => setOpenKey(g.key)}
            >
              Générer le tableau comparatif
            </button>
          </div>
        ))}
      </div>
      {openGroupe && <ComparatifModal groupe={openGroupe} onUpdate={onUpdate} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

function ComparatifModal({ groupe, onUpdate, onClose }: { groupe: Groupe; onUpdate: (id: string, patch: Partial<AppelOffre>) => void; onClose: () => void }) {
  const offres = groupe.rows
    .map((r) => ({ row: r, montant: parseFloat(r.offreFournisseur ?? "") }))
    .sort((a, b) => {
      const am = Number.isNaN(a.montant) ? Infinity : a.montant;
      const bm = Number.isNaN(b.montant) ? Infinity : b.montant;
      return am - bm;
    });
  const cheapest = offres.find((o) => !Number.isNaN(o.montant))?.montant;

  return (
    <Modal title={`Comparatif — ${groupe.nom}${groupe.chant ? ` (chantier ${groupe.chant})` : ""}`} onClose={onClose}>
      <div className="max-w-none w-[70vw] max-h-[75vh] overflow-auto -m-4 p-4">
        <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Comparatif financier (HT)</h4>
        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5 pr-2">Fournisseur</th>
              <th className="py-1.5 pr-2 text-right">Offre HT (CHF)</th>
              <th className="py-1.5 pr-2 text-right">Écart vs moins cher</th>
              <th className="py-1.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {offres.map(({ row, montant }) => {
              const isCheapest = cheapest !== undefined && montant === cheapest;
              return (
                <tr key={row.id} className={`border-t border-slate-100 ${isCheapest ? "bg-green-50" : ""}`}>
                  <td className="py-1.5 pr-2 font-medium">{row.fournisseur}{isCheapest && <span className="ml-1 text-green-700">✓ moins cher</span>}</td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      className="input w-28 text-right"
                      defaultValue={row.offreFournisseur ?? ""}
                      placeholder="—"
                      onBlur={(e) => { if (e.target.value !== (row.offreFournisseur ?? "")) onUpdate(row.id, { offreFournisseur: e.target.value }); }}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right text-slate-500">
                    {!Number.isNaN(montant) && cheapest !== undefined && montant > cheapest ? `+CHF ${chf(montant - cheapest)}` : Number.isNaN(montant) ? "—" : "—"}
                  </td>
                  <td className="py-1.5">{row.statut || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Comparatif technique</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {groupe.rows.map((row) => (
            <div key={row.id} className="border border-slate-200 rounded-lg p-2.5">
              <div className="text-xs font-medium mb-1">{row.fournisseur}</div>
              <textarea
                className="input w-full h-20 text-xs"
                placeholder="Notes techniques (conformité, délai, garantie...)"
                defaultValue={row.comparatifTechnique ?? ""}
                onBlur={(e) => { if (e.target.value !== (row.comparatifTechnique ?? "")) onUpdate(row.id, { comparatifTechnique: e.target.value }); }}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
