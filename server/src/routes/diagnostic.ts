import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ExportOp {
  id: string;
  date?: string | null; dem?: string | null; ent?: string | null; chant?: string | null; nom?: string | null;
  prec?: string | null;
}
interface ExportNc {
  date?: string | null; fournisseur?: string | null; ent?: string | null; chant?: string | null; nom?: string | null;
  ctx?: string | null; montantCmd?: string | null; catNC?: string | null; typeNC?: string | null;
  statut?: string | null; statutNC?: string | null; montantNC?: string | null; noteCredit?: string | null; rem?: string | null;
  action?: string | null;
}
interface ExportLiv {
  _opIdx: number;
  numCmd?: string | null; fournisseur?: string | null; chant?: string | null; nom?: string | null;
  dateConfirm?: string | null; dateLivraisonReelle?: string | null; remLiv?: string | null;
}
interface ExportAo {
  _opId: string;
  fournisseur?: string | null; launch?: string | null; retour?: string | null;
  choisi?: boolean; nonRepondu?: boolean;
}
interface ExportData {
  op3: ExportOp[];
  tr3: unknown[];
  td3: unknown[];
  nc1: ExportNc[];
  liv1: ExportLiv[];
  ao1: ExportAo[];
}

function norm(s: string | null | undefined): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
function nkey(...parts: (string | null | undefined)[]): string {
  return parts.map(norm).join("|");
}
function loadExport(): ExportData {
  const raw = fs.readFileSync(path.join(__dirname, "../data/export20260825.json"), "utf8");
  return JSON.parse(raw);
}

/**
 * Compare l'état actuel de la base avec l'export du 25 août 2026 (la
 * référence de la fusion de données) et retourne uniquement le résultat de
 * la comparaison - jamais le contenu brut de l'export - pour diagnostiquer
 * ce qui n'a pas été repris (notamment non-conformités et livraisons).
 */
export const diagnosticRouter = Router();

diagnosticRouter.get("/20260825", async (_req, res) => {
  const data = loadExport();

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
    nkey(r.date, r.fournisseur, r.chant, r.rem);
  const ncByKey = new Map(nonConformites.map((r) => [ncKeyOf(r), r]));
  const missingNc = data.nc1.filter((r) => !ncByKey.has(ncKeyOf(r)));

  const livByNumCmd = new Map(livraisons.filter((l) => l.numCmd).map((l) => [norm(l.numCmd), l]));
  const missingLiv = data.liv1.filter((r) => !r.numCmd || !livByNumCmd.has(norm(r.numCmd)));

  const opById = new Map(data.op3.map((o) => [o.id, o]));
  const aoKeyOf = (a: { chant?: string | null; nom?: string | null; fournisseur?: string | null; dateEnvoi?: string | null }) =>
    nkey(a.chant, a.nom, a.fournisseur, a.dateEnvoi);
  const aoByKey = new Map(appelsOffres.map((a) => [aoKeyOf(a), a]));
  const missingAo = data.ao1.filter((r) => {
    const opRaw = opById.get(r._opId);
    const key = aoKeyOf({ chant: opRaw?.chant, nom: opRaw?.nom, fournisseur: r.fournisseur, dateEnvoi: r.launch });
    return !aoByKey.has(key);
  });

  res.json({ counts, missingNc, missingLiv, missingAo });
});

/**
 * Complète ce qui manque (non-conformités, champs de suivi des livraisons,
 * appels d'offres) sans jamais rien écraser : une non-conformité déjà
 * présente n'est jamais retouchée, un champ de livraison n'est rempli que
 * s'il est actuellement vide, un appel d'offres déjà présent est laissé
 * tel quel. Chaque ligne est traitée indépendamment (une erreur sur une
 * ligne n'interrompt jamais le traitement des suivantes) et le rapport
 * détaillé de ce qui a été fait est renvoyé.
 */
diagnosticRouter.post("/20260825/fix", async (_req, res) => {
  const data = loadExport();
  const report = {
    nonConformites: { created: 0, skipped: 0, errors: [] as string[] },
    livraisons: { updated: 0, skipped: 0, notFound: 0, errors: [] as string[] },
    appelsOffres: { created: 0, skipped: 0, errors: [] as string[] },
  };

  // --- Non-conformités : crée celles qui manquent ---
  const existingNc = await prisma.nonConformite.findMany();
  const ncKeyOf = (r: { date?: string | null; fournisseur?: string | null; chant?: string | null; rem?: string | null }) =>
    nkey(r.date, r.fournisseur, r.chant, r.rem);
  const ncByKey = new Map(existingNc.map((r) => [ncKeyOf(r), r]));
  for (const r of data.nc1) {
    const key = ncKeyOf(r);
    if (ncByKey.has(key)) { report.nonConformites.skipped++; continue; }
    try {
      const created = await prisma.nonConformite.create({
        data: {
          date: r.date || null, fournisseur: r.fournisseur || null, ent: r.ent || null, chant: r.chant || null,
          nom: r.nom || null, ctx: r.ctx || null, montantCmd: r.montantCmd || null, catNC: r.catNC || null,
          typeNC: r.typeNC || null, statut: r.statut || null, statutNC: r.statutNC || null,
          montantNC: r.montantNC || null, noteCredit: r.noteCredit || null, rem: r.rem || null,
        },
      });
      ncByKey.set(key, created);
      report.nonConformites.created++;
    } catch (e) {
      report.nonConformites.errors.push(`${r.date ?? "?"} / ${r.fournisseur ?? "?"} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Livraisons : ne remplit que les champs de suivi actuellement vides ---
  const operations = await prisma.operation.findMany();
  const opKeyOf = (o: { date?: string | null; chant?: string | null; nom?: string | null; dem?: string | null; prec?: string | null }) =>
    nkey(o.chant, o.nom, o.dem, o.date, o.prec);
  const opByKey = new Map(operations.map((o) => [opKeyOf(o), o]));
  const opOrigIdToCurrentId = new Map<string, string>();
  for (const rawOp of data.op3) {
    const match = opByKey.get(opKeyOf(rawOp));
    if (match) opOrigIdToCurrentId.set(rawOp.id, match.id);
  }

  const existingLiv = await prisma.livraison.findMany();
  const livByOpId = new Map(existingLiv.filter((l) => l.operationId).map((l) => [l.operationId as string, l]));
  const livByNumCmd = new Map(existingLiv.filter((l) => l.numCmd).map((l) => [norm(l.numCmd), l]));

  for (const r of data.liv1) {
    const opOrigId = data.op3[r._opIdx]?.id;
    const currentOpId = opOrigId ? opOrigIdToCurrentId.get(opOrigId) : undefined;
    const target = (currentOpId && livByOpId.get(currentOpId)) || (r.numCmd ? livByNumCmd.get(norm(r.numCmd)) : undefined);
    if (!target) { report.livraisons.notFound++; continue; }

    const patch: Record<string, string> = {};
    if (r.dateConfirm && !target.dateConfirm) patch.dateConfirm = r.dateConfirm;
    if (r.dateLivraisonReelle && !target.dateLivraisonReelle) patch.dateLivraisonReelle = r.dateLivraisonReelle;
    if (r.remLiv && !target.remLiv) patch.remLiv = r.remLiv;

    if (Object.keys(patch).length === 0) { report.livraisons.skipped++; continue; }
    try {
      await prisma.livraison.update({ where: { id: target.id }, data: patch });
      report.livraisons.updated++;
    } catch (e) {
      report.livraisons.errors.push(`cmd ${r.numCmd ?? "?"} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Appels d'offres : crée ceux qui manquent ---
  const existingAo = await prisma.appelOffre.findMany();
  const aoKeyOf = (a: { chant?: string | null; nom?: string | null; fournisseur?: string | null; dateEnvoi?: string | null }) =>
    nkey(a.chant, a.nom, a.fournisseur, a.dateEnvoi);
  const aoByKey = new Map(existingAo.map((a) => [aoKeyOf(a), a]));
  const opById = new Map(data.op3.map((o) => [o.id, o]));

  for (const r of data.ao1) {
    const opRaw = opById.get(r._opId);
    const statut = r.choisi ? "Clôturé" : r.nonRepondu ? "Annulé" : "En cours";
    const mapped = {
      date: opRaw?.date || null, chant: opRaw?.chant || null, nom: opRaw?.nom || null,
      ent: opRaw?.ent || null, dem: opRaw?.dem || null, fournisseur: r.fournisseur || null,
      prec: opRaw?.prec || null, statut, dateEnvoi: r.launch || null, dateRetour: r.retour || null,
    };
    const key = aoKeyOf(mapped);
    if (aoByKey.has(key)) { report.appelsOffres.skipped++; continue; }
    try {
      const created = await prisma.appelOffre.create({ data: mapped });
      aoByKey.set(key, created);
      report.appelsOffres.created++;
    } catch (e) {
      report.appelsOffres.errors.push(`${mapped.chant ?? "?"} / ${mapped.fournisseur ?? "?"} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  res.json(report);
});
