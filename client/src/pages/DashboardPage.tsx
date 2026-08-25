import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useOptions } from "../hooks/useOptions";
import { useResource } from "../hooks/useResource";
import {
  actionsPrioritaires,
  bilanPeriode,
  depFourn,
  entiteBreakdown,
  etapeBreakdown,
  fournitureBreakdown,
  gainByTypeBreakdown,
  kpis,
  needsWarningForDeadline,
  pertBreakdown,
  prochainesLivraisons,
  dashLivraisons,
  tauxService,
  top10Priorites,
  tranchesBreakdown,
  type DashLivStatus,
} from "../lib/dashboard";
import { PrioBadge } from "../components/PrioBadge";
import type { Operation, Todo, Transverse, Livraison } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chf = (v: number) => new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(v);

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardPage() {
  const operations = useResource<Operation>("operations", {});
  const transverses = useResource<Transverse>("transverses", {});
  const todos = useResource<Todo>("todos", {});
  const livraisons = useResource<Livraison>("livraisons", {});

  if (operations.loading || transverses.loading || todos.loading || livraisons.loading) {
    return <p className="p-4 text-slate-500">Chargement du tableau de bord…</p>;
  }

  return (
    <DashboardContent
      operations={operations.rows}
      transverses={transverses.rows}
      todos={todos.rows}
      livraisons={livraisons.rows}
      updateOperation={operations.update}
    />
  );
}

function DashboardContent({
  operations,
  transverses,
  todos,
  livraisons,
  updateOperation,
}: {
  operations: Operation[];
  transverses: Transverse[];
  todos: Todo[];
  livraisons: Livraison[];
  updateOperation: (id: string, patch: Partial<Operation>) => void;
}) {
  const opts = useOptions();
  const k = useMemo(() => kpis(operations), [operations]);
  const etapeData = useMemo(() => etapeBreakdown(operations), [operations]);
  const entiteData = useMemo(() => entiteBreakdown(operations), [operations]);
  const fournData = useMemo(() => fournitureBreakdown(operations), [operations]);
  const tranches = useMemo(() => tranchesBreakdown(operations, opts.TRANCHES), [operations, opts.TRANCHES]);
  const pert = useMemo(() => pertBreakdown(operations, opts.PERT_CATS), [operations, opts.PERT_CATS]);
  const gainType = useMemo(() => gainByTypeBreakdown(operations), [operations]);
  const prioritaires = useMemo(() => actionsPrioritaires(todos), [todos]);
  const prochLiv = useMemo(() => prochainesLivraisons(operations), [operations]);
  const ts = useMemo(() => tauxService(livraisons), [livraisons]);
  const depF = useMemo(() => depFourn(operations), [operations]);
  const top10 = useMemo(() => top10Priorites(operations, transverses, todos), [operations, transverses, todos]);

  return (
    <div className="space-y-6">
      <Top10Priorites items={top10} />
      <KpiRow k={k} />
      <BilanPeriode operations={operations} transverses={transverses} todos={todos} />

      <div className="grid md:grid-cols-3 gap-4">
        <ChartCard title="Statut des sujets">
          <Doughnut
            data={{ labels: etapeData.map((d) => d.label), datasets: [{ data: etapeData.map((d) => d.value), backgroundColor: etapeData.map((d) => d.color), borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 9, font: { size: 10 } } } } }}
          />
        </ChartCard>
        <ChartCard title="Sujets par entité">
          <Bar
            data={{ labels: entiteData.map((d) => d.label), datasets: [{ data: entiteData.map((d) => d.value), backgroundColor: entiteData.map((d) => d.color), borderRadius: 4 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#e1e0d9" }, beginAtZero: true } } }}
          />
        </ChartCard>
        <ChartCard title="Types de fournitures">
          <Doughnut
            data={{ labels: fournData.map((d) => d.label), datasets: [{ data: fournData.map((d) => d.value), backgroundColor: fournData.map((d) => d.color), borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 9, font: { size: 10 } } } } }}
          />
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Commandes par tranche de montant">
          <div className="space-y-2">
            {tranches.map((t) => {
              const maxCount = Math.max(...tranches.map((x) => x.count), 1);
              return (
                <div key={t.lbl} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-36 shrink-0">{t.lbl}</span>
                  <div className="flex-1 bg-slate-100 rounded h-3.5 overflow-hidden">
                    <div className="h-3.5 rounded" style={{ width: `${Math.round((t.count / maxCount) * 100)}%`, background: t.col }} />
                  </div>
                  <span className="text-xs font-medium w-28 text-right" style={{ color: t.col }}>{t.count} cmd · CHF {chf(t.total)}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Indicateur de pertinence des commandes" subtitle={`${pert.totalCmd} commandes`}>
          <div className="grid grid-cols-3 gap-2">
            {pert.rows.map((p) => (
              <div key={p.key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-slate-500">{p.label}</div>
                <div className="text-lg font-medium text-indigo-700">{p.count}</div>
                <div className="text-[11px] text-slate-500">{p.pct}%</div>
                <div className="text-[11px] text-violet-700 font-medium">CHF {chf(p.total)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Répartition du gain par typologie">
          <Doughnut
            data={{ labels: gainType.rows.map((r) => r.key), datasets: [{ data: gainType.rows.map((r) => r.value), backgroundColor: gainType.rows.map((r) => r.color), borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 9, font: { size: 10 } } } } }}
          />
        </ChartCard>
        <Card title="Détail du gain par typologie" subtitle={`Total CHF ${chf(gainType.total)}`}>
          <div className="grid grid-cols-3 gap-2">
            {gainType.rows.map((r) => (
              <div key={r.key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-slate-500">{r.key}</div>
                <div className="text-base font-medium" style={{ color: r.color }}>{r.pct}%</div>
                <div className="text-[11px] text-violet-700 font-medium">CHF {chf(r.value)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card title="Actions prioritaires (actives uniquement)">
            {prioritaires.length === 0 ? (
              <EmptyLine text="Aucune action active." />
            ) : (
              <div className="space-y-1.5">
                {prioritaires.map((t) => {
                  const warn = t.deadlineAction && needsWarningForDeadline(t.deadlineAction);
                  return (
                    <div key={t.id} className={`flex gap-2.5 p-2.5 rounded-lg border ${prioBorder(t.prio)} bg-slate-50`}>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded h-fit ${prioBadge(t.prio)}`}>
                        {t.prio}
                        {warn ? " ⚠️" : ""}
                      </span>
                      <div>
                        <div className="text-[10px] text-slate-500">{t.qui}</div>
                        <div className="text-xs font-medium my-0.5">{t.quoi}</div>
                        {t.deadline && <div className="text-[10px] text-slate-500">📅 {t.deadline}</div>}
                        {t.action && <div className="text-[10px] text-indigo-700">→ {t.action}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        <Card title="Sujets transverses">
          {transverses.length === 0 ? (
            <EmptyLine text="Aucun sujet." />
          ) : (
            <div className="space-y-1.5">
              {transverses.slice(0, 6).map((t) => (
                <div key={t.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t.nom}</span>
                    {t.retour && <span className="text-[10px] text-slate-400 font-normal">{t.retour}</span>}
                  </div>
                  <div className="text-[10px] text-slate-500">{t.dem} — {t.ent}</div>
                  {t.action && <div className="text-[10px] text-indigo-700 mt-0.5">→ {t.action}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Prochaines livraisons">
        {prochLiv.length === 0 ? (
          <EmptyLine text="Aucune livraison planifiée." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-400">
                  <th className="py-1.5 pr-2">Date livraison</th>
                  <th className="py-1.5 pr-2">N° cmd</th>
                  <th className="py-1.5 pr-2">Fournisseur</th>
                  <th className="py-1.5 pr-2">Produit</th>
                  <th className="py-1.5 pr-2">Chantier</th>
                  <th className="py-1.5 text-right">Montant CHF</th>
                </tr>
              </thead>
              <tbody>
                {prochLiv.map(({ operation: o, urgent, attention }) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className={`py-1.5 pr-2 ${urgent ? "text-red-700 font-semibold" : attention ? "text-amber-700 font-medium" : ""}`}>
                      {o.dateLivraison}
                      {urgent ? " ⚠️" : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-indigo-700 font-medium">{o.numCmd || "—"}</td>
                    <td className="py-1.5 pr-2">{o.fournisseur || "—"}</td>
                    <td className="py-1.5 pr-2">{o.prec || o.fourn || "—"}</td>
                    <td className="py-1.5 pr-2">{o.nom || "—"}</td>
                    <td className="py-1.5 text-right">{o.montant && parseFloat(o.montant) ? `CHF ${chf(parseFloat(o.montant))}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Taux de service global">
          {ts.denom === 0 ? (
            <EmptyLine text="Aucune réception saisie — renseignez les dates dans l'onglet Livraisons." />
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <div className="text-3xl font-semibold" style={{ color: ts.tsColor }}>{ts.ts}%</div>
                  <div className="text-[10px] uppercase text-slate-400">Taux de service</div>
                </div>
                <div className="flex-1">
                  <div className="bg-slate-100 rounded h-4 overflow-hidden">
                    <div className="h-4 rounded transition-all" style={{ width: `${ts.ts}%`, background: ts.tsColor }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-slate-600">
                    <div>{ts.onTimeCount} livrés à temps</div>
                    <div>{ts.retardTotalCount} en retard</div>
                    <div>{ts.denom} / {ts.totalLiv} évaluées</div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic">
                Basé sur les livraisons clôturées et les en cours dont l'échéance est dépassée
                {ts.avgRetardDays !== null ? ` · retard moyen ${ts.avgRetardDays}j` : ""}
              </p>
            </div>
          )}
        </Card>
        <Card title="Taux de service par fournisseur">
          {ts.byFournisseur.length === 0 ? (
            <EmptyLine text="Aucune donnée." />
          ) : (
            <div className="max-h-56 overflow-auto space-y-1.5">
              {ts.byFournisseur.map((f) => (
                <div key={f.fournisseur} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate shrink-0">{f.fournisseur}</span>
                  <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
                    <div className="h-3 rounded" style={{ width: `${f.pct}%`, background: f.color }} />
                  </div>
                  <span className="w-24 text-right font-medium" style={{ color: f.color }}>{f.pct}% ({f.ok}/{f.total})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Dépense par fournisseur" subtitle="(montants commandés, triés par montant)">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-1.5 pr-2">Fournisseur</th>
                <th className="py-1.5 pr-2 w-40">Répartition</th>
                <th className="py-1.5 pr-2 text-right">Montant CHF</th>
                <th className="py-1.5 pr-2 text-right">%</th>
                <th className="py-1.5 text-right">Cmd</th>
              </tr>
            </thead>
            <tbody>
              {depF.rows.map((r) => (
                <tr key={r.fournisseur} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2">{r.fournisseur}</td>
                  <td className="py-1.5 pr-2">
                    <div className="bg-slate-100 rounded h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded" style={{ width: `${Math.round((r.total / depF.maxTotal) * 100)}%`, background: r.color }} />
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium" style={{ color: r.color }}>{chf(r.total)}</td>
                  <td className="py-1.5 pr-2 text-right text-slate-500">{r.pct}%</td>
                  <td className="py-1.5 text-right text-slate-500">{r.count}</td>
                </tr>
              ))}
              {depF.rows.length > 0 && (
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-1.5 pr-2">Total</td>
                  <td />
                  <td className="py-1.5 pr-2 text-right">{chf(depF.total)}</td>
                  <td className="py-1.5 pr-2 text-right">100%</td>
                  <td className="py-1.5 text-right">{depF.rows.reduce((s, r) => s + r.count, 0)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {depF.rows.length === 0 && <EmptyLine text="Aucune dépense enregistrée." />}
        </div>
      </Card>

      <LivraisonsEnCours operations={operations} onUpdate={updateOperation} />
    </div>
  );
}

function LivraisonsEnCours({ operations, onUpdate }: { operations: Operation[]; onUpdate: (id: string, patch: Partial<Operation>) => void }) {
  const [filter, setFilter] = useState<"tous" | DashLivStatus | "livre">("tous");
  const rows = useMemo(() => dashLivraisons(operations), [operations]);
  const filtered = rows.filter((r) => {
    if (filter === "tous") return true;
    if (filter === "livre") return r.status === "livre_ok" || r.status === "livre_retard";
    return r.status === filter;
  });

  return (
    <Card title="Livraisons en cours / non livrées" subtitle={`${filtered.length} résultat(s)`}>
      <div className="flex gap-1.5 mb-3">
        {(["tous", "encours", "retard", "livre"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs border ${filter === f ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          >
            {f === "tous" ? "Tous" : f === "encours" ? "En cours" : f === "retard" ? "En retard" : "Clôturés"}
          </button>
        ))}
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5 pr-2">Statut</th>
              <th className="py-1.5 pr-2">N° cmd</th>
              <th className="py-1.5 pr-2">Fournisseur</th>
              <th className="py-1.5 pr-2">Chantier</th>
              <th className="py-1.5 pr-2">Produit</th>
              <th className="py-1.5 pr-2">Date liv. prévue</th>
              <th className="py-1.5 pr-2">Date liv. réelle</th>
              <th className="py-1.5 pr-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.operation.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2"><LivBadge status={r.status} /></td>
                <td className="py-1.5 pr-2 text-indigo-700 font-medium">{r.operation.numCmd || "—"}</td>
                <td className="py-1.5 pr-2">{r.operation.fournisseur || "—"}</td>
                <td className="py-1.5 pr-2">{r.operation.nom || r.operation.chant || "—"}</td>
                <td className="py-1.5 pr-2">{r.operation.prec || r.operation.fourn || "—"}</td>
                <td className={`py-1.5 pr-2 ${r.status === "retard" ? "text-red-700 font-semibold" : r.attention ? "text-amber-700 font-medium" : ""}`}>
                  {r.operation.dateLivraison || "—"}
                  {r.urgent ? " ⚠️" : ""}
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className="input w-28"
                    placeholder="jj/mm/aa"
                    defaultValue={r.operation.dateLivraisonReelle ?? ""}
                    onBlur={(e) => onUpdate(r.operation.id, { dateLivraisonReelle: e.target.value })}
                  />
                </td>
                <td className="py-1.5 text-right">{r.operation.montant && parseFloat(r.operation.montant) ? `CHF ${chf(parseFloat(r.operation.montant))}` : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8}><EmptyLine text="Aucune livraison." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LivBadge({ status }: { status: DashLivStatus }) {
  const map: Record<DashLivStatus, { label: string; cls: string }> = {
    livre_ok: { label: "✓ Livré OK", cls: "bg-green-100 text-green-800" },
    livre_retard: { label: "Livré (retard)", cls: "bg-red-100 text-red-800" },
    retard: { label: "⚠ Retard", cls: "bg-red-100 text-red-800" },
    encours: { label: "En cours", cls: "bg-amber-100 text-amber-800" },
  };
  const m = map[status];
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${m.cls}`}>{m.label}</span>;
}

function BilanPeriode({ operations, transverses, todos }: { operations: Operation[]; transverses: Transverse[]; todos: Todo[] }) {
  const [fromKey, setFromKey] = useState(currentMonthKey());
  const [toKey, setToKey] = useState(currentMonthKey());
  const [statusFilter, setStatusFilter] = useState<"tous" | "encours" | "fin">("tous");
  const [origineFilter, setOrigineFilter] = useState<"tous" | "Opérationnel" | "Transverse" | "To do">("tous");
  const [entiteFilter, setEntiteFilter] = useState("tous");
  const [search, setSearch] = useState("");

  const { all, filtered, entites } = useMemo(
    () => bilanPeriode(operations, transverses, todos, { fromKey, toKey, statusFilter, origineFilter, entiteFilter, search }),
    [operations, transverses, todos, fromKey, toKey, statusFilter, origineFilter, entiteFilter, search],
  );

  const nbEncours = all.filter((r) => r.statut === "encours").length;
  const nbFin = all.filter((r) => r.statut === "fin").length;
  const nbOp = all.filter((r) => r.origine === "Opérationnel").length;
  const nbTr = all.filter((r) => r.origine === "Transverse").length;
  const nbTd = all.filter((r) => r.origine === "To do").length;

  return (
    <Card title="Actions en cours & finalisées sur la période" subtitle={`${filtered.length} résultat(s)`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input type="month" className="input w-36" value={fromKey} onChange={(e) => setFromKey(e.target.value)} />
        <span className="text-slate-400 text-xs">à</span>
        <input type="month" className="input w-36" value={toKey} onChange={(e) => setToKey(e.target.value)} />
        <button className="text-xs text-indigo-600 hover:underline" onClick={() => { const m = currentMonthKey(); setFromKey(m); setToKey(m); }}>
          Mois en cours
        </button>
        <div className="flex gap-1 ml-2">
          {(["tous", "encours", "fin"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-full text-xs border ${statusFilter === f ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-600"}`}
            >
              {f === "tous" ? "Tous" : f === "encours" ? "En cours" : "Finalisé"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select className="input w-40" value={origineFilter} onChange={(e) => setOrigineFilter(e.target.value as typeof origineFilter)}>
          <option value="tous">Toutes origines</option>
          <option value="Opérationnel">Opérationnel</option>
          <option value="Transverse">Transverse</option>
          <option value="To do">To do</option>
        </select>
        <select className="input w-40" value={entiteFilter} onChange={(e) => setEntiteFilter(e.target.value)}>
          <option value="tous">Toutes entités</option>
          {entites.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="input max-w-xs" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="text-[10px] text-slate-400 italic mb-3">
        Un sujet est compté "en cours" s'il est lancé avant ou pendant la période et pas encore clôturé, "finalisé" s'il a été clôturé pendant la période.
      </p>
      <div className="grid grid-cols-5 gap-2 mb-3">
        <MiniStat label="En cours" value={nbEncours} color="#185FA5" />
        <MiniStat label="Finalisé" value={nbFin} color="#3B6D11" />
        <MiniStat label="Opérationnel" value={nbOp} />
        <MiniStat label="Transverse" value={nbTr} />
        <MiniStat label="To do" value={nbTd} />
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5 pr-2">Origine</th>
              <th className="py-1.5 pr-2">Statut</th>
              <th className="py-1.5 pr-2">Sujet</th>
              <th className="py-1.5 pr-2">Quoi</th>
              <th className="py-1.5 pr-2">Entité</th>
              <th className="py-1.5 pr-2">Début</th>
              <th className="py-1.5">Fin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5 pr-2"><Badge color={r.origine === "Opérationnel" ? "#185FA5" : r.origine === "Transverse" ? "#534AB7" : "#854F0B"}>{r.origine}</Badge></td>
                <td className="py-1.5 pr-2"><Badge color={r.statut === "fin" ? "#3B6D11" : "#854F0B"}>{r.statut === "fin" ? "Finalisé" : "En cours"}</Badge></td>
                <td className="py-1.5 pr-2 font-medium">{r.sujet}</td>
                <td className="py-1.5 pr-2 text-slate-500">{r.quoi}</td>
                <td className="py-1.5 pr-2">{r.ent}</td>
                <td className="py-1.5 pr-2">{fmtDate(r.start)}</td>
                <td className="py-1.5">{r.statut === "fin" ? fmtDate(r.end) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><EmptyLine text="Aucune action en cours ou finalisée sur cette période." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-lg font-medium" style={{ color: color ?? "#1e293b" }}>{value}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color, background: `${color}1A` }}>
      {children}
    </span>
  );
}

function prioBorder(prio: string | null): string {
  const m: Record<string, string> = { P0: "border-l-4 border-l-red-400", P1: "border-l-4 border-l-amber-400", P2: "border-l-4 border-l-blue-400", P3: "border-l-4 border-l-slate-300", P4: "border-l-4 border-l-slate-200" };
  return `border-slate-200 ${m[prio ?? ""] ?? ""}`;
}
function prioBadge(prio: string | null): string {
  const m: Record<string, string> = { P0: "bg-red-100 text-red-800", P1: "bg-amber-100 text-amber-800", P2: "bg-blue-100 text-blue-800", P3: "bg-slate-100 text-slate-600", P4: "bg-slate-100 text-slate-500" };
  return m[prio ?? ""] ?? "bg-slate-100 text-slate-500";
}

function Top10Priorites({ items }: { items: import("../lib/dashboard").TopPrioItem[] }) {
  return (
    <Card title="Mes 10 priorités à traiter" subtitle="Tous onglets confondus, Opérationnel en tête">
      {items.length === 0 ? (
        <EmptyLine text="Aucun sujet actif à traiter." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-1.5 pr-2 w-10">#</th>
                <th className="py-1.5 pr-2">Priorité</th>
                <th className="py-1.5 pr-2">Origine</th>
                <th className="py-1.5 pr-2">Sujet</th>
                <th className="py-1.5 pr-2">Quoi</th>
                <th className="py-1.5 pr-2">Entité</th>
                <th className="py-1.5">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={`${it.origine}-${it.id}`} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2 text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-1.5 pr-2"><PrioBadge prio={it.prio} warning={it.warning} /></td>
                  <td className="py-1.5 pr-2"><Badge color={it.origine === "Opérationnel" ? "#185FA5" : it.origine === "Transverse" ? "#534AB7" : "#854F0B"}>{it.origine}</Badge></td>
                  <td className="py-1.5 pr-2 font-medium">{it.sujet}</td>
                  <td className="py-1.5 pr-2 text-slate-500">{it.quoi}</td>
                  <td className="py-1.5 pr-2">{it.ent}</td>
                  <td className="py-1.5">{it.echeance || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function KpiRow({ k }: { k: ReturnType<typeof kpis> }) {
  const gainPositive = k.gain > 0; // dépassement (perte) vs budget
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <KpiTile label="Sujets actifs" value={String(k.actifs)} sub="en cours" color="#185FA5" />
      <KpiTile label="Clôturés" value={String(k.clos)} sub="terminés" color="#3B6D11" />
      <KpiTile label="En attente" value={String(k.att)} sub="réponse fournisseur" color="#854F0B" />
      <KpiTile label="Montant commandé" value={`CHF ${chf(k.montant)}`} sub="total" color="#185FA5" small />
      <KpiTile
        label="Gains / Pertes"
        value={`${k.gain >= 0 ? "+" : ""}CHF ${chf(k.gain)}`}
        sub={gainPositive ? "dépassement vs budget" : "économie vs budget"}
        color={gainPositive ? "#A32D2D" : "#3B6D11"}
        small
      />
      <KpiTile label="Fournisseurs" value={String(k.fournisseurs)} sub="actifs" color="#534AB7" />
    </div>
  );
}

function KpiTile({ label, value, sub, color, small }: { label: string; value: string; sub: string; color: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`${small ? "text-sm" : "text-xl"} font-semibold mt-1`} style={{ color }}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <div className="h-56">{children}</div>
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 py-4 text-center">{text}</p>;
}
