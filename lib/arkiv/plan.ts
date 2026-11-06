import type { DefensePlan } from "./expiry";

export type KnownEntity = {
  entityKey: `0x${string}`;
  /** Block the entity expires at, as last written. */
  expiresAtBlock: bigint;
};

export type SyncOp =
  | { op: "noop" }
  | { op: "delete"; entityKey: `0x${string}` }
  | { op: "create"; lifetimeBlocks: number }
  | { op: "replace"; entityKey: `0x${string}`; lifetimeBlocks: number }
  | { op: "patch-extend"; entityKey: `0x${string}`; lifetimeBlocks: number };

/**
 * Turn the wanted state of one hex into one Arkiv operation.
 *
 * Arkiv can extend an expiry but never shorten it, so when an attack (or a
 * capture by someone else at level 1, which removes defense) makes the hex
 * fall to level 1 sooner, the entity is deleted and created again in the same
 * atomic batch. A reinforce only moves the expiry later: patch + extend.
 * An entity already past its expiry is gone on Arkiv, so it is recreated.
 */
export function planSync(
  wanted: DefensePlan,
  known: KnownEntity | null,
  currentBlock: bigint,
): SyncOp {
  if (wanted.kind === "none") {
    if (!known || known.expiresAtBlock <= currentBlock) return { op: "noop" };
    return { op: "delete", entityKey: known.entityKey };
  }
  if (!known || known.expiresAtBlock <= currentBlock) {
    return { op: "create", lifetimeBlocks: wanted.lifetimeBlocks };
  }
  const wantedExpiry = currentBlock + BigInt(wanted.lifetimeBlocks);
  if (wantedExpiry < known.expiresAtBlock) {
    return { op: "replace", entityKey: known.entityKey, lifetimeBlocks: wanted.lifetimeBlocks };
  }
  return { op: "patch-extend", entityKey: known.entityKey, lifetimeBlocks: wanted.lifetimeBlocks };
}
