import { useEffect, useState } from "react";
import { api } from "./api";
import { OptionsContext } from "./hooks/useOptions";
import type { Options } from "./types";
import { SuiviDashboardPage } from "./pages/SuiviDashboardPage";
import { KpiDashboardPage } from "./pages/KpiDashboardPage";
import { OperationsPage } from "./pages/OperationsPage";
import { TransversePage } from "./pages/TransversePage";
import { TodoPage } from "./pages/TodoPage";
import { NonConformitesPage } from "./pages/NonConformitesPage";
import { LivraisonsPage } from "./pages/LivraisonsPage";
import { AppelsOffresPage } from "./pages/AppelsOffresPage";
import { DiagnosticPage } from "./pages/DiagnosticPage";

const TABS = [
  { id: "suivi-dashboard", label: "Tableau de bord de suivi" },
  { id: "kpi-dashboard", label: "Tableau de bord – KPI" },
  { id: "operations", label: "Opérationnel" },
  { id: "transverse", label: "Transverse" },
  { id: "todo", label: "To-do" },
  { id: "nc", label: "Non-conformités" },
  { id: "liv", label: "Livraisons" },
  { id: "ao", label: "Appels d'offres" },
  { id: "diagnostic", label: "Diagnostic import" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("suivi-dashboard");
  const [options, setOptions] = useState<Options | null>(null);

  useEffect(() => {
    api.options().then(setOptions);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white px-6 py-4">
        <h1 className="text-xl font-semibold">Suivi Achats & KPI</h1>
        <p className="text-slate-400 text-sm">Induni — suivi opérationnel, transverse, qualité et livraisons</p>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
              tab === t.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {!options ? (
          <p className="text-slate-500">Chargement…</p>
        ) : (
          <OptionsContext.Provider value={options}>
            {tab === "suivi-dashboard" && <SuiviDashboardPage />}
            {tab === "kpi-dashboard" && <KpiDashboardPage />}
            {tab === "operations" && <OperationsPage />}
            {tab === "transverse" && <TransversePage />}
            {tab === "todo" && <TodoPage />}
            {tab === "nc" && <NonConformitesPage />}
            {tab === "liv" && <LivraisonsPage />}
            {tab === "ao" && <AppelsOffresPage />}
            {tab === "diagnostic" && <DiagnosticPage />}
          </OptionsContext.Provider>
        )}
      </main>
    </div>
  );
}
