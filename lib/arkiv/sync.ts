import { ExpirationTime } from "@arkiv-network/sdk";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { cellToParent } from "h3-js";
import { arkivEntities, arkivQueue, hexes } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { arkivPublicClient, arkivWalletClient } from "./client";
import { ZONE_RESOLUTION, arkivGame } from "./config";
import { decaySecondsPerLevel, planDefense } from "./expiry";
import { type SyncOp, planSync } from "./plan";
import { HexDefense, hexDefenseColumns } from "./schema";

const log = createLogger("arkiv:sync");

type Db = PgDatabase<PgQueryResultHKT, Record<string, never>>;

/** Blocks before expiry at which a capped entity (levels 8-10) is extended. */
const EXTEND_MARGIN_BLOCKS = 302_400n; // about 7 days

export type SyncPassResult = {
  processed: number;
  creates: number;
  patches: number;
  deletes: number;
  txHash: string | null;
  error: string | null;
};

/** Queue capped entities that are close to expiring so the next pass extends them. */
export async function queueExtensions(db: Db, currentBlock: bigint): Promise<number> {
  const due = await db
    .select({ h3Id: arkivEntities.h3Id })
    .from(arkivEntities)
    .where(
      and(
        eq(arkivEntities.needsExtend, true),
        lt(arkivEntities.expiresAtBlock, currentBlock + EXTEND_MARGIN_BLOCKS),
      ),
    )
    .limit(500);
  if (due.length === 0) return 0;
  await db
    .insert(arkivQueue)
    .values(due.map((d) => ({ h3Id: d.h3Id })))
    .onConflictDoNothing();
  return due.length;
}

/**
 * One pass: take the oldest queued hexes, read their committed state, plan
 * one Arkiv operation each, send them as one atomic batch, record the result.
 * Rows re-queued while the pass ran (newer queued_at) stay queued.
 */
export async function syncPass(db: Db, batchSize: number): Promise<SyncPassResult> {
  const result: SyncPassResult = {
    processed: 0,
    creates: 0,
    patches: 0,
    deletes: 0,
    txHash: null,
    error: null,
  };
  const queued = await db
    .select({ h3Id: arkivQueue.h3Id, queuedAt: arkivQueue.queuedAt })
    .from(arkivQueue)
    .orderBy(asc(arkivQueue.queuedAt))
    .limit(batchSize);
  if (queued.length === 0) return result;

  const ids = queued.map((q) => q.h3Id);
  const [state, known] = await Promise.all([
    db
      .select({
        h3Id: hexes.h3Id,
        owner: hexes.ownerAddress,
        baseStrength: hexes.baseStrength,
        damage: hexes.damage,
        reinforcedAt: hexes.reinforcedAt,
        city: hexes.city,
      })
      .from(hexes)
      .where(inArray(hexes.h3Id, ids)),
    db.select().from(arkivEntities).where(inArray(arkivEntities.h3Id, ids)),
  ]);
  const stateById = new Map(state.map((s) => [s.h3Id, s]));
  const knownById = new Map(known.map((k) => [k.h3Id, k]));

  const publicClient = arkivPublicClient();
  const { currentBlock } = await publicClient.getBlockTiming();
  const now = new Date();
  const game = arkivGame();
  const decaySeconds = decaySecondsPerLevel();

  type Planned = { h3: string; op: SyncOp; level: number; needsExtend: boolean };
  const planned: Planned[] = [];
  for (const h3 of ids) {
    const s = stateById.get(h3);
    const k = knownById.get(h3);
    const wanted = s
      ? planDefense(
          { baseStrength: s.baseStrength, damage: s.damage, reinforcedAt: s.reinforcedAt },
          now,
        )
      : ({ kind: "none", level: 1 } as const);
    const op = planSync(
      wanted,
      k ? { entityKey: k.entityKey as `0x${string}`, expiresAtBlock: k.expiresAtBlock } : null,
      currentBlock,
    );
    planned.push({
      h3,
      op,
      level: wanted.level,
      needsExtend: wanted.kind === "entity" ? wanted.needsExtend : false,
    });
  }

  const values = (h3: string, level: number) => {
    const s = stateById.get(h3)!;
    return hexDefenseColumns({
      h3,
      zone: cellToParent(h3, ZONE_RESOLUTION),
      player: s.owner as `0x${string}`,
      level,
      base: s.baseStrength,
      damage: s.damage,
      reinforcedAt: s.reinforcedAt,
      decaySeconds,
      game,
      city: s.city,
    });
  };

  const creates: Array<{ h3: string; level: number; lifetime: number; needsExtend: boolean }> = [];
  const deletes: Array<`0x${string}`> = [];
  const patches: Array<{ h3: string; key: `0x${string}`; level: number; lifetime: number; needsExtend: boolean }> = [];
  const removed: string[] = [];
  for (const p of planned) {
    switch (p.op.op) {
      case "noop":
        if (knownById.has(p.h3)) removed.push(p.h3);
        break;
      case "delete":
        deletes.push(p.op.entityKey);
        removed.push(p.h3);
        break;
      case "create":
        creates.push({ h3: p.h3, level: p.level, lifetime: p.op.lifetimeBlocks, needsExtend: p.needsExtend });
        break;
      case "replace":
        deletes.push(p.op.entityKey);
        creates.push({ h3: p.h3, level: p.level, lifetime: p.op.lifetimeBlocks, needsExtend: p.needsExtend });
        break;
      case "patch-extend":
        patches.push({ h3: p.h3, key: p.op.entityKey, level: p.level, lifetime: p.op.lifetimeBlocks, needsExtend: p.needsExtend });
        break;
    }
  }

  try {
    if (creates.length + deletes.length + patches.length > 0) {
      const wallet = arkivWalletClient();
      const batch = await wallet.executeBatch({
        creates: creates.map((c) => ({
          schema: HexDefense,
          values: values(c.h3, c.level),
          expiration: ExpirationTime.fromBlocks(c.lifetime),
        })),
        patches: patches.map((p) => ({
          schema: HexDefense,
          entityKey: p.key,
          set: values(p.h3, p.level),
        })),
        extensions: patches.map((p) => ({
          entityKey: p.key,
          expiration: ExpirationTime.fromBlocks(p.lifetime),
        })),
        deletes: deletes.map((entityKey) => ({ entityKey })),
      });
      result.txHash = batch.txHash;
      const rows = [
        ...creates.map((c, i) => ({
          h3Id: c.h3,
          entityKey: batch.createdEntities[i]!,
          expiresAtBlock: currentBlock + BigInt(c.lifetime),
          needsExtend: c.needsExtend,
          level: c.level,
          lastTx: batch.txHash,
        })),
        ...patches.map((p) => ({
          h3Id: p.h3,
          entityKey: p.key,
          expiresAtBlock: currentBlock + BigInt(p.lifetime),
          needsExtend: p.needsExtend,
          level: p.level,
          lastTx: batch.txHash,
        })),
      ];
      if (rows.length > 0) {
        await db
          .insert(arkivEntities)
          .values(rows)
          .onConflictDoUpdate({
            target: arkivEntities.h3Id,
            set: {
              entityKey: sql`excluded.entity_key`,
              expiresAtBlock: sql`excluded.expires_at_block`,
              needsExtend: sql`excluded.needs_extend`,
              level: sql`excluded.level`,
              lastTx: sql`excluded.last_tx`,
              syncedAt: sql`now()`,
            },
          });
      }
    }
    if (removed.length > 0) {
      await db.delete(arkivEntities).where(inArray(arkivEntities.h3Id, removed));
    }
    // Drop only the rows this pass saw; a newer queued_at means another change.
    for (const q of queued) {
      await db
        .delete(arkivQueue)
        .where(and(eq(arkivQueue.h3Id, q.h3Id), eq(arkivQueue.queuedAt, q.queuedAt)));
    }
    result.processed = queued.length;
    result.creates = creates.length;
    result.patches = patches.length;
    result.deletes = deletes.length;
    log.info("arkiv batch written", { ...result });
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    result.error = message;
    await db
      .update(arkivQueue)
      .set({ attempts: sql`${arkivQueue.attempts} + 1`, lastError: message })
      .where(inArray(arkivQueue.h3Id, ids));
    log.error("arkiv batch failed", { error: message, size: ids.length });
  }
  return result;
}
