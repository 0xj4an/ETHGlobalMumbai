import { hashSignal } from "@worldcoin/idkit-core/hashing";

export type ProofCheck =
  | { ok: true; nullifier: string; credential: string }
  | { ok: false; reason: string };

type ResponseItem = {
  identifier?: string;
  signal_hash?: string;
  nullifier?: string;
};

/**
 * Local checks before and after the Developer Portal verifies the proof:
 * the right environment and action, a nullifier, and a signal that binds the
 * proof to this player's address (so a proof cannot be replayed for someone
 * else). Pure, for tests.
 */
export function checkProofPayload(
  payload: { environment?: string; action?: string; responses?: ResponseItem[] } | null,
  expected: { environment: string; action: string; address: string },
): ProofCheck {
  if (!payload || typeof payload !== "object") return { ok: false, reason: "no-payload" };
  if (payload.environment !== expected.environment) return { ok: false, reason: "environment" };
  if (payload.action !== undefined && payload.action !== expected.action) {
    return { ok: false, reason: "action" };
  }
  const item = payload.responses?.[0];
  if (!item?.nullifier) return { ok: false, reason: "no-nullifier" };
  const signal = hashSignal(expected.address.toLowerCase()).toLowerCase();
  if (item.signal_hash && item.signal_hash.toLowerCase() !== signal) {
    return { ok: false, reason: "signal" };
  }
  return { ok: true, nullifier: item.nullifier.toLowerCase(), credential: item.identifier ?? "unknown" };
}
