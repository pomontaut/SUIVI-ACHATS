import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Modal } from "./Modal";
import type { Chantier } from "../types";

/** Champ n° de chantier avec autocomplétion sur le référentiel ; choisir un
 * chantier remplit automatiquement son nom (onSelect). Bouton + pour ajouter
 * un chantier absent du référentiel (Nom/Numéro/CP/Ville). */
export function ChantierPicker({
  numero,
  onSelect,
}: {
  numero: string | null;
  onSelect: (numero: string, nom: string | null) => void;
}) {
  const [local, setLocal] = useState(numero ?? "");
  const [suggestions, setSuggestions] = useState<Chantier[]>([]);
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocal(numero ?? ""), [numero]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = local.trim();
    const t = setTimeout(() => {
      api.chantiers(q).then(setSuggestions);
    }, 150);
    return () => clearTimeout(t);
  }, [local, open]);

  function select(c: Chantier) {
    setLocal(c.numero);
    onSelect(c.numero, c.nom);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <input
        className="input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (local !== (numero ?? "")) onSelect(local, null);
        }}
      />
      <button
        type="button"
        className="shrink-0 w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold"
        title="Ajouter un chantier absent du référentiel"
        onClick={() => setShowAdd(true)}
      >
        +
      </button>
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-1 w-64 max-h-56 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg text-xs">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              className="block w-full text-left px-2 py-1.5 hover:bg-indigo-50 truncate"
              onMouseDown={(e) => { e.preventDefault(); select(c); }}
            >
              <span className="font-medium text-indigo-700">{c.numero}</span> — {c.nom || "—"}
            </button>
          ))}
        </div>
      )}
      {showAdd && (
        <AddChantierModal
          initialNumero={local}
          onClose={() => setShowAdd(false)}
          onCreated={(c) => { select(c); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddChantierModal({ initialNumero, onClose, onCreated }: { initialNumero: string; onClose: () => void; onCreated: (c: Chantier) => void }) {
  const [numero, setNumero] = useState(initialNumero);
  const [nom, setNom] = useState("");
  const [npa, setNpa] = useState("");
  const [ville, setVille] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!numero.trim()) return;
    setSaving(true);
    try {
      const c = await api.addChantier({ numero: numero.trim(), nom: nom || null, npa: npa || null, ville: ville || null });
      onCreated(c);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Ajouter un chantier" onClose={onClose}>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-slate-500">N° de chantier *</label>
          <input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Nom du chantier</label>
          <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Code postal</label>
          <input className="input" value={npa} onChange={(e) => setNpa(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Ville</label>
          <input className="input" value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="text-xs text-slate-500 px-3 py-1.5" onClick={onClose}>Annuler</button>
          <button
            className="text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50"
            disabled={!numero.trim() || saving}
            onClick={save}
          >
            {saving ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
