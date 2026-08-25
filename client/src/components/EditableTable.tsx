import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { compareVals, dateVal, numVal, isColFilterActive, type ColFilterValue } from "../lib/tableFilter";

export interface ColumnDef<T> {
  key: keyof T & string;
  /** Identifiant React unique de la colonne ; par défaut = key. À fournir
   * explicitement si une colonne calculée réutilise la même clé de donnée
   * qu'une autre colonne (ex: statut calculé + champ chantier). */
  id?: string;
  label: string;
  type?: "str" | "num" | "date" | "select" | "bool";
  options?: string[];
  width?: string;
  computed?: (row: T) => string;
  /** Rendu personnalisé (JSX) - utilisé à la place de computed quand fourni,
   * pour un badge coloré par ex. Le filtre/tri utilise alors filterValue. */
  render?: (row: T) => ReactNode;
  /** Valeur utilisée pour le filtre/tri de cette colonne quand elle diffère
   * de row[key] (obligatoire pour une colonne calculée qu'on veut pouvoir
   * filtrer/trier, ex: un statut dérivé de deux dates). */
  filterValue?: (row: T) => string;
  /** Désactive le filtre par colonne (tri toujours possible) - utile pour
   * les champs de texte libre à trop faible valeur ajoutée en filtre. */
  noFilter?: boolean;
}

export interface QuickFilter<T> {
  label: string;
  predicate: (row: T) => boolean;
}

interface EditableTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  rows: T[];
  onUpdate: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  addLabel?: string;
  /** Champs inclus dans la recherche libre (par défaut : toutes les colonnes texte). */
  searchFields?: (keyof T)[];
  /** Boutons de filtre rapide affichés au-dessus du tableau ("Tous" est ajouté automatiquement en premier). */
  quickFilters?: QuickFilter<T>[];
  /** Interrupteur additionnel combinable avec le filtre rapide (ex: "Masquer clôturés"). */
  extraToggle?: { label: string; active: boolean; onToggle: () => void };
  /** Classes CSS additionnelles par ligne (ex: liseré coloré selon l'urgence). */
  rowClassName?: (row: T) => string;
}

function colValue<T>(col: ColumnDef<T>, row: T): string {
  if (col.filterValue) return col.filterValue(row);
  if (col.computed) return col.computed(row);
  return (row[col.key] as unknown as string) ?? "";
}

export function EditableTable<T extends { id: string }>({
  columns,
  rows,
  onUpdate,
  onDelete,
  onAdd,
  addLabel = "+ Ajouter une ligne",
  searchFields,
  quickFilters,
  extraToggle,
  rowClassName,
}: EditableTableProps<T>) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeQuick, setActiveQuick] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, ColFilterValue>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const searchKeys = searchFields ?? (columns.filter((c) => !c.computed && !c.render).map((c) => c.key) as (keyof T)[]);

  const hasActiveFilters = Boolean(search) || activeQuick !== null || Object.values(colFilters).some(isColFilterActive) || sort !== null;

  const visibleRows = useMemo(() => {
    let res = rows;
    if (quickFilters && activeQuick !== null && quickFilters[activeQuick]) {
      res = res.filter(quickFilters[activeQuick].predicate);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      res = res.filter((row) => searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(s)));
    }
    for (const col of columns) {
      const fv = colFilters[col.id ?? col.key];
      if (!isColFilterActive(fv)) continue;
      const type = col.type ?? "str";
      if (Array.isArray(fv)) {
        res = res.filter((row) => fv.includes(colValue(col, row)));
      } else if (type === "num" && "min" in fv) {
        const min = fv.min ? parseFloat(fv.min) : undefined;
        const max = fv.max ? parseFloat(fv.max) : undefined;
        res = res.filter((row) => {
          const v = numVal(colValue(col, row));
          if (min !== undefined && v < min) return false;
          if (max !== undefined && v > max) return false;
          return true;
        });
      } else if (type === "date" && "from" in fv) {
        const from = fv.from ? dateVal(fv.from) : undefined;
        const to = fv.to ? dateVal(fv.to) : undefined;
        res = res.filter((row) => {
          const v = dateVal(colValue(col, row));
          if (from !== undefined && v < from) return false;
          if (to !== undefined && v > to) return false;
          return true;
        });
      }
    }
    if (sort) {
      const col = columns.find((c) => (c.id ?? c.key) === sort.key);
      if (col) {
        res = [...res].sort((a, b) => compareVals(colValue(col, a), colValue(col, b), col.type ?? "str", sort.dir));
      }
    }
    return res;
  }, [rows, columns, search, activeQuick, colFilters, sort, quickFilters, extraToggle]);

  function toggleSort(colId: string) {
    setSort((prev) => {
      if (!prev || prev.key !== colId) return { key: colId, dir: "asc" };
      if (prev.dir === "asc") return { key: colId, dir: "desc" };
      return null;
    });
  }

  function resetAll() {
    setSearch("");
    setActiveQuick(null);
    setSort(null);
    setColFilters({});
  }

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          className="input max-w-xs"
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {quickFilters && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveQuick(null)}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                activeQuick === null
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tous
            </button>
            {quickFilters.map((q, i) => (
              <button
                key={q.label}
                onClick={() => setActiveQuick(i)}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  activeQuick === i
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        {extraToggle && (
          <button
            onClick={extraToggle.onToggle}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              extraToggle.active
                ? "bg-slate-800 border-slate-800 text-white"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {extraToggle.label}
          </button>
        )}
        {hasActiveFilters && (
          <button onClick={resetAll} className="text-xs text-indigo-600 hover:underline ml-auto">
            Réinitialiser
          </button>
        )}
        <span className="text-xs text-slate-400">{visibleRows.length} / {rows.length}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto rounded-t-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((c) => {
                  const colId = c.id ?? c.key;
                  const canFilter = !c.noFilter && (!(c.computed || c.render) || Boolean(c.filterValue));
                  const isSorted = sort?.key === colId;
                  const isFiltered = isColFilterActive(colFilters[colId]);
                  return (
                    <th key={colId} style={{ minWidth: c.width }} className="relative">
                      <div className="flex items-center gap-1">
                        <button
                          className="flex items-center gap-1 hover:text-indigo-600"
                          onClick={() => toggleSort(colId)}
                          title="Trier"
                        >
                          {c.label}
                          {isSorted && <span>{sort!.dir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                        {canFilter && (
                          <button
                            className={`text-[10px] px-1 rounded ${isFiltered ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600"}`}
                            title="Filtrer"
                            onClick={() => setOpenFilter(openFilter === colId ? null : colId)}
                          >
                            ▾
                          </button>
                        )}
                      </div>
                      {openFilter === colId && (
                        <ColumnFilterPopover
                          col={c}
                          rows={rows}
                          value={colFilters[colId]}
                          onChange={(v) => setColFilters((prev) => ({ ...prev, [colId]: v }))}
                          onClear={() => {
                            setColFilters((prev) => {
                              const next = { ...prev };
                              delete next[colId];
                              return next;
                            });
                          }}
                          onClose={() => setOpenFilter(null)}
                        />
                      )}
                    </th>
                  );
                })}
                <th style={{ width: "60px" }} />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`${rowIndex % 2 === 1 ? "bg-slate-50/60 hover:bg-indigo-50/60" : "hover:bg-indigo-50/60"} ${rowClassName?.(row) ?? ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.id ?? c.key}>
                      {c.render ? (
                        c.render(row)
                      ) : c.computed ? (
                        <span className="text-slate-600">{c.computed(row)}</span>
                      ) : (
                        <Cell
                          value={row[c.key] as unknown}
                          col={c}
                          onChange={(v) => onUpdate(row.id, { [c.key]: v } as Partial<T>)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    {confirmId === row.id ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          className="text-red-600 text-xs font-semibold"
                          onClick={() => {
                            onDelete(row.id);
                            setConfirmId(null);
                          }}
                        >
                          Oui
                        </button>
                        <button className="text-slate-400 text-xs" onClick={() => setConfirmId(null)}>
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-slate-400 hover:text-red-600 text-xs"
                        title="Supprimer"
                        onClick={() => setConfirmId(row.id)}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center text-slate-400 py-6">
                    Aucune ligne
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-slate-200">
          <button
            className="rounded bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700"
            onClick={onAdd}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnFilterPopover<T>({
  col,
  rows,
  value,
  onChange,
  onClear,
  onClose,
}: {
  col: ColumnDef<T>;
  rows: T[];
  value: ColFilterValue | undefined;
  onChange: (v: ColFilterValue) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const type = col.type ?? "str";
  const [search, setSearch] = useState("");
  const allValues = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => set.add(colValue(col, row)));
    return [...set].sort();
  }, [rows, col]);

  if (type === "num") {
    const cur = (value && !Array.isArray(value) && "min" in value ? value : {}) as { min?: string; max?: string };
    return (
      <div className="absolute z-20 top-full left-0 mt-1 w-48 rounded-md border border-slate-300 bg-white text-slate-800 shadow-lg p-3 text-xs font-normal" onClick={(e) => e.stopPropagation()}>
        <div className="text-slate-500 mb-1">Min</div>
        <input className="input mb-2" placeholder="0" defaultValue={cur.min} onBlur={(e) => onChange({ ...cur, min: e.target.value })} />
        <div className="text-slate-500 mb-1">Max</div>
        <input className="input mb-2" placeholder="illimité" defaultValue={cur.max} onBlur={(e) => onChange({ ...cur, max: e.target.value })} />
        <PopoverActions onClear={() => { onClear(); onClose(); }} onClose={onClose} />
      </div>
    );
  }

  if (type === "date") {
    const cur = (value && !Array.isArray(value) && "from" in value ? value : {}) as { from?: string; to?: string };
    return (
      <div className="absolute z-20 top-full left-0 mt-1 w-48 rounded-md border border-slate-300 bg-white text-slate-800 shadow-lg p-3 text-xs font-normal" onClick={(e) => e.stopPropagation()}>
        <div className="text-slate-500 mb-1">De</div>
        <input className="input mb-2" placeholder="jj/mm/aa" defaultValue={cur.from} onBlur={(e) => onChange({ ...cur, from: e.target.value })} />
        <div className="text-slate-500 mb-1">À</div>
        <input className="input mb-2" placeholder="jj/mm/aa" defaultValue={cur.to} onBlur={(e) => onChange({ ...cur, to: e.target.value })} />
        <PopoverActions onClear={() => { onClear(); onClose(); }} onClose={onClose} />
      </div>
    );
  }

  const filteredValues = search ? allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase())) : allValues;
  const checked = Array.isArray(value) ? value : [];

  function toggle(v: string) {
    const next = checked.includes(v) ? checked.filter((c) => c !== v) : [...checked, v];
    onChange(next);
  }

  return (
    <div className="absolute z-20 top-full left-0 mt-1 w-56 rounded-md border border-slate-300 bg-white text-slate-800 shadow-lg p-3 text-xs font-normal" onClick={(e) => e.stopPropagation()}>
      <input
        className="input mb-2"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-48 overflow-auto space-y-1">
        {filteredValues.map((v) => (
          <label key={v} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={checked.includes(v)} onChange={() => toggle(v)} />
            <span className="truncate">{v || "(vide)"}</span>
          </label>
        ))}
        {filteredValues.length === 0 && <div className="text-slate-400">Aucune valeur</div>}
      </div>
      <PopoverActions onClear={() => { onClear(); onClose(); }} onClose={onClose} />
    </div>
  );
}

function PopoverActions({ onClear, onClose }: { onClear: () => void; onClose: () => void }) {
  return (
    <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
      <button className="text-slate-500 hover:underline" onClick={onClear}>
        Effacer
      </button>
      <button className="text-indigo-600 font-medium hover:underline" onClick={onClose}>
        Fermer
      </button>
    </div>
  );
}

function Cell<T>({
  value,
  col,
  onChange,
}: {
  value: unknown;
  col: ColumnDef<T>;
  onChange: (v: unknown) => void;
}) {
  const [local, setLocal] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  if (col.type === "bool") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (col.type === "select") {
    const options = col.options ?? [];
    // Une valeur existante (saisie librement avant l'introduction de cette
    // liste, ou legacy) peut ne pas figurer dans les options prédéfinies :
    // on l'ajoute en tête pour ne jamais masquer une donnée réelle.
    const displayOptions = local && !options.includes(local) ? [local, ...options] : options;
    return (
      <select
        className="input"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
      >
        <option value=""></option>
        {displayOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="input"
      type="text"
      placeholder={col.type === "date" ? "jj/mm/aa" : undefined}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== (value == null ? "" : String(value))) onChange(local);
      }}
    />
  );
}
