import { useEffect, useState } from "react";
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
import { api } from "../api";
import { StatTile } from "../components/StatTile";
import { CATEGORICAL, SEQUENTIAL_BLUE, STATUS, INK } from "../lib/palette";
import type { DashboardData } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chf = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 });

function horizontalBar(labels: string[], values: number[], color = SEQUENTIAL_BLUE) {
  return {
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: color, borderRadius: 4, maxBarThickness: 22 }],
    },
    options: {
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: INK.grid }, ticks: { color: INK.muted } },
        y: { grid: { display: false }, ticks: { color: INK.secondary } },
      },
    },
  };
}

function doughnut(labels: string[], values: number[], colors: string[]) {
  return {
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" as const, labels: { color: INK.secondary } } },
    },
  };
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.dashboard().then(setData);
  }, []);

  if (!data) return <p className="p-4 text-slate-500">Chargement du tableau de bord…</p>;

  const parEtapeTop = data.parEtape.slice(0, 8);
  const ncCat = data.ncParCategorie.filter((c) => c.label !== "(non renseigné)");
  const ncGrav = data.ncParGravite.filter((c) => c.label !== "(non renseigné)");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Achats en cours" value={String(data.counts.operations)} />
        <StatTile label="Montant total (CHF)" value={chf.format(data.montantTotal)} />
        <StatTile
          label="Gain / perte cumulé (CHF)"
          value={chf.format(data.gainTotal)}
          sub={data.gainTotal >= 0 ? "économie" : "surcoût"}
        />
        <StatTile
          label="Taux de service livraisons"
          value={data.livraisons.tauxService !== null ? `${data.livraisons.tauxService}%` : "—"}
          sub={`${data.livraisons.onTime} à temps / ${data.livraisons.retard} en retard`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Statut des achats">
          <Doughnut {...doughnut(
            ["Clôturé", "En attente", "En cours"],
            [data.opStatus.clos, data.opStatus.attente, data.opStatus.enCours],
            [CATEGORICAL[2], CATEGORICAL[3], CATEGORICAL[0]]
          )} />
        </ChartCard>

        <ChartCard title="Livraisons : à temps vs en retard">
          {data.livraisons.onTime + data.livraisons.retard > 0 ? (
            <Doughnut {...doughnut(
              ["À temps", "En retard"],
              [data.livraisons.onTime, data.livraisons.retard],
              [STATUS.good, STATUS.critical]
            )} />
          ) : (
            <EmptyState text="Pas encore de livraison avec une date réelle renseignée." />
          )}
        </ChartCard>

        <ChartCard title="Répartition par étape (top 8)">
          <Bar {...horizontalBar(parEtapeTop.map((e) => e.label), parEtapeTop.map((e) => e.value))} />
        </ChartCard>

        <ChartCard title="Répartition par entité">
          <Bar {...horizontalBar(data.parEntite.map((e) => e.label), data.parEntite.map((e) => e.value))} />
        </ChartCard>

        <ChartCard title="Top 10 fournisseurs (montant CHF)">
          <Bar {...horizontalBar(
            data.topFournisseurs.map((f) => f.label),
            data.topFournisseurs.map((f) => f.value)
          )} />
        </ChartCard>

        <ChartCard title="Non-conformités par catégorie">
          {ncCat.length > 0 ? (
            <Doughnut {...doughnut(ncCat.map((c) => c.label), ncCat.map((c) => c.value), CATEGORICAL)} />
          ) : (
            <EmptyState text="Aucune non-conformité catégorisée pour l'instant." />
          )}
        </ChartCard>
      </div>

      {ncGrav.length > 0 && (
        <ChartCard title="Non-conformités par gravité">
          <Bar {...horizontalBar(ncGrav.map((c) => c.label), ncGrav.map((c) => c.value), CATEGORICAL[7])} />
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 flex items-center justify-center h-full">{text}</p>;
}
