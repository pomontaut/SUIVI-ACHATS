export function isClos(etape: string | null | undefined): boolean {
  const e = (etape ?? "").toLowerCase();
  return e.includes("clôturé") || e.includes("cloturé");
}

export function isAtt(etape: string | null | undefined): boolean {
  return (etape ?? "").toLowerCase().includes("attente");
}
