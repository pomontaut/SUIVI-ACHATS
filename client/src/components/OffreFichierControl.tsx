import { useState } from "react";
import { api } from "../api";
import type { AppelOffre } from "../types";

/** Pièce jointe du document d'offre (devis/PDF/scan) sur une ligne d'appel
 * d'offres : lien de consultation si déjà présent, sinon bouton pour en
 * joindre un. */
export function OffreFichierControl({ row, onUpdated }: { row: AppelOffre; onUpdated: (row: AppelOffre) => void }) {
  const [busy, setBusy] = useState(false);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const updated = await api.uploadOffreFichier(row.id, file);
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const updated = await api.removeOffreFichier(row.id);
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  if (row.offreFichierUrl) {
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <a href={row.offreFichierUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate max-w-[100px]" title={row.offreFichierNom ?? ""}>
          📎 {row.offreFichierNom}
        </a>
        <button type="button" className="text-slate-400 hover:text-red-600" title="Retirer le fichier" disabled={busy} onClick={handleRemove}>×</button>
      </div>
    );
  }

  return (
    <label className={`text-[10px] text-indigo-600 hover:underline cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
      📎 {busy ? "Envoi…" : "Joindre l'offre"}
      <input
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
      />
    </label>
  );
}
