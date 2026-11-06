import { desc, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { cellToChildren } from "h3-js";
import { hexes } from "@/lib/db/schema";
import { HEX_RESOLUTION } from "@/lib/map/config";
import { strengthSql } from "@/lib/runs/hexStrength";

type Db = PgDatabase<PgQueryResultHKT, Record<string, never>>;

export type ZoneStanding = { owner: string; score: number; blocks: number };

/** Pick the leader: highest score; ties go to the most blocks, then the lowest address. */
export function pickLeader(rows: ZoneStanding[]): ZoneStanding | null {
  const sorted = [...rows].sort(
    (a, b) => b.score - a.score || b.blocks - a.blocks || a.owner.localeCompare(b.owner),
  );
  return sorted[0] ?? null;
}

/**
 * Standings in one zone: the sum of each owner's effective levels, so
 * defending counts, not only capturing.
 */
export async function zoneStandings(db: Db, zoneCell: string): Promise<ZoneStanding[]> {
  const cells = cellToChildren(zoneCell, HEX_RESOLUTION);
  const out: ZoneStanding[] = [];
  const level = strengthSql(hexes.baseStrength, hexes.damage, hexes.reinforcedAt);
  const totals = new Map<string, ZoneStanding>();
  for (let i = 0; i < cells.length; i += 5000) {
    const rows = await db
      .select({
        owner: hexes.ownerAddress,
        score: sql<number>`sum(${level})::int`,
        blocks: sql<number>`count(*)::int`,
      })
      .from(hexes)
      .where(inArray(hexes.h3Id, cells.slice(i, i + 5000)))
      .groupBy(hexes.ownerAddress)
      .orderBy(desc(sql`sum(${level})`));
    for (const r of rows) {
      const k = r.owner.toLowerCase();
      const t = totals.get(k) ?? { owner: k, score: 0, blocks: 0 };
      t.score += Number(r.score);
      t.blocks += Number(r.blocks);
      totals.set(k, t);
    }
  }
  out.push(...totals.values());
  return out;
}
