import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

function num(v: string | null | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function isClos(etape: string | null | undefined): boolean {
  const e = (etape ?? "").toLowerCase();
  return e.includes("clôturé") || e.includes("cloturé");
}

function isAtt(etape: string | null | undefined): boolean {
  return (etape ?? "").toLowerCase().includes("attente");
}

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "(non renseigné)";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

dashboardRouter.get("/", async (_req, res) => {
  const [operations, transverses, todos, nonConformites, livraisons] = await Promise.all([
    prisma.operation.findMany(),
    prisma.transverse.findMany(),
    prisma.todo.findMany(),
    prisma.nonConformite.findMany(),
    prisma.livraison.findMany(),
  ]);

  const opStatus = {
    clos: operations.filter((o) => isClos(o.etape)).length,
    attente: operations.filter((o) => !isClos(o.etape) && isAtt(o.etape)).length,
    enCours: operations.filter((o) => !isClos(o.etape) && !isAtt(o.etape)).length,
  };

  const parFournisseur = new Map<string, number>();
  let gainTotal = 0;
  let montantTotal = 0;
  for (const o of operations) {
    if (o.fournisseur && o.montant) {
      parFournisseur.set(o.fournisseur, (parFournisseur.get(o.fournisseur) ?? 0) + num(o.montant));
    }
    gainTotal += num(o.gain);
    montantTotal += num(o.montant);
  }
  const topFournisseurs = [...parFournisseur.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  let livOnTime = 0;
  let livRetard = 0;
  for (const l of livraisons) {
    if (!l.dateLivraisonReelle) continue;
    if (!l.dateLivraison) continue;
    // dates saisies au format dd/mm/aa -> comparaison lexicographique après réarrangement
    const toKey = (d: string) => {
      const [dd, mm, yy] = d.split("/");
      if (!dd || !mm || !yy) return d;
      return `${yy}-${mm}-${dd}`;
    };
    if (toKey(l.dateLivraisonReelle) <= toKey(l.dateLivraison)) livOnTime++;
    else livRetard++;
  }
  const tauxService = livOnTime + livRetard > 0 ? Math.round((livOnTime / (livOnTime + livRetard)) * 100) : null;

  res.json({
    counts: {
      operations: operations.length,
      transverses: transverses.length,
      todos: todos.length,
      nonConformites: nonConformites.length,
      livraisons: livraisons.length,
    },
    opStatus,
    parEtape: countBy(operations, (o) => o.etape),
    parEntite: countBy(operations, (o) => o.ent),
    topFournisseurs,
    montantTotal,
    gainTotal,
    ncParCategorie: countBy(nonConformites, (n) => n.catNC),
    ncParGravite: countBy(nonConformites, (n) => n.typeNC),
    livraisons: { onTime: livOnTime, retard: livRetard, tauxService },
  });
});
