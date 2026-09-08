import { prisma } from "./prisma.js";

/** Anciens intitulés de la liste "Type action achat" / "Commentaire" fusionnés
 * avec l'option déjà existante qui portait le même sens (doublons retirés de
 * COMMENT_OPTS). Exécuté à chaque démarrage : idempotent, ne touche que les
 * lignes qui portent encore l'ancien intitulé. */
const RENAMES: Record<string, string> = {
  "Au plus vite": "Urgence / dispo stock / délai court",
  "Commande contrat cadre": "Accord cadre utilisé",
  "Pas le choix du fournisseur": "Fournisseur imposé",
  "Passation sur devis": "Demande passation de commande",
};

export async function normalizeCommentOpts(): Promise<void> {
  for (const [oldValue, newValue] of Object.entries(RENAMES)) {
    await prisma.operation.updateMany({ where: { typeActionAchat: oldValue }, data: { typeActionAchat: newValue } });
    await prisma.operation.updateMany({ where: { comment: oldValue }, data: { comment: newValue } });
  }
}
