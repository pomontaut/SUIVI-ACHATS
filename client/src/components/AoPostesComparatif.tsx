import { useEffect, useState } from "react";
import { api } from "../api";
import type { AoPoste, AoPosteMontant, AppelOffre } from "../types";

const chf = (v: number) => new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(v);
function num(v: string | null | undefined): number | null {
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? null : n;
}

export interface PostesComparatifHandle {
  postes: AoPoste[];
  montants: AoPosteMontant[];
}

/** Comparatif financier détaillé poste par poste d'un sujet AO (n° d'article,
 * libellé, budget interne, montant par fournisseur consulté avec écarts
 * calculés), à l'image des comparatifs de référence transmis par
 * l'utilisateur. Les postes peuvent être renseignés manuellement ou remplis
 * automatiquement depuis les offres PDF jointes (cf. matchAoPostesFromExtraction
 * côté serveur) ; dans ce dernier cas ils portent une puce 🤖 tant que le
 * montant n'a pas été vérifié/corrigé à la main. */
export function AoPostesComparatif({ sujetCle, rows, onDataChanged }: { sujetCle: string; rows: AppelOffre[]; onDataChanged?: (h: PostesComparatifHandle) => void }) {
  const [postes, setPostes] = useState<AoPoste[]>([]);
  const [montants, setMontants] = useState<AoPosteMontant[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const data = await api.aoPostes(sujetCle);
    setPostes(data.postes);
    setMontants(data.montants);
    setLoading(false);
    onDataChanged?.(data);
  }

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sujetCle]);

  function montantOf(posteId: string, appelOffreId: string): AoPosteMontant | undefined {
    return montants.find((m) => m.posteId === posteId && m.appelOffreId === appelOffreId);
  }

  async function addPoste() {
    await api.addAoPoste({ sujetCle, libelle: "Nouveau poste" });
    await reload();
  }
  async function updatePoste(id: string, patch: { reference?: string; libelle?: string; budget?: string }) {
    await api.updateAoPoste(id, patch);
    await reload();
  }
  async function removePoste(id: string) {
    await api.removeAoPoste(id);
    await reload();
  }
  async function updateMontant(posteId: string, appelOffreId: string, value: string) {
    await api.updateAoPosteMontant(posteId, appelOffreId, value || null);
    await reload();
  }

  if (loading) return <p className="text-xs text-slate-400">Chargement des postes…</p>;

  const totalParFournisseur = new Map<string, number>();
  for (const row of rows) {
    let total = 0;
    let any = false;
    for (const poste of postes) {
      const m = num(montantOf(poste.id, row.id)?.montant);
      if (m !== null) { total += m; any = true; }
    }
    if (any) totalParFournisseur.set(row.id, total);
  }
  const cheapestTotal = Math.min(...[...totalParFournisseur.values()].filter((v) => Number.isFinite(v)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase text-slate-400">Comparatif financier détaillé par poste</h4>
        <button className="text-xs text-indigo-600 hover:underline" onClick={addPoste}>+ Ajouter un poste</button>
      </div>
      {postes.length === 0 ? (
        <p className="text-xs text-slate-400 italic mb-4">
          Aucun poste. Rempli automatiquement quand une offre PDF détaillée est jointe, ou ajoutez-en manuellement ci-dessus.
        </p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-1.5 pr-2 sticky left-0 bg-white">Poste</th>
                <th className="py-1.5 pr-2 text-right">Réf.</th>
                <th className="py-1.5 pr-2 text-right">Budget (CHF)</th>
                {rows.map((row) => (
                  <th key={row.id} className="py-1.5 pr-2 text-right whitespace-nowrap">{row.fournisseur || "—"}</th>
                ))}
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {postes.map((poste) => {
                const posteValues = rows
                  .map((row) => num(montantOf(poste.id, row.id)?.montant))
                  .filter((v): v is number => v !== null);
                const posteCheapest = posteValues.length > 0 ? Math.min(...posteValues) : undefined;
                const budget = num(poste.budget);
                return (
                  <tr key={poste.id} className="border-t border-slate-100">
                    <td className="py-1 pr-2 sticky left-0 bg-white">
                      <input
                        className="input text-xs"
                        defaultValue={poste.libelle ?? ""}
                        placeholder="Libellé du poste"
                        onBlur={(e) => { if (e.target.value !== (poste.libelle ?? "")) updatePoste(poste.id, { libelle: e.target.value }); }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="input text-xs w-16 text-right"
                        defaultValue={poste.reference ?? ""}
                        placeholder="—"
                        onBlur={(e) => { if (e.target.value !== (poste.reference ?? "")) updatePoste(poste.id, { reference: e.target.value }); }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="input text-xs w-24 text-right"
                        defaultValue={poste.budget ?? ""}
                        placeholder="—"
                        onBlur={(e) => { if (e.target.value !== (poste.budget ?? "")) updatePoste(poste.id, { budget: e.target.value }); }}
                      />
                    </td>
                    {rows.map((row) => {
                      const m = montantOf(poste.id, row.id);
                      const v = num(m?.montant);
                      const isCheapest = v !== null && posteCheapest !== undefined && v === posteCheapest;
                      const ecartBudget = v !== null && budget !== null ? v - budget : null;
                      return (
                        <td key={row.id} className={`py-1 pr-2 ${isCheapest ? "bg-green-50" : ""}`}>
                          <input
                            className="input text-xs w-24 text-right"
                            defaultValue={m?.montant ?? ""}
                            placeholder="—"
                            title={m?.montantAuto ? "Montant extrait automatiquement de l'offre jointe — à vérifier" : undefined}
                            onBlur={(e) => { if (e.target.value !== (m?.montant ?? "")) updateMontant(poste.id, row.id, e.target.value); }}
                          />
                          {m?.montantAuto && <div className="text-[9px] text-amber-600 text-right">🤖</div>}
                          {ecartBudget !== null && ecartBudget !== 0 && (
                            <div className={`text-[9px] text-right ${ecartBudget > 0 ? "text-red-600" : "text-green-700"}`}>
                              {ecartBudget > 0 ? "+" : ""}{chf(ecartBudget)} vs budget
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1">
                      <button className="text-slate-300 hover:text-red-500 text-xs" title="Supprimer ce poste" onClick={() => removePoste(poste.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-1.5 pr-2 sticky left-0 bg-white" colSpan={3}>Total (somme des postes)</td>
                {rows.map((row) => {
                  const total = totalParFournisseur.get(row.id);
                  const isCheapest = total !== undefined && total === cheapestTotal;
                  return (
                    <td key={row.id} className={`py-1.5 pr-2 text-right ${isCheapest ? "text-green-700" : ""}`}>
                      {total !== undefined ? `CHF ${chf(total)}` : "—"}
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
