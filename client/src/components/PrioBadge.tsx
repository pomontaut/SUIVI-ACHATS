import { PRIO_COLORS } from "../lib/priority";

/** Select éditable pour la priorité, coloré selon la valeur (mise en forme
 * conditionnelle façon tableur) - pour les modules où la priorité reste
 * saisie manuellement (Transverse, To-do). */
export function PrioSelect({ value, options, onChange }: { value: string | null | undefined; options: string[]; onChange: (v: string) => void }) {
  const c = PRIO_COLORS[value ?? ""] ?? PRIO_COLORS[""];
  return (
    <select
      className="input font-semibold"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value=""></option>
      {options.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

export function PrioBadge({ prio, warning }: { prio: string | null | undefined; warning?: boolean }) {
  const p = prio ?? "";
  const c = PRIO_COLORS[p] ?? PRIO_COLORS[""];
  return (
    <span className="inline-flex items-center gap-1">
      {warning && <span title="Délai dépassé ou dernier jour !" className="cursor-help">⚠️</span>}
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded border"
        style={{ background: c.bg, color: c.text, borderColor: c.border }}
      >
        {p || "—"}
      </span>
    </span>
  );
}
