import { useEffect, useState } from "react";
import { api } from "./api";
import { OptionsContext } from "./hooks/useOptions";
import type { Options } from "./types";
import { KpiDashboardPage } from "./pages/KpiDashboardPage";
import { OperationsPage } from "./pages/OperationsPage";
import { TransversePage } from "./pages/TransversePage";
import { TodoPage } from "./pages/TodoPage";
import { NonConformitesPage } from "./pages/NonConformitesPage";
import { LivraisonsPage } from "./pages/LivraisonsPage";
import { AppelsOffresPage } from "./pages/AppelsOffresPage";
import { SuiviAdministratifPage } from "./pages/SuiviAdministratifPage";
import { CahierDesChargesPage } from "./pages/CahierDesChargesPage";
import { DiagnosticPage } from "./pages/DiagnosticPage";

const TABS = [
  { id: "kpi-dashboard", label: "Tableau de bord – KPI" },
  { id: "operations", label: "Opérationnel" },
  { id: "transverse", label: "Transverse" },
  { id: "todo", label: "To-do" },
  { id: "nc", label: "Non-conformités" },
  { id: "liv", label: "Livraisons" },
  { id: "ao", label: "Appels d'offres" },
  { id: "suivi-admin", label: "Suivi Administratif" },
  { id: "cdc", label: "Cahier des charges" },
  { id: "diagnostic", label: "Diagnostic import" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("kpi-dashboard");
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
            {tab === "kpi-dashboard" && <KpiDashboardPage />}
            {tab === "operations" && <OperationsPage />}
            {tab === "transverse" && <TransversePage />}
            {tab === "todo" && <TodoPage />}
            {tab === "nc" && <NonConformitesPage />}
            {tab === "liv" && <LivraisonsPage />}
            {tab === "ao" && <AppelsOffresPage />}
            {tab === "suivi-admin" && <SuiviAdministratifPage />}
            {tab === "cdc" && <CahierDesChargesPage />}
            {tab === "diagnostic" && <DiagnosticPage />}
          </OptionsContext.Provider>
        )}
      </main>
    </div>
  );
}
