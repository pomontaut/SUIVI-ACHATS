import { useMemo, useState } from "react";
import { useResource } from "../hooks/useResource";
import { bilanPeriode, top10Priorites, type TopPrioItem } from "../lib/dashboard";
import { Badge, Card, EmptyLine, MiniStat, fmtDate } from "../components/dashboardUi";
import { PrioBadge } from "../components/PrioBadge";
import { VuCheckbox } from "../components/VuCheckbox";
import type { Operation, Todo, Transverse } from "../types";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SuiviDashboardPage() {
  const operations = useResource<Operation>("operations", {});
  const transverses = useResource<Transverse>("transverses", {});
  const todos = useResource<Todo>("todos", {});

  if (operations.loading || transverses.loading || todos.loading) {
    return <p className="p-4 text-slate-500">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <Top10Priorites
        operations={operations.rows}
        transverses={transverses.rows}
        todos={todos.rows}
        updateOperation={operations.update}
        updateTransverse={transverses.update}
        updateTodo={todos.update}
      />
      <BilanPeriode operations={operations.rows} transverses={transverses.rows} todos={todos.rows} />
    </div>
  );
}

function Top10Priorites({
  operations,
  transverses,
  todos,
  updateOperation,
  updateTransverse,
  updateTodo,
}: {
  operations: Operation[];
  transverses: Transverse[];
  todos: Todo[];
  updateOperation: (id: string, patch: Partial<Operation>) => void;
  updateTransverse: (id: string, patch: Partial<Transverse>) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
}) {
  const items = useMemo(() => top10Priorites(operations, transverses, todos), [operations, transverses, todos]);

  function setVuDate(it: TopPrioItem, vuDate: string | null) {
    if (it.origine === "Opérationnel") updateOperation(it.id, { vuDate });
    else if (it.origine === "Transverse") updateTransverse(it.id, { vuDate });
    else updateTodo(it.id, { vuDate });
  }

  return (
    <Card title="Mes 10 priorités à traiter" subtitle="Sujets sur le point de se terminer et exploitation en tête, tous onglets confondus">
      {items.length === 0 ? (
        <EmptyLine text="Aucun sujet actif à traiter." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="py-1.5 pr-2 w-10">#</th>
                <th className="py-1.5 pr-2 w-10">Vu</th>
                <th className="py-1.5 pr-2">Priorité</th>
                <th className="py-1.5 pr-2">Type</th>
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
                  <td className="py-1.5 pr-2"><VuCheckbox vuDate={it.vuDate} onChange={(v) => setVuDate(it, v)} /></td>
                  <td className="py-1.5 pr-2"><PrioBadge prio={it.prio} warning={it.warning} /></td>
                  <td className="py-1.5 pr-2"><Badge color={it.isExploitation ? "#185FA5" : "#888780"}>{it.type}</Badge></td>
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
