import { DECAY_DAYS, effectiveStrength, gameDayMs } from "@/lib/runs/hexStrength";

/** Arkiv block time and the longest lifetime the chain allows (MAX_LIFETIME). */
export const BLOCK_SECONDS = 2;
export const MAX_LIFETIME_BLOCKS = 7_884_000;

export type DefenseState = {
  baseStrength: number;
  damage: number;
  reinforcedAt: Date;
};

export type DefensePlan =
  | { kind: "none"; level: 1 }
  | {
      kind: "entity";
      level: number;
      /** When the hex would reach level 1 with no owner visit. */
      fallsToOneAt: Date;
      /** Lifetime to request, in blocks, capped at the chain maximum. */
      lifetimeBlocks: number;
      /** The cap was hit: the entity must be extended before it expires. */
      needsExtend: boolean;
    };

/**
 * What Arkiv should hold for one hex. Same formula as the game
 * (`effectiveStrength`): the owner part decays one level per DECAY_DAYS game
 * days without a visit, never below 1, so the hex reaches level 1 at
 * reinforcedAt + (afterDamage - 1) * DECAY_DAYS game days.
 */
export function planDefense(state: DefenseState, now: Date, scale?: number): DefensePlan {
  const level = effectiveStrength(state, now, scale);
  if (level <= 1) return { kind: "none", level: 1 };
  const afterDamage = Math.max(1, state.baseStrength - state.damage);
  const fallsToOneAt = new Date(
    state.reinforcedAt.getTime() + (afterDamage - 1) * DECAY_DAYS * gameDayMs(scale),
  );
  const seconds = (fallsToOneAt.getTime() - now.getTime()) / 1000;
  const wanted = Math.ceil(seconds / BLOCK_SECONDS);
  if (wanted < 1) return { kind: "none", level: 1 };
  const lifetimeBlocks = Math.min(wanted, MAX_LIFETIME_BLOCKS);
  return {
    kind: "entity",
    level,
    fallsToOneAt,
    lifetimeBlocks,
    needsExtend: wanted > MAX_LIFETIME_BLOCKS,
  };
}

/** Real seconds per level of decay, stored on the entity so readers can recompute. */
export function decaySecondsPerLevel(scale?: number): number {
  return Math.round((DECAY_DAYS * gameDayMs(scale)) / 1000);
}
