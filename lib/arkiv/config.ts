/**
 * Arkiv mirror of hex defense (ETHGlobal Mumbai). Off unless ARKIV_SYNC=on,
 * so production behaves exactly as before.
 *
 * ARKIV_GAME tags every entity (`prod` or `demo`) so demo data never mixes
 * with real data under the same schema.
 */
export function isArkivSyncEnabled(): boolean {
  return process.env.ARKIV_SYNC === "on";
}

/** The map reads levels from Arkiv instead of Postgres. */
export function isArkivMapEnabled(): boolean {
  return process.env.ARKIV_MAP === "on";
}

export function arkivGame(): "prod" | "demo" {
  return process.env.ARKIV_GAME === "prod" ? "prod" : "demo";
}

export function arkivAccessKey(): string {
  return process.env.ARKIV_ACCESS_KEY ?? "";
}

/** H3 resolution of a zone: the unit for map queries and ENS titles. */
export const ZONE_RESOLUTION = 7;
