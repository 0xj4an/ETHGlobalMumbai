import { and, asc, eq, gt } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/schema";
import { arkivPublicClient, arkivWriterAddress } from "./client";
import { arkivGame } from "./config";
import { HexDefense } from "./schema";

export type ArkivDefense = {
  h3: string;
  player: string;
  level: number;
  entityKey: `0x${string}`;
  expiresAtBlock: bigint;
};

/**
 * Level now, from what the entity stores. Same rule as the game: one level
 * lost per `decaySeconds` without an owner visit, never below 1.
 */
export function levelFromEntity(
  e: { base: number; damage: number; reinforcedAt: bigint; decaySeconds: number },
  nowSeconds: number,
): number {
  const afterDamage = Math.max(1, e.base - e.damage);
  const elapsed = Math.max(0, nowSeconds - Number(e.reinforcedAt));
  const periods = Math.floor(elapsed / Math.max(1, e.decaySeconds));
  return Math.max(1, afterDamage - Math.min(periods, afterDamage - 1));
}

/**
 * Every defended hex in one zone, read from Arkiv. Only entities written by
 * the game relayer count: anyone can write with this schema's tag.
 */
export async function fetchZoneDefense(zone: string): Promise<Map<string, ArkivDefense>> {
  const client = arkivPublicClient();
  const writer = arkivWriterAddress();
  const game = arkivGame();
  const out = new Map<string, ArkivDefense>();
  const nowSeconds = Math.floor(Date.now() / 1000);
  let lastKey: `0x${string}` | undefined;
  for (let page = 0; page < 200; page++) {
    let q = client
      .select({
        $key: true,
        $expiresAt: true,
        h3: true,
        player: true,
        base: true,
        damage: true,
        reinforcedAt: true,
        decaySeconds: true,
      })
      .from(HexDefense)
      .ownedBy(writer)
      .where(and(eq("zone", zone), eq("game", game)))
      .orderBy(asc("$key"))
      .limit(100);
    if (lastKey) q = q.where(gt("$key", key(lastKey)));
    const { entities } = await q.fetch();
    for (const e of entities) {
      const h3 = e.h3.value;
      const level = levelFromEntity(
        {
          base: e.base.value,
          damage: e.damage.value,
          reinforcedAt: e.reinforcedAt.value,
          decaySeconds: e.decaySeconds.value,
        },
        nowSeconds,
      );
      const prev = out.get(h3);
      // A replace can leave the old entity alive for a few blocks: keep the
      // one that expires last.
      if (!prev || prev.expiresAtBlock < e.$expiresAt) {
        out.set(h3, {
          h3,
          player: e.player.value,
          level,
          entityKey: e.$key,
          expiresAtBlock: e.$expiresAt,
        });
      }
    }
    if (entities.length < 100) break;
    lastKey = entities[entities.length - 1]!.$key;
  }
  return out;
}
