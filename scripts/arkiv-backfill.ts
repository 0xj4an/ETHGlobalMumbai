import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { cellToParent } from "h3-js";
import postgres from "postgres";
import { ZONE_RESOLUTION } from "../lib/arkiv/config";
import { arkivQueue, hexes } from "../lib/db/schema";
import { createLogger } from "../lib/logger";

const log = createLogger("script:arkiv-backfill");

/**
 * Queue every hex above base level 1 for the Arkiv writer. With --zone=<h3
 * res-7 cell> only that zone (the demo). The writer decides what each one
 * needs (an entity, or nothing if it already decayed to level 1).
 *
 *   npm run arkiv:backfill -- --zone=873da1...
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const zoneArg = process.argv.find((a) => a.startsWith("--zone="))?.slice(7) ?? null;
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  const rows = await db
    .select({ h3Id: hexes.h3Id })
    .from(hexes)
    .where(gt(sql`${hexes.baseStrength} - ${hexes.damage}`, 1));
  const ids = rows
    .map((r) => r.h3Id)
    .filter((h3) => !zoneArg || cellToParent(h3, ZONE_RESOLUTION) === zoneArg);
  for (let i = 0; i < ids.length; i += 1000) {
    await db
      .insert(arkivQueue)
      .values(ids.slice(i, i + 1000).map((h3Id) => ({ h3Id })))
      .onConflictDoNothing();
  }
  log.info("queued for arkiv", { count: ids.length, zone: zoneArg ?? "all" });
  await client.end();
}

main().catch((e) => {
  log.error("backfill failed", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
