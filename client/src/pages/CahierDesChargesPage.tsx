import { useMemo } from "react";
import { EditableTable, type ColumnDef, type QuickFilter } from "../components/EditableTable";
import { useResource } from "../hooks/useResource";
import { useOptions } from "../hooks/useOptions";
import { isAutoPrioType } from "../lib/priority";
import type { CahierDesCharges, Operation } from "../types";

const OUI_NON = ["Oui", "Non"];

export function CahierDesChargesPage() {
  const opts = useOptions();
  const { rows, add, update, remove, loading } = useResource<CahierDesCharges>("cahier-des-charges", {
    obligatoire: "Non",
  });
  // Lecture seule : sert uniquement à alimenter le menu déroulant "Précision"
  // ci-dessous avec les intitulés déjà utilisés sur de vrais sujets
  // exploitation, pour rattacher une question à un objet réellement rencontré.
  const { rows: operations } = useResource<Operation>("operations", {});

  const precisionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of operations) {
      if (isAutoPrioType(o.type) !== "exploitation") continue;
      const p = (o.prec ?? "").trim();
      if (p) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [operations]);

  const columns: ColumnDef<CahierDesCharges>[] = [
    { key: "groupeMarchandise", label: "Groupe marchandise", type: "select", options: opts.FOURNITURES, width: "150px" },
    { key: "fourniture", label: "Fourniture", width: "160px" },
    { key: "precision", label: "Précision", type: "select", options: precisionOptions, width: "180px" },
    { key: "question", label: "Question à poser", width: "320px" },
    { key: "reponseAttendue", label: "Réponse / info attendue", width: "220px" },
    { key: "obligatoire", label: "Obligatoire", type: "select", options: OUI_NON, width: "90px" },
    { key: "rem", label: "Remarque", width: "220px" },
  ];

  const quickFilters: QuickFilter<CahierDesCharges>[] = [
    { label: "Obligatoire", predicate: (d) => (d.obligatoire ?? "Non") === "Oui" },
    { label: "Sans groupe marchandise", predicate: (d) => !(d.groupeMarchandise ?? "").trim() },
  ];

  if (loading) return <p className="p-4 text-slate-500">Chargement…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Cahier des charges ({rows.length})</h2>
      <p className="text-xs text-slate-500 mb-3">
        Base de connaissance des questions à poser aux demandeurs pour chaque type de fourniture/prestation, indépendante du suivi opérationnel.
      </p>
      <EditableTable
        columns={columns}
        rows={rows}
        onUpdate={update}
        onDelete={remove}
        onAdd={add}
        searchFields={["groupeMarchandise", "fourniture", "precision", "question"]}
        quickFilters={quickFilters}
      />
    </div>
  );
}
