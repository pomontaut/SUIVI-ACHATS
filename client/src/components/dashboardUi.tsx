import type { ReactNode } from "react";

export const chf = (v: number) => new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(v);

export function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

export function Card({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function ChartCard({ title, subtitle, children, legend }: { title: string; subtitle?: string; children: ReactNode; legend?: ReactNode }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="h-52">{children}</div>
      {legend && <div className="mt-2">{legend}</div>}
    </Card>
  );
}

export function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 py-4 text-center">{text}</p>;
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ color, background: `${color}1A` }}>
      {children}
    </span>
  );
}

export function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-lg font-medium" style={{ color: color ?? "#1e293b" }}>{value}</div>
    </div>
  );
}

/** Légende "Label : n (pct%)" - utilisée sous les graphiques pour afficher
 * à la fois le nombre et le pourcentage, pas seulement une couleur. */
export function LegendList({ items }: { items: { label: string; value: number | string; pct: number; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: it.color }} />
          {it.label} : <b>{it.value}</b> ({it.pct}%)
        </span>
      ))}
    </div>
  );
}

export function withPct<T extends { value: number }>(rows: T[]): (T & { pct: number })[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r) => ({ ...r, pct: total > 0 ? Math.round((r.value / total) * 100) : 0 }));
}
