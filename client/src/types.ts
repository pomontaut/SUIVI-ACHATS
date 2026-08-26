export interface Base {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Operation extends Base {
  date: string | null;
  dem: string | null;
  ent: string | null;
  chant: string | null;
  nom: string | null;
  type: string | null;
  impl: string | null;
  fourn: string | null;
  prec: string | null;
  etape: string | null;
  consult: string | null;
  rem: string | null;
  launch: string | null;
  retour: string | null;
  retourMax: string | null;
  dateCmd: string | null;
  dateLivraison: string | null;
  dateLivraisonReelle: string | null;
  numCmd: string | null;
  budget: string | null;
  typeBudget: string | null;
  montant: string | null;
  gain: string | null;
  tco: string | null;
  fournisseur: string | null;
  typeActionAchat: string | null;
  comment: string | null;
  statutAo: string | null;
  prio: string | null;
  vuDate: string | null;
}

export interface Transverse extends Base {
  date: string | null;
  dem: string | null;
  ent: string | null;
  nom: string | null;
  type: string | null;
  prec: string | null;
  budget: string | null;
  rem: string | null;
  action: string | null;
  retour: string | null;
  prio: string | null;
  statut: string | null;
  vuDate: string | null;
}

export interface Todo extends Base {
  prio: string | null;
  statut: string | null;
  qui: string | null;
  quoi: string | null;
  deadline: string | null;
  action: string | null;
  deadlineAction: string | null;
  vuDate: string | null;
}

export interface NonConformite extends Base {
  date: string | null;
  fournisseur: string | null;
  ent: string | null;
  chant: string | null;
  nom: string | null;
  ctx: string | null;
  montantCmd: string | null;
  catNC: string | null;
  typeNC: string | null;
  statut: string | null;
  statutNC: string | null;
  montantNC: string | null;
  noteCredit: string | null;
  noteCreditNum: string | null;
  rem: string | null;
}

export interface Livraison extends Base {
  operationId: string | null;
  chant: string | null;
  nom: string | null;
  numCmd: string | null;
  ent: string | null;
  dem: string | null;
  fournisseur: string | null;
  prec: string | null;
  montant: string | null;
  dateCmd: string | null;
  dateConfirm: string | null;
  dateLivraison: string | null;
  dateLivraisonReelle: string | null;
  remLiv: string | null;
}

export interface AppelOffre extends Base {
  operationId: string | null;
  date: string | null;
  chant: string | null;
  nom: string | null;
  ent: string | null;
  dem: string | null;
  fournisseur: string | null;
  prec: string | null;
  statut: string | null;
  dateEnvoi: string | null;
  dateRetourMax: string | null;
  dateRetour: string | null;
  rem: string | null;
  offreFournisseur: string | null;
  offreFichierNom: string | null;
  offreFichierUrl: string | null;
  offreMontantAuto: boolean;
  offreExtractionNote: string | null;
  comparatifTechnique: string | null;
  validation: string | null;
}

export interface AoSujet {
  id: string;
  cle: string;
  statutCommande: string | null;
  numCmd: string | null;
}

export interface SuiviAdministratif extends Base {
  operationId: string | null;
  date: string | null;
  chant: string | null;
  nom: string | null;
  ent: string | null;
  dem: string | null;
  fournisseur: string | null;
  prec: string | null;
  fourn: string | null;
  numCmd: string | null;
  dateCmd: string | null;
  confirmation: string | null;
  confirmationFichierNom: string | null;
  confirmationFichierUrl: string | null;
  bl: string | null;
  blFichierNom: string | null;
  blFichierUrl: string | null;
}

export interface Fournisseur {
  id: string;
  nom: string;
  npa: string | null;
  ville: string | null;
  pays: string | null;
  manuel: boolean;
  createdAt: string;
}

export interface Chantier {
  id: string;
  numero: string;
  nom: string | null;
  npa: string | null;
  ville: string | null;
  manuel: boolean;
}

export interface Options {
  FOURNITURES: string[];
  ETAPES: string[];
  ACTIONS_TR: string[];
  ENTITES: string[];
  TYPES_OP: string[];
  TYPES_TR: string[];
  PRIOS: string[];
  IMPL: string[];
  TCO_OPTS: string[];
  COMMENT_OPTS: string[];
  BUDGET_TYPE_OPTS: string[];
  NC_STATUTS_SIMPLE: string[];
  NC_TYPES: string[];
  NC_TYPOLOGIES: string[];
  NC_STATUTS: string[];
  AO_STATUT_OPTS: string[];
  AO_VALIDATION_OPTS: string[];
  AO_STATUT_COMMANDE_OPTS: string[];
  TD_STATUTS: string[];
  PERT_CATS: { key: string; label: string; kw: string[] }[];
  TRANCHES: { lbl: string; min: number; max: number | null; col: string }[];
}
