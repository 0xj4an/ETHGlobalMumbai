import { addr, defineSchema, i32, str, u64 } from "@arkiv-network/sdk/schema";

/**
 * One entity per hex above level 1 (ADR-0001). The entity expires when the
 * hex would decay back to level 1 with no owner visit. An expired entity
 * means "level 1, still owned", never "free": only a capture takes a hex.
 *
 * Every entity is owned by the game relayer, because attacks update it and
 * only the owner can. The player is the `player` column. Readers must add
 * `.ownedBy(relayer)`: anyone can write an entity with this tag.
 */
export const HexDefense = defineSchema("miniklaim.hex-defense", {
  h3: str().indexed(),
  zone: str().indexed(),
  player: addr().indexed(),
  level: i32().indexed(),
  base: i32(),
  damage: i32(),
  reinforcedAt: u64().indexed(),
  decaySeconds: i32(),
  game: str().indexed(),
  city: str().optional(),
});

export type HexDefenseValues = {
  h3: string;
  zone: string;
  player: `0x${string}`;
  level: number;
  base: number;
  damage: number;
  reinforcedAt: Date;
  decaySeconds: number;
  game: "prod" | "demo";
  city: string | null;
};

/** Typed values for a create or a full patch. */
export function hexDefenseColumns(v: HexDefenseValues) {
  return {
    h3: v.h3,
    zone: v.zone,
    player: addr(v.player.toLowerCase() as `0x${string}`),
    level: i32(v.level),
    base: i32(v.base),
    damage: i32(v.damage),
    reinforcedAt: u64(BigInt(Math.floor(v.reinforcedAt.getTime() / 1000))),
    decaySeconds: i32(v.decaySeconds),
    game: v.game,
    ...(v.city ? { city: v.city.slice(0, 120) } : {}),
  };
}
