export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Coché uniquement si la ligne a été marquée "vue" aujourd'hui - se
 * décoche automatiquement le lendemain sans action nécessaire. */
export function isVuToday(vuDate: string | null | undefined): boolean {
  return vuDate === todayStr();
}
