import { useEffect, useState } from "react";
import { parseConsult, joinConsult } from "../lib/consult";
import { api } from "../api";
import { Modal } from "./Modal";
import { AddFournisseurModal } from "./FournisseurPicker";
import type { Fournisseur } from "../types";

/** Colonne Consultation de l'Opérationnel : liste de fournisseurs sous
 * forme de tags, avec un + qui ouvre un pop-up de sélection multiple (on
 * reste dans le pop-up le temps de rechercher/pré-valider plusieurs
 * fournisseurs avant de valider la liste d'un coup) et une croix pour
 * retirer un tag existant. */
export function ConsultationPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [adding, setAdding] = useState(false);
  const tags = parseConsult(value);

  function removeTag(nom: string) {
    onChange(joinConsult(tags.filter((t) => t !== nom)));
  }

  function validateStaged(staged: string[]) {
    onChange(joinConsult([...tags, ...staged]));
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 min-w-[160px]">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] px-1.5 py-0.5 rounded">
          {t}
          <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => removeTag(t)}>×</button>
        </span>
      ))}
      <button
        type="button"
        className="w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold"
        title="Ajouter des fournisseurs à consulter"
        onClick={() => setAdding(true)}
      >
        +
      </button>
      {adding && (
        <ConsultationAddModal existingTags={tags} onValidate={validateStaged} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function ConsultationAddModal({
  existingTags,
  onValidate,
  onClose,
}: {
  existingTags: string[];
  onValidate: (staged: string[]) => void;
  onClose: () => void;
}) {
  const [staged, setStaged] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Fournisseur[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      api.fournisseurs(query.trim()).then(setSuggestions);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  function stage(nom: string) {
    const clean = nom.trim();
    if (!clean || existingTags.includes(clean) || staged.includes(clean)) return;
    setStaged((prev) => [...prev, clean]);
    setQuery("");
  }

  function unstage(nom: string) {
    setStaged((prev) => prev.filter((s) => s !== nom));
  }

  return (
    <Modal title="Ajouter des fournisseurs à consulter" onClose={onClose}>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <input
            className="input"
            placeholder="Rechercher un fournisseur…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="shrink-0 w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold"
            title="Créer un nouveau fournisseur"
            onClick={() => setShowAddNew(true)}
          >
            +
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md border border-slate-200 text-xs">
            {suggestions.map((f) => (
              <button
                key={f.id}
                type="button"
                className="block w-full text-left px-2 py-1.5 hover:bg-indigo-50 truncate disabled:opacity-40"
                disabled={existingTags.includes(f.nom) || staged.includes(f.nom)}
                onClick={() => stage(f.nom)}
              >
                {f.nom}
                {f.ville && <span className="text-slate-400"> — {f.ville}</span>}
              </button>
            ))}
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase text-slate-400 mb-1">Fournisseurs pré-validés ({staged.length})</p>
          {staged.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucun fournisseur ajouté pour l'instant.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {staged.map((nom) => (
                <span key={nom} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[11px] px-1.5 py-0.5 rounded">
                  {nom}
                  <button type="button" className="text-indigo-400 hover:text-red-600" onClick={() => unstage(nom)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="text-xs text-slate-500 px-3 py-1.5" onClick={onClose}>Annuler</button>
          <button
            className="text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50"
            disabled={staged.length === 0}
            onClick={() => onValidate(staged)}
          >
            Valider la liste pour consultation
          </button>
        </div>
      </div>

      {showAddNew && (
        <AddFournisseurModal
          initialNom={query}
          onClose={() => setShowAddNew(false)}
          onCreated={(f) => { stage(f.nom); setShowAddNew(false); }}
        />
      )}
    </Modal>
  );
}
