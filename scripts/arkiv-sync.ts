import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { arkivPublicClient } from "../lib/arkiv/client";
import { isArkivSyncEnabled } from "../lib/arkiv/config";
import { queueExtensions, syncPass } from "../lib/arkiv/sync";
import { isEnsTitlesEnabled } from "../lib/ens/config";
import { ensTitlesPass } from "../lib/ens/titles";
import { createLogger } from "../lib/logger";

const log = createLogger("script:arkiv-sync");

/**
 * Writer loop for the ETHGlobal Mumbai mirrors. Every INTERVAL seconds:
 *   1. Arkiv: drain arkiv_queue in atomic batches (ADR-0001).
 *   2. ENS: write a zone's leader when it changed (ADR-0002), at most once
 *      per ENS_MIN_INTERVAL seconds per zone.
 * Runs as an always-on compose service, like the other cron loops.
 *
 *   npm run arkiv:sync            loop
 *   npm run arkiv:sync -- --once  one pass, then exit
 */
const INTERVAL_S = Number(process.env.ARKIV_SYNC_INTERVAL ?? "10");
const BATCH = Number(process.env.ARKIV_BATCH ?? "50");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = postgres(url, { max: 2 });
  const db = drizzle(client);
  const once = process.argv.includes("--once");

  for (;;) {
    if (isArkivSyncEnabled()) {
      try {
        const { currentBlock } = await arkivPublicClient().getBlockTiming();
        const extended = await queueExtensions(db, currentBlock);
        if (extended > 0) log.info("queued extensions", { extended });
        // Drain the queue, one batch per pass, until a pass has nothing left.
        for (let i = 0; i < 20; i++) {
          const r = await syncPass(db, BATCH);
          if (r.processed === 0 || r.error) break;
        }
      } catch (e) {
        log.error("arkiv pass failed", { error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (isEnsTitlesEnabled()) {
      try {
        await ensTitlesPass(db);
      } catch (e) {
        log.error("ens pass failed", { error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }
  await client.end();
}

main().catch((e) => {
  log.error("arkiv-sync crashed", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
