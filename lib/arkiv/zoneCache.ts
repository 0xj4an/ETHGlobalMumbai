import { type ArkivDefense, fetchZoneDefense } from "./read";

const TTL_MS = 10_000;
const cache = new Map<string, { at: number; value: Promise<Map<string, ArkivDefense>> }>();

/** Zone reads from Arkiv, shared for 10 s so a busy map does not hammer the RPC. */
export function zoneDefense(zone: string): Promise<Map<string, ArkivDefense>> {
  const hit = cache.get(zone);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = fetchZoneDefense(zone).catch((e) => {
    cache.delete(zone);
    throw e;
  });
  cache.set(zone, { at: Date.now(), value });
  return value;
}
