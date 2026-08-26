import { useState } from "react";
import { Card, EmptyLine } from "../components/dashboardUi";

interface Counts {
  label: string;
  expected: number;
  actual: number;
}
interface MissingNc {
  date?: string;
  fournisseur?: string;
  chant?: string;
  catNC?: string;
  typeNC?: string;
}
interface MissingLiv {
  numCmd?: string;
  fournisseur?: string;
  chant?: string;
  nom?: string;
}
interface DiagResult {
  counts: Counts[];
  missingNc: MissingNc[];
  missingLiv: MissingLiv[];
}
interface FixReport {
  nonConformites: { created: number; skipped: number; errors: string[] };
  livraisons: { updated: number; skipped: number; notFound: number; errors: string[] };
  appelsOffres: { created: number; skipped: number; errors: string[] };
}

export function DiagnosticPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixReport, setFixReport] = useState<FixReport | null>(null);

  async function runDiagnostic() {
    setLoading(true);
    setError(null);
    setResult(null);
    setFixReport(null);
    try {
      const res = await fetch("/api/diagnostic/20260825");
      if (!res.ok) throw new Error(`${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runFix() {
    setFixing(true);
    setFixError(null);
    setFixReport(null);
    try {
      const res = await fetch("/api/diagnostic/20260825/fix", { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      setFixReport(await res.json());
      await runDiagnostic();
    } catch (e) {
      setFixError(e instanceof Error ? e.message : String(e));
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Diagnostic de la reprise de données" subtitle="Compare ce qu'il y a actuellement dans le site avec l'export du 25 août 2026. Ne modifie rien.">
        <button
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          onClick={runDiagnostic}
          disabled={loading}
        >
          {loading ? "Analyse en cours…" : "Lancer le diagnostic"}
        </button>
        {error && <p className="text-sm text-red-700 mt-3">Erreur : {error}</p>}
      </Card>

      {result && (result.missingNc.length > 0 || result.missingLiv.length > 0) && (
        <Card title="Corriger automatiquement" subtitle="Ne crée que ce qui manque et ne remplit que les champs vides — n'écrase jamais une donnée déjà saisie.">
          <button
            className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50"
            onClick={runFix}
            disabled={fixing}
          >
            {fixing ? "Correction en cours…" : "Corriger automatiquement"}
          </button>
          {fixError && <p className="text-sm text-red-700 mt-3">Erreur : {fixError}</p>}
          {fixReport && (
            <div className="mt-4 space-y-2 text-sm">
              <p>Non-conformités : <b>{fixReport.nonConformites.created}</b> créées, {fixReport.nonConformites.skipped} déjà présentes{fixReport.nonConformites.errors.length > 0 && <span className="text-red-700"> — {fixReport.nonConformites.errors.length} erreur(s)</span>}</p>
              <p>Livraisons : <b>{fixReport.livraisons.updated}</b> complétées (dates/remarques), {fixReport.livraisons.skipped} déjà complètes, {fixReport.livraisons.notFound} sans ligne correspondante{fixReport.livraisons.errors.length > 0 && <span className="text-red-700"> — {fixReport.livraisons.errors.length} erreur(s)</span>}</p>
              <p>Appels d'offres : <b>{fixReport.appelsOffres.created}</b> créés, {fixReport.appelsOffres.skipped} déjà présents{fixReport.appelsOffres.errors.length > 0 && <span className="text-red-700"> — {fixReport.appelsOffres.errors.length} erreur(s)</span>}</p>
              {[...fixReport.nonConformites.errors, ...fixReport.livraisons.errors, ...fixReport.appelsOffres.errors].length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800 space-y-1">
                  {[...fixReport.nonConformites.errors, ...fixReport.livraisons.errors, ...fixReport.appelsOffres.errors].map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <p className="text-slate-500 italic">Le diagnostic ci-dessous a été relancé automatiquement.</p>
            </div>
          )}
        </Card>
      )}

      {result && (
        <>
          <Card title="Comptages : export du 25 août vs site actuel">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-400">
                  <th className="py-1.5 pr-2">Onglet</th>
                  <th className="py-1.5 pr-2 text-right">Attendu (export)</th>
                  <th className="py-1.5 pr-2 text-right">Actuel (site)</th>
                  <th className="py-1.5 text-right">Écart</th>
                </tr>
              </thead>
              <tbody>
                {result.counts.map((c) => {
                  const diff = c.actual - c.expected;
                  return (
                    <tr key={c.label} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 font-medium">{c.label}</td>
                      <td className="py-1.5 pr-2 text-right">{c.expected}</td>
                      <td className="py-1.5 pr-2 text-right">{c.actual}</td>
                      <td className={`py-1.5 text-right font-medium ${diff < 0 ? "text-red-700" : diff > 0 ? "text-amber-700" : "text-green-700"}`}>
                        {diff === 0 ? "OK" : diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card title="Non-conformités manquantes" subtitle={`${result.missingNc.length} sur ${result.counts.find((c) => c.label === "Non-conformités")?.expected ?? 0}`}>
            {result.missingNc.length === 0 ? (
              <EmptyLine text="Aucune — tout est présent." />
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400">
                    <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Fournisseur</th><th className="py-1.5 pr-2">Chantier</th><th className="py-1.5 pr-2">Catégorie</th><th className="py-1.5">Gravité</th>
                  </tr>
                </thead>
                <tbody>
                  {result.missingNc.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2">{r.date || "—"}</td>
                      <td className="py-1.5 pr-2">{r.fournisseur || "—"}</td>
                      <td className="py-1.5 pr-2">{r.chant || "—"}</td>
                      <td className="py-1.5 pr-2">{r.catNC || "—"}</td>
                      <td className="py-1.5">{r.typeNC || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Livraisons manquantes" subtitle={`${result.missingLiv.length} sur ${result.counts.find((c) => c.label === "Livraisons")?.expected ?? 0}`}>
            {result.missingLiv.length === 0 ? (
              <EmptyLine text="Aucune — tout est présent." />
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400">
                    <th className="py-1.5 pr-2">N° cmd</th><th className="py-1.5 pr-2">Fournisseur</th><th className="py-1.5 pr-2">Chantier</th><th className="py-1.5">Nom</th>
                  </tr>
                </thead>
                <tbody>
                  {result.missingLiv.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 text-indigo-700 font-medium">{r.numCmd || "(vide)"}</td>
                      <td className="py-1.5 pr-2">{r.fournisseur || "—"}</td>
                      <td className="py-1.5 pr-2">{r.chant || "—"}</td>
                      <td className="py-1.5">{r.nom || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
