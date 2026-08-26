import { useState, type DragEvent } from "react";

/** Pièce jointe générique (offre fournisseur, confirmation de commande,
 * BL...) : lien de consultation si déjà présent, sinon zone permettant de
 * joindre un fichier par clic OU par glisser-déposer. */
export function FichierControl({
  nom,
  url,
  label = "Joindre un fichier",
  onUpload,
  onRemove,
}: {
  nom: string | null;
  url: string | null;
  label?: string;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      setDragOver(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate max-w-[100px]" title={nom ?? ""}>
          📎 {nom}
        </a>
        <button type="button" className="text-slate-400 hover:text-red-600" title="Retirer le fichier" disabled={busy} onClick={handleRemove}>×</button>
      </div>
    );
  }

  return (
    <label
      className={`block text-[10px] text-indigo-600 cursor-pointer rounded border border-dashed px-1.5 py-0.5 text-center whitespace-nowrap ${
        dragOver ? "bg-indigo-50 border-indigo-400" : "border-slate-300 hover:bg-slate-50"
      } ${busy ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleUpload(f);
        else setDragOver(false);
      }}
    >
      📎 {busy ? "Envoi…" : dragOver ? "Déposer ici" : label}
      <input
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
      />
    </label>
  );
}
