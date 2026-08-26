import { useState } from "react";
import { parseConsult, joinConsult } from "../lib/consult";
import { FournisseurPicker } from "./FournisseurPicker";

/** Colonne Consultation de l'Opérationnel : liste de fournisseurs sous
 * forme de tags, avec un + pour en ajouter un depuis le référentiel (ou en
 * créer un nouveau) et une croix pour en retirer un. */
export function ConsultationPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [adding, setAdding] = useState(false);
  const tags = parseConsult(value);

  function addTag(nom: string) {
    if (!nom.trim() || tags.includes(nom.trim())) { setAdding(false); return; }
    onChange(joinConsult([...tags, nom.trim()]));
    setAdding(false);
  }

  function removeTag(nom: string) {
    onChange(joinConsult(tags.filter((t) => t !== nom)));
  }

  return (
    <div className="flex flex-wrap items-center gap-1 min-w-[160px]">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] px-1.5 py-0.5 rounded">
          {t}
          <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => removeTag(t)}>×</button>
        </span>
      ))}
      {adding ? (
        <FournisseurPicker value="" onChange={addTag} />
      ) : (
        <button
          type="button"
          className="w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold"
          title="Ajouter un fournisseur à consulter"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      )}
    </div>
  );
}
