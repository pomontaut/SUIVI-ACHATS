import { useState } from "react";

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
}

interface EditableTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  rows: T[];
  onUpdate: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  addLabel?: string;
}

export function EditableTable<T extends { id: string }>({
  columns,
  rows,
  onUpdate,
  onDelete,
  onAdd,
  addLabel = "+ Ajouter une ligne",
}: EditableTableProps<T>) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-sm">
      <div className="max-h-[70vh] overflow-auto rounded-t-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id ?? c.key} style={{ minWidth: c.width }}>
                  {c.label}
                </th>
              ))}
              <th style={{ width: "60px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.id ?? c.key}>
                    {c.computed ? (
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
            {rows.length === 0 && (
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
