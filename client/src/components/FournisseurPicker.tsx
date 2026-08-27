import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Modal } from "./Modal";
import type { Fournisseur } from "../types";

/** Champ fournisseur avec autocomplétion sur le référentiel (Abacus + ajouts
 * manuels). Surligné en rouge si la valeur actuelle ne correspond à aucune
 * entrée du référentiel - l'utilisateur choisit alors le bon fournisseur
 * dans la liste, ou en ajoute un nouveau via le bouton +. */
export function FournisseurPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Fournisseur[]>([]);
  const [open, setOpen] = useState(false);
  const [matched, setMatched] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocal(value ?? ""), [value]);

  useEffect(() => {
    let cancelled = false;
    // Champ vide : pas d'alerte visuelle (rien à corriger).
    if (!value || !value.trim()) {
      setMatched(true);
      return;
    }
    api.fournisseurs(value).then((rows) => {
      if (cancelled) return;
      setMatched(rows.some((r) => r.nom.toLowerCase() === value.trim().toLowerCase()));
    });
    return () => { cancelled = true; };
  }, [value]);

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
      api.fournisseurs(q).then(setSuggestions);
    }, 150);
    return () => clearTimeout(t);
  }, [local, open]);

  function select(nom: string) {
    setLocal(nom);
    onChange(nom);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <input
        className={`input ${!matched ? "bg-red-50 border-red-400 text-red-900" : ""}`}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (local !== (value ?? "")) onChange(local);
        }}
        title={!matched ? "Fournisseur introuvable dans le référentiel — choisissez-en un ou ajoutez-le" : undefined}
      />
      <button
        type="button"
        className="shrink-0 w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold"
        title="Ajouter un fournisseur hors référentiel"
        onClick={() => setShowAdd(true)}
      >
        +
      </button>
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-1 w-64 max-h-56 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg text-xs">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              className="block w-full text-left px-2 py-1.5 hover:bg-indigo-50 truncate"
              onMouseDown={(e) => { e.preventDefault(); select(f.nom); }}
            >
              {f.nom}
              {f.ville && <span className="text-slate-400"> — {f.ville}</span>}
            </button>
          ))}
        </div>
      )}
      {showAdd && (
        <AddFournisseurModal
          initialNom={local}
          onClose={() => setShowAdd(false)}
          onCreated={(f) => { select(f.nom); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

export function AddFournisseurModal({ initialNom, onClose, onCreated }: { initialNom: string; onClose: () => void; onCreated: (f: Fournisseur) => void }) {
  const [nom, setNom] = useState(initialNom);
  const [npa, setNpa] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("CH");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!nom.trim()) return;
    setSaving(true);
    try {
      const f = await api.addFournisseur({ nom: nom.trim(), npa: npa || null, ville: ville || null, pays: pays || null });
      onCreated(f);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Ajouter un fournisseur" onClose={onClose}>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-slate-500">Nom *</label>
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
        <div>
          <label className="text-xs text-slate-500">Pays</label>
          <input className="input" value={pays} onChange={(e) => setPays(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="text-xs text-slate-500 px-3 py-1.5" onClick={onClose}>Annuler</button>
          <button
            className="text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50"
            disabled={!nom.trim() || saving}
            onClick={save}
          >
            {saving ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
