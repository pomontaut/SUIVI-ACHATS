import { isVuToday, todayStr } from "../lib/vu";

export function VuCheckbox({ vuDate, onChange }: { vuDate: string | null | undefined; onChange: (vuDate: string | null) => void }) {
  const checked = isVuToday(vuDate);
  return (
    <input
      type="checkbox"
      title="Vu aujourd'hui - se décoche automatiquement demain"
      checked={checked}
      onChange={(e) => onChange(e.target.checked ? todayStr() : null)}
    />
  );
}
