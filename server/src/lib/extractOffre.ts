import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import XLSX from "xlsx";

const ExtractionSchema = z.object({
  montantHT: z.number().nullable(),
  commentaire: z.string(),
});

const client = new Anthropic({ timeout: 60_000 });

const IMAGE_MEDIA_TYPES: Record<string, "image/png" | "image/jpeg" | "image/gif" | "image/webp"> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const SYSTEM_PROMPT = `Tu extrais le montant total HT (hors taxes, hors TVA) d'une offre/soumission de fournisseur pour de la construction, en vue d'un comparatif d'achat.
Si l'offre comporte plusieurs montants (brut/net, avec/sans rabais, HT/TTC, ou plusieurs devises), retiens le montant total HT en CHF après le rabais éventuel indiqué sur la page de garde.
Si le montant n'est pas en CHF, indique-le dans le commentaire et ne convertis pas toi-même.
Si tu ne trouves aucun montant total clair, ou si le document contient plusieurs sous-totaux ambigus rendant le montant total incertain, mets montantHT à null et explique pourquoi en une phrase dans le commentaire.
Réponds toujours en français, en une phrase brève pour le commentaire.`;

export interface ExtractionResult {
  montantHT: number | null;
  commentaire: string;
}

const NO_CREDENTIALS_NOTE =
  "Extraction automatique indisponible : clé API Anthropic manquante sur le serveur (variable ANTHROPIC_API_KEY à configurer sur Railway).";

/**
 * Lit un fichier d'offre joint (PDF, image, ou Excel) et en extrait le
 * montant total HT via l'API Claude.
 *
 * Retourne null UNIQUEMENT si le type de fichier n'est pas pris en charge
 * (ex: .docx) - dans ce cas il n'y a rien d'utile à signaler à
 * l'utilisateur. Dans tous les autres cas où une extraction a été
 * tentée - succès, échec d'authentification, erreur réseau, ou réponse de
 * Claude sans montant clair - un commentaire explicite est toujours
 * retourné, pour que l'utilisateur voie pourquoi le champ reste vide au
 * lieu d'un simple silence. N'a jamais besoin de faire échouer l'upload
 * qui l'appelle : toute erreur est capturée ici.
 */
export async function extractOffreMontant(
  filePath: string,
  originalName: string,
): Promise<ExtractionResult | null> {
  const ext = path.extname(originalName).toLowerCase();
  const supported = ext === ".pdf" || ext === ".xlsx" || ext === ".xls" || !!IMAGE_MEDIA_TYPES[ext];
  if (!supported) {
    // Type non pris en charge pour l'extraction automatique (ex: .docx) :
    // rien d'utile à signaler, quel que soit l'état des identifiants.
    return null;
  }

  // Vérification explicite plutôt que de laisser le SDK échouer à
  // résoudre les identifiants : message clair pour l'utilisateur, et on
  // évite de lire/parser inutilement le fichier joint.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { montantHT: null, commentaire: NO_CREDENTIALS_NOTE };
  }

  let content: Anthropic.Messages.ContentBlockParam[];
  if (ext === ".pdf") {
    const data = fs.readFileSync(filePath).toString("base64");
    content = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
      { type: "text", text: "Extrais le montant total HT de cette offre." },
    ];
  } else if (IMAGE_MEDIA_TYPES[ext]) {
    const data = fs.readFileSync(filePath).toString("base64");
    content = [
      { type: "image", source: { type: "base64", media_type: IMAGE_MEDIA_TYPES[ext], data } },
      { type: "text", text: "Extrais le montant total HT de cette offre." },
    ];
  } else if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.readFile(filePath);
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      parts.push(`--- Feuille: ${sheetName} ---\n${csv}`);
    }
    const text = parts.join("\n\n").slice(0, 100_000);
    content = [
      { type: "text", text: `Voici le contenu (converti en CSV) d'une offre fournisseur au format Excel :\n\n${text}\n\nExtrais le montant total HT.` },
    ];
  } else {
    // Type non pris en charge pour l'extraction automatique (ex: .docx).
    return null;
  }

  try {
    const message = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(ExtractionSchema), effort: "low" },
    });
    if (!message.parsed_output) {
      return { montantHT: null, commentaire: "La réponse de l'IA n'a pas pu être interprétée - réessayez ou saisissez le montant manuellement." };
    }
    return message.parsed_output;
  } catch (err) {
    console.error("Extraction du montant de l'offre échouée:", err instanceof Error ? err.message : err);
    if (err instanceof Anthropic.AuthenticationError) {
      return { montantHT: null, commentaire: NO_CREDENTIALS_NOTE };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { montantHT: null, commentaire: "Extraction automatique temporairement indisponible (limite de requêtes atteinte) - réessayez dans quelques instants." };
    }
    if (err instanceof Anthropic.APIError) {
      return { montantHT: null, commentaire: `Extraction automatique échouée (erreur API ${err.status}) - saisissez le montant manuellement.` };
    }
    return { montantHT: null, commentaire: "Extraction automatique échouée (problème réseau ou serveur) - saisissez le montant manuellement." };
  }
}
