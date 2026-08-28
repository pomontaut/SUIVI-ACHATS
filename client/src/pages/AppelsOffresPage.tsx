import { useEffect, useMemo, useState } from "react";
import { ChantierPicker } from "../components/ChantierPicker";
import { FournisseurPicker } from "../components/FournisseurPicker";
import { FichierControl } from "../components/FichierControl";
import { Modal } from "../components/Modal";
import { EmptyLine } from "../components/dashboardUi";
import { AoPostesComparatif, type PostesComparatifHandle } from "../components/AoPostesComparatif";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { dateVal } from "../lib/tableFilter";
import { exportSheetsToExcel } from "../lib/excelExport";
import { api } from "../api";
import type { AoSujet, AppelOffre } from "../types";

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
  const { rows, add, update, remove, loading, reload } = useResource<AppelOffre>("appels-offres", {
    statut: "En cours",
    ent: opts.ENTITES[0] ?? "",
  });
  const [search, setSearch] = useState("");
  // Par défaut, n'afficher que les sujets actifs ("En cours") plutôt que
  // tout mélanger avec les sujets déjà commandés ou annulés ; le bouton
  // "Tous" reste disponible pour repasser en vue complète.
  const [statutFilter, setStatutFilter] = useState<string | null>("En cours");
  const [tcoGroupKey, setTcoGroupKey] = useState<string | null>(null);
  const [aoSujets, setAoSujets] = useState<Map<string, AoSujet>>(new Map());

  useEffect(() => {
    api.aoSujets().then((rows) => setAoSujets(new Map(rows.map((s) => [s.cle, s]))));
  }, []);

  async function updateAoSujet(cle: string, patch: { statutCommande?: string | null; numCmd?: string | null }) {
    setAoSujets((prev) => {
      const next = new Map(prev);
      const existing = next.get(cle);
      next.set(cle, { id: existing?.id ?? cle, cle, statutCommande: existing?.statutCommande ?? "En cours", numCmd: existing?.numCmd ?? null, ...patch });
      return next;
    });
    const updated = await api.updateAoSujet(cle, patch);
    setAoSujets((prev) => new Map(prev).set(cle, updated));
  }

  const searchedRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => [r.nom, r.chant, r.dem, r.fournisseur, r.prec].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [rows, search]);

  const allGroups = useMemo(() => buildAoGroups(searchedRows), [searchedRows]);

  // Le filtre rapide (Tous/En cours/Commandé/Annulé) porte sur le statut de
  // commande du SUJET (celui affiché à côté de "Générer le TCO"), pas sur
  // le statut individuel de chaque fournisseur consulté - un sujet Annulé
  // ne doit pas réapparaître sous "En cours" même si une de ses lignes l'est.
  const groups = useMemo(() => {
    if (!statutFilter) return allGroups;
    return allGroups.filter((g) => (aoSujets.get(g.key)?.statutCommande ?? "En cours") === statutFilter);
  }, [allGroups, statutFilter, aoSujets]);

  const filteredRowCount = useMemo(() => groups.reduce((n, g) => n + g.rows.length, 0), [groups]);

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
          {opts.AO_STATUT_COMMANDE_OPTS.filter(Boolean).map((s) => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs border ${statutFilter === s ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{groups.length} sujet(s) · {filteredRowCount} ligne(s)</span>
      </div>

      {groups.length === 0 ? (
        <EmptyLine text="Aucun appel d'offres." />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <AoGroupCard
              key={g.key}
              group={g}
              allGroups={groups}
              opts={opts}
              sujet={aoSujets.get(g.key) ?? null}
              onUpdateSujet={(patch) => updateAoSujet(g.key, patch)}
              onUpdateRow={update}
              onUpdateGroup={(patch) => updateGroupFields(g, patch)}
              onDeleteRow={remove}
              onAddRow={() => addRowToGroup(g)}
              onGenerateTco={() => setTcoGroupKey(g.key)}
              onFileChanged={reload}
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

      {tcoGroup && <TcoModal groupe={tcoGroup} onUpdate={update} onFileChanged={reload} onClose={() => setTcoGroupKey(null)} />}
    </div>
  );
}

function AoGroupCard({
  group,
  allGroups,
  opts,
  sujet,
  onUpdateSujet,
  onUpdateRow,
  onUpdateGroup,
  onDeleteRow,
  onAddRow,
  onGenerateTco,
  onFileChanged,
}: {
  group: AoGroup;
  allGroups: AoGroup[];
  opts: ReturnType<typeof useOptions>;
  sujet: AoSujet | null;
  onUpdateSujet: (patch: { statutCommande?: string | null; numCmd?: string | null }) => void;
  onUpdateRow: (id: string, patch: Partial<AppelOffre>) => void;
  onUpdateGroup: (patch: Partial<AppelOffre>) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: () => void;
  onGenerateTco: () => void;
  onFileChanged: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [moveRowId, setMoveRowId] = useState<string | null>(null);
  const statutCommande = sujet?.statutCommande ?? "En cours";

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
        <div className="ml-auto flex items-center gap-2">
          <select
            className="input w-28"
            value={statutCommande}
            onChange={(e) => onUpdateSujet({ statutCommande: e.target.value })}
          >
            {opts.AO_STATUT_COMMANDE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {statutCommande === "Commandé" && (
            <input
              className="input w-28"
              placeholder="N° commande"
              defaultValue={sujet?.numCmd ?? ""}
              onBlur={(e) => { if (e.target.value !== (sujet?.numCmd ?? "")) onUpdateSujet({ numCmd: e.target.value }); }}
            />
          )}
          <button
            className="text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700 whitespace-nowrap"
            onClick={onGenerateTco}
          >
            Générer le TCO
          </button>
        </div>
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
              <th className="py-1.5 px-2">Date retour max</th>
              <th className="py-1.5 px-2">Date retour</th>
              <th className="py-1.5 px-2 text-right">Offre fournisseur (HT)</th>
              <th className="py-1.5 px-2">Validation</th>
              <th className="py-1.5 px-2">Remarques</th>
              <th className="py-1.5 px-2 w-8" />
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
                  {r.operationId ? (
                    <span className="text-slate-600" title="Reprise du Lancement de l'Opérationnel">{r.dateEnvoi || "—"}</span>
                  ) : (
                    <input className="input w-24" placeholder="jj/mm/aa" defaultValue={r.dateEnvoi ?? ""} onBlur={(e) => { if (e.target.value !== (r.dateEnvoi ?? "")) onUpdateRow(r.id, { dateEnvoi: e.target.value }); }} />
                  )}
                </td>
                <td className="py-1.5 px-2">
                  {r.operationId ? (
                    <span className="text-slate-600" title="Repris du Retour max de l'Opérationnel">{r.dateRetourMax || "—"}</span>
                  ) : (
                    <input className="input w-24" placeholder="jj/mm/aa" defaultValue={r.dateRetourMax ?? ""} onBlur={(e) => { if (e.target.value !== (r.dateRetourMax ?? "")) onUpdateRow(r.id, { dateRetourMax: e.target.value }); }} />
                  )}
                </td>
                <td className="py-1.5 px-2">
                  <input className="input w-24" placeholder="jj/mm/aa" defaultValue={r.dateRetour ?? ""} onBlur={(e) => { if (e.target.value !== (r.dateRetour ?? "")) onUpdateRow(r.id, { dateRetour: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <input
                      className="input w-24 text-right"
                      defaultValue={r.offreFournisseur ?? ""}
                      title={r.offreMontantAuto ? `Montant extrait automatiquement du fichier joint — à vérifier${r.offreExtractionNote ? " : " + r.offreExtractionNote : ""}` : undefined}
                      onBlur={(e) => { if (e.target.value !== (r.offreFournisseur ?? "")) onUpdateRow(r.id, { offreFournisseur: e.target.value, offreMontantAuto: false }); }}
                    />
                    {r.offreMontantAuto && <span className="text-[9px] text-amber-600" title={r.offreExtractionNote ?? ""}>🤖 à vérifier</span>}
                    {!r.offreMontantAuto && r.offreExtractionNote && (
                      <span className="text-[9px] text-red-600 max-w-[110px] text-right" title={r.offreExtractionNote}>⚠ {r.offreExtractionNote}</span>
                    )}
                    <FichierControl
                      nom={r.offreFichierNom}
                      url={r.offreFichierUrl}
                      label="Joindre l'offre"
                      onUpload={(f) => api.uploadOffreFichier(r.id, f).then(onFileChanged)}
                      onRemove={() => api.removeOffreFichier(r.id).then(onFileChanged)}
                    />
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <select className="input" value={r.validation ?? ""} onChange={(e) => onUpdateRow(r.id, { validation: e.target.value })}>
                    <option value=""></option>
                    {opts.AO_VALIDATION_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  <input className="input" defaultValue={r.rem ?? ""} onBlur={(e) => { if (e.target.value !== (r.rem ?? "")) onUpdateRow(r.id, { rem: e.target.value }); }} />
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button className="text-slate-400 hover:text-indigo-600 text-xs" title="Déplacer vers un autre sujet" onClick={() => setMoveRowId(r.id)}>⇄</button>
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
      {moveRowId && (
        <MoveRowModal
          row={group.rows.find((r) => r.id === moveRowId)!}
          currentGroupKey={group.key}
          allGroups={allGroups}
          onMove={(patch) => { onUpdateRow(moveRowId, patch); setMoveRowId(null); }}
          onClose={() => setMoveRowId(null)}
        />
      )}
    </div>
  );
}

function MoveRowModal({
  row,
  currentGroupKey,
  allGroups,
  onMove,
  onClose,
}: {
  row: AppelOffre;
  currentGroupKey: string;
  allGroups: AoGroup[];
  onMove: (patch: Partial<AppelOffre>) => void;
  onClose: () => void;
}) {
  const targets = allGroups.filter((g) => g.key !== currentGroupKey);
  const [targetKey, setTargetKey] = useState<string>("__new__");
  const [chant, setChant] = useState("");
  const [nom, setNom] = useState("");
  const [prec, setPrec] = useState("");
  const [date, setDate] = useState(row.date ?? "");

  function confirm() {
    if (targetKey === "__new__") {
      onMove({ operationId: null, chant: chant || null, nom: nom || null, prec: prec || null, date: date || null });
      return;
    }
    const target = targets.find((g) => g.key === targetKey);
    if (!target) return;
    onMove({ operationId: null, chant: target.chant || null, nom: target.nom === "—" ? null : target.nom, prec: target.prec === "—" ? null : target.prec, date: target.date });
  }

  return (
    <Modal title={`Déplacer "${row.fournisseur}" vers un autre sujet`} onClose={onClose}>
      <div className="space-y-2">
        <p className="text-xs text-slate-500">Ce fournisseur quittera son rattachement automatique et sera géré manuellement sous le sujet choisi.</p>
        <select className="input" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
          <option value="__new__">— Nouveau sujet —</option>
          {targets.map((g) => (
            <option key={g.key} value={g.key}>AO {g.numeroAO} — {g.chant || "sans chantier"} — {g.nom} — {g.prec}</option>
          ))}
        </select>
        {targetKey === "__new__" && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-xs text-slate-500">N° de chantier</label>
              <ChantierPicker numero={chant || null} onSelect={(numero, n) => { setChant(numero); if (n !== null) setNom(n); }} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Nom du chantier</label>
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Objet de l'AO</label>
              <input className="input" value={prec} onChange={(e) => setPrec(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Date</label>
              <input className="input" placeholder="jj/mm/aa" value={date ?? ""} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className="text-xs text-slate-500 px-3 py-1.5" onClick={onClose}>Annuler</button>
          <button className="text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700" onClick={confirm}>Déplacer</button>
        </div>
      </div>
    </Modal>
  );
}

function TcoModal({ groupe, onUpdate, onFileChanged, onClose }: { groupe: AoGroup; onUpdate: (id: string, patch: Partial<AppelOffre>) => void; onFileChanged: () => void; onClose: () => void }) {
  const [postesData, setPostesData] = useState<PostesComparatifHandle | null>(null);
  const offres = groupe.rows
    .map((r) => ({ row: r, montant: parseFloat(r.offreFournisseur ?? "") }))
    .sort((a, b) => {
      const am = Number.isNaN(a.montant) ? Infinity : a.montant;
      const bm = Number.isNaN(b.montant) ? Infinity : b.montant;
      return am - bm;
    });
  const cheapest = offres.find((o) => !Number.isNaN(o.montant))?.montant;

  function exportTco() {
    const sheets: { name: string; rows: Record<string, string | number>[] }[] = [
      {
        name: "Comparatif financier",
        rows: offres.map(({ row, montant }) => ({
          Fournisseur: row.fournisseur ?? "",
          "Offre HT (CHF)": row.offreFournisseur ?? "",
          "Écart vs moins cher (CHF)": !Number.isNaN(montant) && cheapest !== undefined && montant > cheapest ? montant - cheapest : "",
          Statut: row.statut ?? "",
          Validation: row.validation ?? "",
          "Remarque extraction auto": row.offreMontantAuto ? "Montant extrait automatiquement — à vérifier" : (row.offreExtractionNote ?? ""),
        })),
      },
    ];
    if (postesData && postesData.postes.length > 0) {
      const num = (v: string | null | undefined) => { const n = parseFloat(String(v ?? "")); return Number.isNaN(n) ? null : n; };
      sheets.push({
        name: "Comparatif par poste",
        rows: postesData.postes.map((poste) => {
          const row: Record<string, string | number> = {
            "Réf.": poste.reference ?? "",
            Poste: poste.libelle ?? "",
            "Budget (CHF)": poste.budget ?? "",
          };
          const posteValues: number[] = [];
          for (const r of groupe.rows) {
            const m = postesData.montants.find((x) => x.posteId === poste.id && x.appelOffreId === r.id);
            const v = num(m?.montant);
            if (v !== null) posteValues.push(v);
            row[`${r.fournisseur ?? "—"} (CHF)`] = m?.montant ?? "";
          }
          const posteCheapest = posteValues.length > 0 ? Math.min(...posteValues) : null;
          for (const r of groupe.rows) {
            const m = postesData.montants.find((x) => x.posteId === poste.id && x.appelOffreId === r.id);
            const v = num(m?.montant);
            row[`${r.fournisseur ?? "—"} — écart vs moins cher`] = v !== null && posteCheapest !== null && v > posteCheapest ? v - posteCheapest : "";
          }
          return row;
        }),
      });
    }
    sheets.push({
      name: "Comparatif technique",
      rows: groupe.rows.map((row) => ({
        Fournisseur: row.fournisseur ?? "",
        "Notes techniques / logistiques": row.comparatifTechnique ?? "",
      })),
    });
    exportSheetsToExcel(sheets, `TCO-${groupe.numeroAO}-${groupe.chant || "sanschantier"}`);
  }

  return (
    <Modal wide title={`TCO — AO ${groupe.numeroAO} — ${groupe.nom}${groupe.chant ? ` (chantier ${groupe.chant})` : ""}`} onClose={onClose}>
      <div className="max-h-[75vh] overflow-auto -m-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500">{groupe.prec}</p>
          <button className="text-xs text-indigo-600 hover:underline whitespace-nowrap" onClick={exportTco}>
            ⬇ Exporter en Excel
          </button>
        </div>
        <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Comparatif financier (HT)</h4>
        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5 pr-2">Fournisseur</th>
              <th className="py-1.5 pr-2 text-right">Offre HT (CHF)</th>
              <th className="py-1.5 pr-2 text-right">Écart vs moins cher</th>
              <th className="py-1.5 pr-2">Statut</th>
              <th className="py-1.5">Document</th>
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
                      title={row.offreMontantAuto ? "Montant extrait automatiquement du fichier joint — à vérifier" : undefined}
                      onBlur={(e) => { if (e.target.value !== (row.offreFournisseur ?? "")) onUpdate(row.id, { offreFournisseur: e.target.value, offreMontantAuto: false }); }}
                    />
                    {row.offreMontantAuto && <div className="text-[9px] text-amber-600 text-right">🤖 à vérifier</div>}
                    {!row.offreMontantAuto && row.offreExtractionNote && (
                      <div className="text-[9px] text-red-600 text-right" title={row.offreExtractionNote}>⚠ {row.offreExtractionNote}</div>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-slate-500">
                    {!Number.isNaN(montant) && cheapest !== undefined && montant > cheapest ? `+CHF ${chf(montant - cheapest)}` : "—"}
                  </td>
                  <td className="py-1.5 pr-2">{row.statut || "—"}</td>
                  <td className="py-1.5">
                    <FichierControl
                      nom={row.offreFichierNom}
                      url={row.offreFichierUrl}
                      label="Joindre l'offre"
                      onUpload={(f) => api.uploadOffreFichier(row.id, f).then(onFileChanged)}
                      onRemove={() => api.removeOffreFichier(row.id).then(onFileChanged)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <AoPostesComparatif sujetCle={groupe.key} rows={groupe.rows} onDataChanged={setPostesData} />

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
