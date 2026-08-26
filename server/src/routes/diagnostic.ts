import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ExportOp { id: string; }
interface ExportNc { date?: string; fournisseur?: string; chant?: string; rem?: string; catNC?: string; typeNC?: string; }
interface ExportLiv { _opIdx: number; numCmd?: string; fournisseur?: string; chant?: string; nom?: string; }
interface ExportData {
  op3: ExportOp[];
  tr3: unknown[];
  td3: unknown[];
  nc1: ExportNc[];
  liv1: ExportLiv[];
  ao1: unknown[];
}

function norm(s: string | null | undefined): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Compare l'état actuel de la base avec l'export du 25 août 2026 (la
 * référence de la fusion de données) et retourne uniquement le résultat de
 * la comparaison - jamais le contenu brut de l'export - pour diagnostiquer
 * ce qui n'a pas été repris (notamment non-conformités et livraisons).
 */
export const diagnosticRouter = Router();

diagnosticRouter.get("/20260825", async (_req, res) => {
  const raw = fs.readFileSync(path.join(__dirname, "../data/export20260825.json"), "utf8");
  const data: ExportData = JSON.parse(raw);

  const [operations, transverses, todos, nonConformites, livraisons, appelsOffres] = await Promise.all([
    prisma.operation.findMany(),
    prisma.transverse.findMany(),
    prisma.todo.findMany(),
    prisma.nonConformite.findMany(),
    prisma.livraison.findMany(),
    prisma.appelOffre.findMany(),
  ]);

  const counts = [
    { label: "Opérationnel", expected: data.op3.length, actual: operations.length },
    { label: "Transverse", expected: data.tr3.length, actual: transverses.length },
    { label: "To-do", expected: data.td3.length, actual: todos.length },
    { label: "Non-conformités", expected: data.nc1.length, actual: nonConformites.length },
    { label: "Livraisons", expected: data.liv1.length, actual: livraisons.length },
    { label: "Appels d'offres", expected: data.ao1.length, actual: appelsOffres.length },
  ];

  const ncKeyOf = (r: { date?: string | null; fournisseur?: string | null; chant?: string | null; rem?: string | null }) =>
    [norm(r.date), norm(r.fournisseur), norm(r.chant), norm(r.rem)].join("|");
  const ncByKey = new Map(nonConformites.map((r) => [ncKeyOf(r), r]));
  const missingNc = data.nc1.filter((r) => !ncByKey.has(ncKeyOf(r)));

  const livByNumCmd = new Map(livraisons.filter((l) => l.numCmd).map((l) => [norm(l.numCmd), l]));
  const missingLiv = data.liv1.filter((r) => !r.numCmd || !livByNumCmd.has(norm(r.numCmd)));

  res.json({ counts, missingNc, missingLiv });
});
