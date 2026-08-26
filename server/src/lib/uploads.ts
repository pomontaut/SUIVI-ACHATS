import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dossier de stockage des fichiers joints (offres fournisseur, etc.).
 * Dérivé de DATABASE_URL pour rester sur le même volume persistant que la
 * base SQLite en production (ex: DATABASE_URL=file:/app/data/dev.db ->
 * /app/data/uploads), sans nécessiter de variable d'environnement séparée.
 */
export function uploadsDir(): string {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const m = dbUrl.match(/^file:(.+)$/);
  const base = m ? path.dirname(path.resolve(m[1])) : path.join(__dirname, "../..");
  const dir = path.join(base, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
