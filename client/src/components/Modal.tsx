import type { ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4"
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
