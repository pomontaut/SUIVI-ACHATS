import { useMemo, useState } from "react";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { Modal } from "../components/Modal";
import { EmptyLine } from "../components/dashboardUi";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { dateVal } from "../lib/tableFilter";
import type { AppelOffre } from "../types";

const chf = (v: number) => new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(v);

/** Convertit une date jj/mm/aa(aa) ou jj.mm.aa(aa) en clé compacte AAAAMMJJ
 * pour construire le n° d'AO ; retombe sur les chiffres bruts si le format
 * ne correspond pas. */
function dateCompact(d: string | null): string {
  if (!d) return "SANSDATE";
  const m = d.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (!m) return d.replace(/\D/g, "") || "SANSDATE";
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${yy}${mm}${dd}`;
}

interface AoGroup {
  key: string;
  numeroAO: string;
  date: string | null;
  chant: string;
  nom: string;
  ent: string;
  dem: string;
  prec: string;
  auto: boolean; // au moins une ligne générée automatiquement (TCO=oui) -> chant/nom/objet en lecture seule
  rows: AppelOffre[];
}

/** Un "sujet AO" = même date + même chantier + même objet (Précisions) - un
 * numéro d'AO par sujet, avec un suffixe -2/-3... si plusieurs sujets
 * distincts partagent la même date + le même chantier. */
function buildAoGroups(rows: AppelOffre[]): AoGroup[] {
  const groups = new Map<string, AoGroup>();
  const order: string[] = [];
  for (const r of rows) {
    const gkey = `${r.date ?? ""}|${r.chant ?? ""}|${(r.prec ?? "").trim().toLowerCase()}`;
    let g = groups.get(gkey);
    if (!g) {
      g = {
        key: gkey, numeroAO: "", date: r.date, chant: r.chant ?? "", nom: r.nom || "—",
        ent: r.ent ?? "", dem: r.dem ?? "", prec: r.prec || "—", auto: false, rows: [],
      };
      groups.set(gkey, g);
      order.push(gkey);
    }
    if (r.operationId) g.auto = true;
    g.rows.push(r);
  }
  const seenDateChant = new Map<string, number>();
  for (const gkey of order) {
    const g = groups.get(gkey)!;
    const dcKey = `${g.date ?? ""}|${g.chant}`;
    const n = (seenDateChant.get(dcKey) ?? 0) + 1;
    seenDateChant.set(dcKey, n);
    const base = `${dateCompact(g.date)}-${g.chant || "SANSCHANT"}`;
    g.numeroAO = n === 1 ? base : `${base}-${n}`;
  }
  return [...groups.values()].sort((a, b) => dateVal(b.date) - dateVal(a.date));
}

export function AppelsOffresPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<AppelOffre>("appels-offres", {
    statut: "En cours",
    ent: opts.ENTITES[0] ?? "",
  });
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string | null>(null);
  const [tcoGroupKey, setTcoGroupKey] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    let res = rows;
    if (statutFilter) res = res.filter((r) => (r.statut ?? "En cours") === statutFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      res = res.filter((r) => [r.nom, r.chant, r.dem, r.fournisseur, r.prec].some((v) => (v ?? "").toLowerCase().includes(s)));
    }
    return res;
  }, [rows, search, statutFilter]);

  const groups = useMemo(() => buildAoGroups(filteredRows), [filteredRows]);
  const tcoGroup = groups.find((g) => g.key === tcoGroupKey) ?? null;

  function updateGroupFields(g: AoGroup, patch: Partial<AppelOffre>) {
    for (const r of g.rows) update(r.id, patch);
  }

  function addRowToGroup(g: AoGroup) {
    add({ date: g.date, chant: g.chant || null, nom: g.nom === "—" ? null : g.nom, prec: g.prec === "—" ? null : g.prec, ent: g.ent || null });
  }

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Appels d'offres ({rows.length})</h2>
      <p className="text-xs text-slate-500 mb-3">
        Les lignes sont regroupées par sujet (même date + même chantier + même objet) sous un n° d'AO.
        Cliquez sur "Générer le TCO" pour comparer les offres reçues (financier HT + technique/logistique).
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setStatutFilter(null)}
            className={`px-2.5 py-1 rounded-full text-xs border ${statutFilter === null ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          >
            Tous
          </button>
          {opts.AO_STATUT_OPTS.filter(Boolean).map((s) => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs border ${statutFilter === s ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{groups.length} sujet(s) · {filteredRows.length} ligne(s)</span>
      </div>

      {groups.length === 0 ? (
        <EmptyLine text="Aucun appel d'offres." />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <AoGroupCard
              key={g.key}
              group={g}
              opts={opts}
              onUpdateRow={update}
              onUpdateGroup={(patch) => updateGroupFields(g, patch)}
              onDeleteRow={remove}
              onAddRow={() => addRowToGroup(g)}
              onGenerateTco={() => setTcoGroupKey(g.key)}
            />
          ))}
        </div>
      )}

      <button
        className="mt-3 rounded bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700"
        onClick={() => add()}
      >
        + Ajouter un nouvel appel d'offres
      </button>

      {tcoGroup && <TcoModal groupe={tcoGroup} onUpdate={update} onClose={() => setTcoGroupKey(null)} />}
    </div>
  );
}

function AoGroupCard({
  group,
  opts,
  onUpdateRow,
  onUpdateGroup,
  onDeleteRow,
  onAddRow,
  onGenerateTco,
}: {
  group: AoGroup;
  opts: ReturnType<typeof useOptions>;
  onUpdateRow: (id: string, patch: Partial<AppelOffre>) => void;
  onUpdateGroup: (patch: Partial<AppelOffre>) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: () => void;
  onGenerateTco: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-2 flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-white border border-indigo-200 rounded px-1.5 py-0.5">
          AO {group.numeroAO}
        </span>
        {group.auto ? (
          <span className="text-xs">
            <span className="font-medium">{group.chant || "—"}</span> — {group.nom} · <span className="text-slate-600">{group.prec}</span>
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ChantierPicker
              numero={group.chant || null}
              onSelect={(numero, nom) => onUpdateGroup(nom !== null ? { chant: numero, nom } : { chant: numero })}
            />
            <input
              className="input w-36"
              defaultValue={group.prec === "—" ? "" : group.prec}
              placeholder="Objet de l'AO"
              onBlur={(e) => { if (e.target.value !== group.prec) onUpdateGroup({ prec: e.target.value }); }}
            />
            <input
              className="input w-24"
              defaultValue={group.date ?? ""}
              placeholder="jj/mm/aa"
              onBlur={(e) => { if (e.target.value !== (group.date ?? "")) onUpdateGroup({ date: e.target.value }); }}
            />
          </div>
        )}
        <button
          className="ml-auto text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700 whitespace-nowrap"
          onClick={onGenerateTco}
        >
          Générer le TCO
        </button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5 px-2">Statut</th>
              <th className="py-1.5 px-2">Entité</th>
              <th className="py-1.5 px-2">Demandeur</th>
              <th className="py-1.5 px-2">Fournisseur consulté</th>
              <th className="py-1.5 px-2">Date envoi</th>
              <th className="py-1.5 px-2">Date retour</th>
              <th className="py-1.5 px-2 text-right">Offre fournisseur (HT)</th>
              <th className="py-1.5 px-2">Remarques</th>
              <th className="py-1.5 px-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5 px-2">
                  <select className="input" value={r.statut ?? ""} onChange={(e) => onUpdateRow(r.id, { statut: e.target.value })}>
                    <option value=""></option>
                    {opts.AO_STATUT_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  <select className="input" value={r.ent ?? ""} onChange={(e) => onUpdateRow(r.id, { ent: e.target.value })}>
                    <option value=""></option>
                    {opts.ENTITES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  <input className="input" defaultValue={r.dem ?? ""} onBlur={(e) => { if (e.target.value !== (r.dem ?? "")) onUpdateRow(r.id, { dem: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2">
                  <FournisseurPicker value={r.fournisseur} onChange={(v) => onUpdateRow(r.id, { fournisseur: v })} />
                </td>
                <td className="py-1.5 px-2">
                  <input className="input w-24" placeholder="jj/mm/aa" defaultValue={r.dateEnvoi ?? ""} onBlur={(e) => { if (e.target.value !== (r.dateEnvoi ?? "")) onUpdateRow(r.id, { dateEnvoi: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2">
                  <input className="input w-24" placeholder="jj/mm/aa" defaultValue={r.dateRetour ?? ""} onBlur={(e) => { if (e.target.value !== (r.dateRetour ?? "")) onUpdateRow(r.id, { dateRetour: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <input className="input w-24 text-right" defaultValue={r.offreFournisseur ?? ""} onBlur={(e) => { if (e.target.value !== (r.offreFournisseur ?? "")) onUpdateRow(r.id, { offreFournisseur: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2">
                  <input className="input" defaultValue={r.rem ?? ""} onBlur={(e) => { if (e.target.value !== (r.rem ?? "")) onUpdateRow(r.id, { rem: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2 text-center">
                  {confirmId === r.id ? (
                    <div className="flex gap-1 justify-center">
                      <button className="text-red-600 text-xs font-semibold" onClick={() => { onDeleteRow(r.id); setConfirmId(null); }}>Oui</button>
                      <button className="text-slate-400 text-xs" onClick={() => setConfirmId(null)}>Non</button>
                    </div>
                  ) : (
                    <button className="text-slate-400 hover:text-red-600 text-xs" title="Supprimer" onClick={() => setConfirmId(r.id)}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 border-t border-slate-100">
        <button className="text-xs text-indigo-600 hover:underline" onClick={onAddRow}>+ Ajouter un fournisseur consulté</button>
      </div>
    </div>
  );
}

function TcoModal({ groupe, onUpdate, onClose }: { groupe: AoGroup; onUpdate: (id: string, patch: Partial<AppelOffre>) => void; onClose: () => void }) {
  const offres = groupe.rows
    .map((r) => ({ row: r, montant: parseFloat(r.offreFournisseur ?? "") }))
    .sort((a, b) => {
      const am = Number.isNaN(a.montant) ? Infinity : a.montant;
      const bm = Number.isNaN(b.montant) ? Infinity : b.montant;
      return am - bm;
    });
  const cheapest = offres.find((o) => !Number.isNaN(o.montant))?.montant;

  return (
    <Modal title={`TCO — AO ${groupe.numeroAO} — ${groupe.nom}${groupe.chant ? ` (chantier ${groupe.chant})` : ""}`} onClose={onClose}>
      <div className="max-w-none w-[70vw] max-h-[75vh] overflow-auto -m-4 p-4">
        <p className="text-xs text-slate-500 mb-3">{groupe.prec}</p>
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
                    {!Number.isNaN(montant) && cheapest !== undefined && montant > cheapest ? `+CHF ${chf(montant - cheapest)}` : "—"}
                  </td>
                  <td className="py-1.5">{row.statut || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Comparatif technique / logistique</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {groupe.rows.map((row) => (
            <div key={row.id} className="border border-slate-200 rounded-lg p-2.5">
              <div className="text-xs font-medium mb-1">{row.fournisseur}</div>
              <textarea
                className="input w-full h-20 text-xs"
                placeholder="Notes techniques / logistiques (conformité, délai, garantie...)"
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
