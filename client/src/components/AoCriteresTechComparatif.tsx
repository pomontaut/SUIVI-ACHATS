import { useEffect, useState } from "react";
import { api } from "../api";
import type { AoCritereTech, AoCritereTechValeur, AppelOffre } from "../types";

export interface CriteresTechComparatifHandle {
  criteres: AoCritereTech[];
  valeurs: AoCritereTechValeur[];
}

// Score attribué à une valeur reconnue, pour la ligne de synthèse calculée à
// l'export (à l'image des comparatifs de référence transmis par
// l'utilisateur : ✓✓ = excellent, ✓ = conforme, ~ = acceptable avec
// réserve, ✗ = insuffisant, ? = information manquante).
export const CRITERE_SCORE: Record<string, number> = { "✓✓": 2, "✓": 1, "~": 0.5, "✗": 0, "?": 0 };

/** Comparatif technique/logistique détaillé critère par critère d'un sujet
 * AO (norme, matériau, sécurité, délai...), en liste libre par sujet, à
 * l'image des comparatifs de référence transmis par l'utilisateur. Chaque
 * critère porte une valeur libre par fournisseur (texte descriptif, ou une
 * notation ✓✓/✓/~/✗/? pour alimenter le score de synthèse à l'export) et une
 * remarque/analyse commune à tous les fournisseurs. */
export function AoCriteresTechComparatif({ sujetCle, rows, onDataChanged }: { sujetCle: string; rows: AppelOffre[]; onDataChanged?: (h: CriteresTechComparatifHandle) => void }) {
  const [criteres, setCriteres] = useState<AoCritereTech[]>([]);
  const [valeurs, setValeurs] = useState<AoCritereTechValeur[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const data = await api.aoCriteresTech(sujetCle);
    setCriteres(data.criteres);
    setValeurs(data.valeurs);
    setLoading(false);
    onDataChanged?.(data);
  }

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sujetCle]);

  function valeurDe(critereId: string, appelOffreId: string): AoCritereTechValeur | undefined {
    return valeurs.find((v) => v.critereId === critereId && v.appelOffreId === appelOffreId);
  }

  async function addCritere() {
    await api.addAoCritereTech({ sujetCle, libelle: "Nouveau critère" });
    await reload();
  }
  async function updateCritere(id: string, patch: { libelle?: string; remarque?: string }) {
    await api.updateAoCritereTech(id, patch);
    await reload();
  }
  async function removeCritere(id: string) {
    await api.removeAoCritereTech(id);
    await reload();
  }
  async function updateValeur(critereId: string, appelOffreId: string, value: string) {
    await api.updateAoCritereTechValeur(critereId, appelOffreId, value || null);
    await reload();
  }

  if (loading) return <p className="text-xs text-slate-400">Chargement des critères…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase text-slate-400">Comparatif technique par critère</h4>
        <button className="text-xs text-indigo-600 hover:underline" onClick={addCritere}>+ Ajouter un critère</button>
      </div>
      {criteres.length === 0 ? (
        <p className="text-xs text-slate-400 italic mb-4">
          Aucun critère. Ajoutez-en un pour comparer norme, matériau, sécurité, délai... entre fournisseurs (ex: noter ✓✓/✓/~/✗/? pour obtenir un score de synthèse à l'export).
        </p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-1.5 pr-2 sticky left-0 bg-white">Critère</th>
                {rows.map((row) => (
                  <th key={row.id} className="py-1.5 pr-2 whitespace-nowrap">{row.fournisseur || "—"}</th>
                ))}
                <th className="py-1.5 pr-2">Remarque / analyse</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {criteres.map((critere) => (
                <tr key={critere.id} className="border-t border-slate-100 align-top">
                  <td className="py-1 pr-2 sticky left-0 bg-white">
                    <input
                      className="input text-xs"
                      defaultValue={critere.libelle ?? ""}
                      placeholder="Libellé du critère"
                      onBlur={(e) => { if (e.target.value !== (critere.libelle ?? "")) updateCritere(critere.id, { libelle: e.target.value }); }}
                    />
                  </td>
                  {rows.map((row) => {
                    const v = valeurDe(critere.id, row.id);
                    return (
                      <td key={row.id} className="py-1 pr-2">
                        <input
                          className="input text-xs"
                          defaultValue={v?.valeur ?? ""}
                          placeholder="—"
                          onBlur={(e) => { if (e.target.value !== (v?.valeur ?? "")) updateValeur(critere.id, row.id, e.target.value); }}
                        />
                      </td>
                    );
                  })}
                  <td className="py-1 pr-2">
                    <input
                      className="input text-xs"
                      defaultValue={critere.remarque ?? ""}
                      placeholder="—"
                      onBlur={(e) => { if (e.target.value !== (critere.remarque ?? "")) updateCritere(critere.id, { remarque: e.target.value }); }}
                    />
                  </td>
                  <td className="py-1">
                    <button className="text-slate-300 hover:text-red-500 text-xs" title="Supprimer ce critère" onClick={() => removeCritere(critere.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
