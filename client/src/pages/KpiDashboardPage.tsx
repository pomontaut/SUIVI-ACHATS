import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useOptions } from "../hooks/useOptions";
import { useResource } from "../hooks/useResource";
import {
  analyseDepense,
  dashLivraisons,
  entiteBreakdown,
  etapeBreakdown,
  fournisseurDrilldown,
  fournitureBreakdown,
  gainByTypeBreakdown,
  kpis,
  monthRangeOf,
  pertBreakdown,
  prochainesLivraisons,
  ratioSeuil,
  ratioSeuilEvolution,
  tauxService,
  tranchesBreakdown,
  type DashLivStatus,
} from "../lib/dashboard";
import { exportToExcel } from "../lib/excelExport";
import { Badge, Card, ChartCard, EmptyLine, LegendList, MiniStat, chf, withPct } from "../components/dashboardUi";
import type { Livraison, NonConformite, Operation } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend);

const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const barOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: "#e1e0d9" }, beginAtZero: true } },
};

export function KpiDashboardPage() {
  const operations = useResource<Operation>("operations", {});
  const livraisons = useResource<Livraison>("livraisons", {});
  const nonConformites = useResource<NonConformite>("non-conformites", {});

  if (operations.loading || livraisons.loading || nonConformites.loading) {
    return <p className="p-4 text-slate-500">Chargement du tableau de bord…</p>;
  }

  return (
    <KpiDashboardContent
      operations={operations.rows}
      livraisons={livraisons.rows}
      nonConformites={nonConformites.rows}
      updateOperation={operations.update}
    />
  );
}

function KpiDashboardContent({
  operations,
  livraisons,
  nonConformites,
  updateOperation,
}: {
  operations: Operation[];
  livraisons: Livraison[];
  nonConformites: NonConformite[];
  updateOperation: (id: string, patch: Partial<Operation>) => void;
}) {
  const opts = useOptions();
  const k = useMemo(() => kpis(operations), [operations]);
  const etapeData = useMemo(() => withPct(etapeBreakdown(operations)), [operations]);
  const entiteData = useMemo(() => withPct(entiteBreakdown(operations)), [operations]);
  const fournData = useMemo(() => withPct(fournitureBreakdown(operations)), [operations]);
  const tranches = useMemo(() => tranchesBreakdown(operations, opts.TRANCHES), [operations, opts.TRANCHES]);
  const pert = useMemo(() => pertBreakdown(operations, opts.PERT_CATS), [operations, opts.PERT_CATS]);
  const gainType = useMemo(() => gainByTypeBreakdown(operations), [operations]);
  const prochLiv = useMemo(() => prochainesLivraisons(operations), [operations]);
  const ratio = useMemo(() => ratioSeuil(operations), [operations]);
  const ratioEvol = useMemo(() => ratioSeuilEvolution(operations, 6), [operations]);
  const ts = useMemo(() => tauxService(livraisons), [livraisons]);

  return (
    <div className="space-y-6">
      <KpiBandeau k={k} ratio={ratio} ts={ts} />

      <div className="grid md:grid-cols-3 gap-4">
        <ChartCard title="Statut des sujets" legend={<LegendList items={etapeData.map((d) => ({ label: d.label, value: d.value, pct: d.pct, color: d.color }))} />}>
          <Doughnut data={{ labels: etapeData.map((d) => d.label), datasets: [{ data: etapeData.map((d) => d.value), backgroundColor: etapeData.map((d) => d.color), borderWidth: 0 }] }} options={doughnutOpts} />
        </ChartCard>
        <ChartCard title="Sujets par entité" legend={<LegendList items={entiteData.map((d) => ({ label: d.label, value: d.value, pct: d.pct, color: d.color }))} />}>
          <Bar data={{ labels: entiteData.map((d) => d.label), datasets: [{ data: entiteData.map((d) => d.value), backgroundColor: entiteData.map((d) => d.color), borderRadius: 4 }] }} options={barOpts} />
        </ChartCard>
        <ChartCard title="Types de fournitures" legend={<LegendList items={fournData.map((d) => ({ label: d.label, value: d.value, pct: d.pct, color: d.color }))} />}>
          <Doughnut data={{ labels: fournData.map((d) => d.label), datasets: [{ data: fournData.map((d) => d.value), backgroundColor: fournData.map((d) => d.color), borderWidth: 0 }] }} options={doughnutOpts} />
        </ChartCard>
      </div>

      <Card title="Commandes par tranche de montant">
        <div className="space-y-2">
          {tranches.map((t) => {
            const maxCount = Math.max(...tranches.map((x) => x.count), 1);
            const totalCount = tranches.reduce((s, x) => s + x.count, 0);
            const pct = totalCount > 0 ? Math.round((t.count / totalCount) * 100) : 0;
            return (
              <div key={t.lbl} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-36 shrink-0">{t.lbl}</span>
                <div className="flex-1 bg-slate-100 rounded h-3.5 overflow-hidden">
                  <div className="h-3.5 rounded" style={{ width: `${Math.round((t.count / maxCount) * 100)}%`, background: t.col }} />
                </div>
                <span className="text-xs font-medium w-40 text-right" style={{ color: t.col }}>{t.count} cmd ({pct}%) · CHF {chf(t.total)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <RatioSeuilSection ratio={ratio} evolution={ratioEvol} />

      <PertinenceSection pert={pert} />

      <GainSection gainType={gainType} />

      <TauxServiceSection ts={ts} />

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

      <AnalyseDepenseSection operations={operations} />

      <FournisseurDrilldownSection operations={operations} livraisons={livraisons} nonConformites={nonConformites} />

      <LivraisonsEnCours operations={operations} onUpdate={updateOperation} />
    </div>
  );
}

// ===== Bandeau KPI =====

function KpiBandeau({ k, ratio, ts }: { k: ReturnType<typeof kpis>; ratio: ReturnType<typeof ratioSeuil>; ts: ReturnType<typeof tauxService> }) {
  const gainPositive = k.gain > 0;
  return (
    <div className="rounded-lg border border-slate-300 bg-gradient-to-r from-slate-50 to-white shadow-sm p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Bandeau KPI</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
        <KpiTile label="Cmd < 5000 CHF" value={`${ratio.pctCountBelow}%`} sub={`${ratio.countBelow} cmd`} color="#0F6E56" />
        <KpiTile label="Taux de service" value={ts.denom > 0 ? `${ts.ts}%` : "—"} sub={`${ts.onTimeCount}/${ts.denom} évaluées`} color={ts.tsColor} />
      </div>
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

// ===== Ratio <5000 CHF =====

function RatioSeuilSection({ ratio, evolution }: { ratio: ReturnType<typeof ratioSeuil>; evolution: ReturnType<typeof ratioSeuilEvolution> }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartCard
        title={`Commandes < ${chf(ratio.seuil)} CHF vs le reste`}
        subtitle="En nombre et en montant"
        legend={
          <LegendList
            items={[
              { label: `< ${chf(ratio.seuil)} CHF`, value: ratio.countBelow, pct: ratio.pctCountBelow, color: "#185FA5" },
              { label: `≥ ${chf(ratio.seuil)} CHF`, value: ratio.countAbove, pct: 100 - ratio.pctCountBelow, color: "#854F0B" },
            ]}
          />
        }
      >
        <Doughnut
          data={{ labels: [`< ${chf(ratio.seuil)} CHF`, `≥ ${chf(ratio.seuil)} CHF`], datasets: [{ data: [ratio.countBelow, ratio.countAbove], backgroundColor: ["#185FA5", "#854F0B"], borderWidth: 0 }] }}
          options={doughnutOpts}
        />
      </ChartCard>
      <Card title="En montant" subtitle="Répartition de la dépense">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <MiniStat label={`< ${chf(ratio.seuil)} CHF`} value={`CHF ${chf(ratio.montantBelow)}`} color="#185FA5" />
          <MiniStat label={`≥ ${chf(ratio.seuil)} CHF`} value={`CHF ${chf(ratio.montantAbove)}`} color="#854F0B" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden flex">
            <div className="h-4" style={{ width: `${ratio.pctMontantBelow}%`, background: "#185FA5" }} />
            <div className="h-4" style={{ width: `${100 - ratio.pctMontantBelow}%`, background: "#854F0B" }} />
          </div>
          <span className="text-xs font-medium text-slate-600 w-24 text-right">{ratio.pctMontantBelow}% / {100 - ratio.pctMontantBelow}%</span>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Card title="Évolution du ratio sur 6 mois" subtitle="Pour repérer une dérive de la dépense hors sujets suivis">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-48">
              <p className="text-[10px] uppercase text-slate-400 mb-1">En nombre de commandes</p>
              <Line
                data={{
                  labels: evolution.map((e) => e.label),
                  datasets: [
                    { label: `< ${chf(ratio.seuil)} CHF`, data: evolution.map((e) => e.pctCountBelow), borderColor: "#185FA5", backgroundColor: "#185FA5", tension: 0.3 },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => {
                      const e = evolution[ctx.dataIndex];
                      return `${e.pctCountBelow}% des commandes (${e.countBelow} sur ${e.countBelow + e.countAbove})`;
                    } } },
                  },
                  scales: {
                    x: { ticks: { autoSkip: false, maxRotation: 0 } },
                    y: { min: 0, max: 100, title: { display: true, text: "% du nombre de commandes" }, ticks: { callback: (v) => `${v}%` } },
                  },
                }}
              />
            </div>
            <div className="h-48">
              <p className="text-[10px] uppercase text-slate-400 mb-1">En montant</p>
              <Line
                data={{
                  labels: evolution.map((e) => e.label),
                  datasets: [
                    { label: `< ${chf(ratio.seuil)} CHF`, data: evolution.map((e) => e.pctMontantBelow), borderColor: "#0F6E56", backgroundColor: "#0F6E56", tension: 0.3 },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => {
                      const e = evolution[ctx.dataIndex];
                      return `${e.pctMontantBelow}% de la dépense (CHF ${chf(e.montantBelow)} sur CHF ${chf(e.montantBelow + e.montantAbove)})`;
                    } } },
                  },
                  scales: {
                    x: { ticks: { autoSkip: false, maxRotation: 0 } },
                    y: { min: 0, max: 100, title: { display: true, text: "% du montant total" }, ticks: { callback: (v) => `${v}%` } },
                  },
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic mt-1">
            Les deux courbes sont en % (nombre de commandes à gauche, montant CHF à droite) — un écart entre elles indique qu'une minorité de grosses commandes pèse plus lourd que leur nombre ne le suggère.
          </p>
          <div className="overflow-auto mt-2">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-left text-slate-400"><th className="py-1 pr-2">Mois</th><th className="py-1 pr-2 text-right">Cmd &lt; seuil</th><th className="py-1 pr-2 text-right">Cmd total</th><th className="py-1 pr-2 text-right">Montant &lt; seuil</th><th className="py-1 text-right">Montant total</th></tr>
              </thead>
              <tbody>
                {evolution.map((e) => (
                  <tr key={e.monthKey} className="border-t border-slate-100">
                    <td className="py-1 pr-2">{e.label}</td>
                    <td className="py-1 pr-2 text-right">{e.countBelow} ({e.pctCountBelow}%)</td>
                    <td className="py-1 pr-2 text-right">{e.countBelow + e.countAbove}</td>
                    <td className="py-1 pr-2 text-right">CHF {chf(e.montantBelow)} ({e.pctMontantBelow}%)</td>
                    <td className="py-1 text-right">CHF {chf(e.montantBelow + e.montantAbove)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ===== Indicateur de pertinence (redesigné en petits graphiques) =====

function PertinenceSection({ pert }: { pert: ReturnType<typeof pertBreakdown> }) {
  return (
    <Card title="Indicateur de pertinence des commandes" subtitle={`${pert.totalCmd} commandes analysées`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pert.rows.map((p) => (
          <div key={p.key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 mb-1.5">{p.label}</div>
            <div className="h-16">
              <Doughnut
                data={{ labels: [p.label, "Reste"], datasets: [{ data: [p.count, Math.max(pert.totalCmd - p.count, 0)], backgroundColor: ["#534AB7", "#e1e0d9"], borderWidth: 0 }] }}
                options={{ ...doughnutOpts, cutout: "70%" }}
              />
            </div>
            <div className="text-center mt-1.5">
              <span className="text-base font-semibold text-indigo-700">{p.count}</span>
              <span className="text-[11px] text-slate-500"> ({p.pct}%)</span>
              <div className="text-[11px] text-violet-700 font-medium">CHF {chf(p.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Gains par typologie =====

function GainSection({ gainType }: { gainType: ReturnType<typeof gainByTypeBreakdown> }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartCard
        title="Répartition des gains par typologie"
        subtitle="En nombre de commandes"
        legend={<LegendList items={gainType.rows.map((r) => ({ label: r.key, value: r.count, pct: r.pct, color: r.color }))} />}
      >
        <Doughnut
          data={{ labels: gainType.rows.map((r) => r.key), datasets: [{ data: gainType.rows.map((r) => r.count), backgroundColor: gainType.rows.map((r) => r.color), borderWidth: 0 }] }}
          options={doughnutOpts}
        />
      </ChartCard>
      <Card title="Détail du gain par typologie" subtitle={`Total CHF ${chf(gainType.total)} sur ${gainType.totalCount} commande(s)`}>
        <div className="grid grid-cols-3 gap-2">
          {gainType.rows.map((r) => (
            <div key={r.key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-500">{r.key}</div>
              <div className="text-base font-medium" style={{ color: r.color }}>{r.count} ({r.pct}%)</div>
              <div className="text-[11px] text-violet-700 font-medium">CHF {chf(r.value)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Taux de service (refait) =====

function TauxServiceSection({ ts }: { ts: ReturnType<typeof tauxService> }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <ChartCard
        title="Taux de service global"
        subtitle={ts.avgRetardDays !== null ? `Retard moyen : ${ts.avgRetardDays}j` : undefined}
        legend={<LegendList items={[
          { label: "À temps", value: ts.onTimeCount, pct: ts.denom > 0 ? Math.round((ts.onTimeCount / ts.denom) * 100) : 0, color: "#3B6D11" },
          { label: "En retard", value: ts.retardTotalCount, pct: ts.denom > 0 ? Math.round((ts.retardTotalCount / ts.denom) * 100) : 0, color: "#A32D2D" },
        ]} />}
      >
        {ts.denom === 0 ? (
          <EmptyLine text="Aucune réception saisie." />
        ) : (
          <Doughnut
            data={{ labels: ["À temps", "En retard"], datasets: [{ data: [ts.onTimeCount, ts.retardTotalCount], backgroundColor: ["#3B6D11", "#A32D2D"], borderWidth: 0 }] }}
            options={doughnutOpts}
          />
        )}
      </ChartCard>
      <div className="md:col-span-2">
        <Card title="Taux de service global" subtitle={`${ts.denom} / ${ts.totalLiv} livraisons évaluées`}>
          {ts.denom === 0 ? (
            <EmptyLine text="Aucune réception saisie — renseignez les dates dans l'onglet Livraisons." />
          ) : (
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
                  <div>{ts.onTimeCount} livrés à temps ({ts.denom > 0 ? Math.round((ts.onTimeCount / ts.denom) * 100) : 0}%)</div>
                  <div>{ts.retardTotalCount} en retard ({ts.denom > 0 ? Math.round((ts.retardTotalCount / ts.denom) * 100) : 0}%)</div>
                  <div>{ts.denom} / {ts.totalLiv} évaluées</div>
                </div>
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-3">Basé sur les livraisons clôturées et les en cours dont l'échéance est dépassée.</p>
        </Card>
      </div>
      <div className="md:col-span-3">
        <Card title="Taux de service par fournisseur" subtitle="Nombre de commandes à temps / total, et %">
          {ts.byFournisseur.length === 0 ? (
            <EmptyLine text="Aucune donnée." />
          ) : (
            <div className="max-h-64 overflow-auto space-y-1.5">
              {ts.byFournisseur.map((f) => (
                <div key={f.fournisseur} className="flex items-center gap-2 text-xs">
                  <span className="w-32 truncate shrink-0">{f.fournisseur}</span>
                  <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
                    <div className="h-3 rounded" style={{ width: `${f.pct}%`, background: f.color }} />
                  </div>
                  <span className="w-28 text-right font-medium" style={{ color: f.color }}>{f.pct}% ({f.ok}/{f.total})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ===== Analyse dépense fournisseur =====

function AnalyseDepenseSection({ operations }: { operations: Operation[] }) {
  const range = useMemo(() => monthRangeOf(operations), [operations]);
  const [fromKey, setFromKey] = useState(range.minKey);
  const [toKey, setToKey] = useState(range.maxKey);
  const analysis = useMemo(() => analyseDepense(operations, fromKey, toKey), [operations, fromKey, toKey]);

  return (
    <Card title="Analyse dépense fournisseur" subtitle={`${analysis.count} commande(s) · CHF ${chf(analysis.total)}`}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">Période :</span>
        <input type="month" className="input w-36" value={fromKey} onChange={(e) => setFromKey(e.target.value)} />
        <span className="text-slate-400 text-xs">à</span>
        <input type="month" className="input w-36" value={toKey} onChange={(e) => setToKey(e.target.value)} />
        <button className="text-xs text-indigo-600 hover:underline" onClick={() => { setFromKey(range.minKey); setToKey(range.maxKey); }}>
          Toute la période
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <DepBreakdownTable title="Par fournisseur" rows={analysis.byFournisseur} total={analysis.total} />
        <DepBreakdownTable title="Par chantier" rows={analysis.byChantier} total={analysis.total} />
        <DepBreakdownTable title="Par groupe de marchandise" rows={analysis.byMarchandise} total={analysis.total} />
      </div>
    </Card>
  );
}

function DepBreakdownTable({ title, rows, total }: { title: string; rows: { key: string; total: number; count: number; pct: number; color: string }[]; total: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-400 mb-2">{title}</p>
      {rows.length === 0 ? (
        <EmptyLine text="Aucune donnée." />
      ) : (
        <div className="max-h-64 overflow-auto space-y-1.5">
          {rows.map((r) => (
            <div key={r.key} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="truncate">{r.key}</span>
                <span className="font-medium shrink-0" style={{ color: r.color }}>{chf(r.total)} ({r.pct}%)</span>
              </div>
              <div className="bg-slate-100 rounded h-2 overflow-hidden">
                <div className="h-2 rounded" style={{ width: `${r.pct}%`, background: r.color }} />
              </div>
              <div className="text-[10px] text-slate-400">{r.count} cmd</div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200">Total : CHF {chf(total)}</div>
    </div>
  );
}

// ===== Encadré drill-down fournisseur =====

function FournisseurDrilldownSection({ operations, livraisons, nonConformites }: { operations: Operation[]; livraisons: Livraison[]; nonConformites: NonConformite[] }) {
  const fournisseurs = useMemo(
    () => [...new Set(operations.map((o) => (o.fournisseur ?? "").trim()).filter(Boolean))].sort(),
    [operations],
  );
  const [selected, setSelected] = useState<string>("");
  const d = useMemo(() => (selected ? fournisseurDrilldown(operations, livraisons, nonConformites, selected) : null), [operations, livraisons, nonConformites, selected]);

  return (
    <Card title="Analyse détaillée par fournisseur" subtitle="Sélectionnez un fournisseur pour voir le détail de la dépense, du taux de service et des non-conformités">
      <div className="mb-4">
        <select className="input w-64" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">— Choisir un fournisseur —</option>
          {fournisseurs.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {!d ? (
        <EmptyLine text="Aucun fournisseur sélectionné." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <MiniStat label="Montant total" value={`CHF ${chf(d.totalMontant)}`} color="#185FA5" />
            <MiniStat label="Nombre de commandes" value={d.nombreCommandes} />
            <MiniStat label="Taux de service moyen" value={d.tauxServiceMoyen !== null ? `${d.tauxServiceMoyen}%` : "—"} color="#3B6D11" />
            <MiniStat label="Non-conformités" value={d.ncCount} color={d.ncCount > 0 ? "#A32D2D" : undefined} />
            <MiniStat label="% NC récupéré" value={d.montantNcTotal > 0 ? `${d.pctRecuperation}%` : "—"} color="#854F0B" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <ChartCard title="Dépense par mois">
              <Bar
                data={{ labels: d.byMonth.map((m) => m.monthKey), datasets: [{ data: d.byMonth.map((m) => m.montant), backgroundColor: "#185FA5", borderRadius: 4 }] }}
                options={barOpts}
              />
            </ChartCard>
            <DepBreakdownTable title="Dépense par chantier" rows={d.byChantier} total={d.totalMontant} />
            <DepBreakdownTable title="Dépense par marchandise" rows={d.byMarchandise} total={d.totalMontant} />
          </div>

          {d.marchandiseByChantier.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-2">Marchandise par chantier</p>
              <div className="grid md:grid-cols-3 gap-3">
                {d.marchandiseByChantier.map((c) => (
                  <div key={c.chantier} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-xs font-medium mb-1.5 truncate">{c.chantier}</div>
                    {c.rows.map((r) => (
                      <div key={r.key} className="flex justify-between text-[11px] text-slate-600">
                        <span className="truncate">{r.key}</span>
                        <span>{chf(r.total)} ({r.pct}%)</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase text-slate-400">Liste des commandes ({d.orders.length})</p>
              <button
                className="text-xs text-indigo-600 hover:underline"
                onClick={() => exportToExcel(
                  d.orders.map((o) => ({ "N° commande": o.numCmd, "N° chantier": o.chant, "Nom chantier": o.nom, "Montant CHF": o.montant, "Date commande": o.dateCmd, "Date livraison": o.dateLivraison })),
                  "Commandes",
                  `commandes-${d.fournisseur}`,
                )}
              >
                ⬇ Exporter Excel
              </button>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400">
                    <th className="py-1.5 pr-2">N° cmd</th><th className="py-1.5 pr-2">N° chantier</th><th className="py-1.5 pr-2">Nom chantier</th><th className="py-1.5 pr-2 text-right">Montant</th><th className="py-1.5 pr-2">Date cmd</th><th className="py-1.5">Date livraison</th>
                  </tr>
                </thead>
                <tbody>
                  {d.orders.map((o, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 text-indigo-700 font-medium">{o.numCmd}</td>
                      <td className="py-1.5 pr-2">{o.chant}</td>
                      <td className="py-1.5 pr-2">{o.nom}</td>
                      <td className="py-1.5 pr-2 text-right">CHF {chf(o.montant)}</td>
                      <td className="py-1.5 pr-2">{o.dateCmd}</td>
                      <td className="py-1.5">{o.dateLivraison}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-400 mb-2">Non-conformités</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <MiniStat label="Total NC" value={d.ncCount} />
              <MiniStat label="Mineures" value={d.ncCountMineur} color="#854F0B" />
              <MiniStat label="Majeures / critiques" value={d.ncCountMajeur} color="#A32D2D" />
              <MiniStat label="Montant NC" value={`CHF ${chf(d.montantNcTotal)}`} />
            </div>
            {d.ncByTypologie.length > 0 && (
              <div className="mb-3">
                <LegendList items={d.ncByTypologie.map((r) => ({ label: r.key, value: r.count, pct: r.pct, color: r.color }))} />
              </div>
            )}
            {d.ncList.length > 0 && (
              <>
                <div className="flex justify-end mb-2">
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => exportToExcel(
                      d.ncList.map((n) => ({
                        Date: n.date ?? "", "Chantier": n.nom ?? n.chant ?? "", "Catégorie": n.catNC ?? "", "Gravité": n.typeNC ?? "",
                        "Montant NC": n.montantNC ?? "", "Note crédit": n.noteCredit ?? "", "Statut": n.statutNC ?? n.statut ?? "",
                      })),
                      "Non-conformités",
                      `non-conformites-${d.fournisseur}`,
                    )}
                  >
                    ⬇ Exporter Excel
                  </button>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-slate-400">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Chantier</th><th className="py-1.5 pr-2">Catégorie</th><th className="py-1.5 pr-2">Gravité</th><th className="py-1.5 pr-2 text-right">Montant NC</th><th className="py-1.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.ncList.map((n) => (
                        <tr key={n.id} className="border-t border-slate-100">
                          <td className="py-1.5 pr-2">{n.date || "—"}</td>
                          <td className="py-1.5 pr-2">{n.nom || n.chant || "—"}</td>
                          <td className="py-1.5 pr-2">{n.catNC || "—"}</td>
                          <td className="py-1.5 pr-2"><Badge color={n.typeNC === "Mineur" ? "#854F0B" : "#A32D2D"}>{n.typeNC || "—"}</Badge></td>
                          <td className="py-1.5 pr-2 text-right">{n.montantNC ? `CHF ${chf(parseFloat(n.montantNC))}` : "—"}</td>
                          <td className="py-1.5">{n.statutNC || n.statut || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ===== Livraisons en cours =====

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
