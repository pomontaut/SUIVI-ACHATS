import { Router } from "express";
import seedData from "../../prisma/seed-data.json" with { type: "json" };

// Listes de référence (menus déroulants) reprises telles quelles de l'outil
// HTML d'origine. Statiques : elles ne changent pas au gré des utilisateurs,
// donc pas besoin d'une table en base pour ça.
const OPTIONS = {
  FOURNITURES: seedData.FOURNITURES,
  ETAPES: seedData.ETAPES,
  ACTIONS_TR: seedData.ACTIONS_TR,
  ENTITES: seedData.ENTITES,
  TYPES_OP: seedData.TYPES_OP,
  TYPES_TR: seedData.TYPES_TR,
  PRIOS: seedData.PRIOS,
  IMPL: seedData.IMPL,
  TCO_OPTS: seedData.TCO_OPTS,
  COMMENT_OPTS: seedData.COMMENT_OPTS,
  BUDGET_TYPE_OPTS: seedData.BUDGET_TYPE_OPTS,
  NC_STATUTS_SIMPLE: seedData.NC_STATUTS_SIMPLE,
  NC_TYPES: seedData.NC_TYPES,
  NC_TYPOLOGIES: seedData.NC_TYPOLOGIES,
  NC_STATUTS: seedData.NC_STATUTS,
  AO_STATUT_OPTS: seedData.AO_STATUT_OPTS,
  AO_VALIDATION_OPTS: ["Adjudicataire", "Pas répondu", "Non retenu", "Ne veut pas soumettre offre", "Ne sait pas faire"],
  AO_STATUT_COMMANDE_OPTS: ["En cours", "Commandé", "Annulé"],
  TD_STATUTS: seedData.TD_STATUTS,
  PERT_CATS: seedData.PERT_CATS,
  TRANCHES: seedData.TRANCHES,
};

export const optionsRouter = Router();

optionsRouter.get("/", (_req, res) => {
  res.json(OPTIONS);
});
