/**
 * World ID gate on attacks (ETHGlobal Mumbai, ADR-0003). Off unless
 * WORLD_GATE=on, so production behaves exactly as before.
 */
export function isWorldGateEnabled(): boolean {
  return process.env.WORLD_GATE === "on";
}

/** Uniqueness is scoped to this action: one human, one attacking player. */
export const WORLD_ACTION = "miniklaim-attack-2026";

/** `staging` works with the World ID simulator; `production` with real users. */
export function worldEnvironment(): "production" | "staging" {
  return process.env.WORLD_ENVIRONMENT === "production" ? "production" : "staging";
}

export function worldRpId(): string {
  return process.env.WORLD_RP_ID ?? "";
}

export function worldAppId(): string {
  return process.env.WORLD_APP_ID ?? "";
}
