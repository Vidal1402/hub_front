/**
 * Zera todas as coleções de dados no MongoDB (mantém índices/schema implícito).
 * Uso (PowerShell):
 *   $env:MONGODB_URI="mongodb+srv://..."
 *   node scripts/clear-mongo-all.mjs
 *
 * Requer: npm install (mongodb está em devDependencies).
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("Defina MONGODB_URI com a connection string do MongoDB (Railway/Atlas).");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const cols = await db.listCollections().toArray();
  const names = cols.map((c) => c.name).filter((n) => !n.startsWith("system."));

  if (dryRun) {
    console.log("Coleções que seriam esvaziadas:", names.join(", ") || "(nenhuma)");
    process.exit(0);
  }

  for (const name of names) {
    const r = await db.collection(name).deleteMany({});
    console.log(`${name}: removidos ${r.deletedCount} documento(s)`);
  }
  console.log("OK: MongoDB zerado (coleções vazias).");
} finally {
  await client.close();
}
