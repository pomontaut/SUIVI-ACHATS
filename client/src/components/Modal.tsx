import type { ReactNode } from "react";

/** `wide` élargit le cadre (tableaux comparatifs...) au lieu du format
 * formulaire étroit par défaut - évite qu'un enfant plus large que
 * max-w-sm ne déborde visuellement hors de la carte du modal. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${wide ? "max-w-5xl" : "max-w-sm"} p-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <button className="text-slate-400 hover:text-slate-700 text-lg leading-none" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
