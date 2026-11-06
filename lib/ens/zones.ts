import { isValidCell, getResolution } from "h3-js";
import { ZONE_RESOLUTION } from "@/lib/arkiv/config";
import { ENS_PARENT } from "./config";

export type Zone = { label: string; cell: string; name: string };

/**
 * Zones with an ENS title. From ENS_ZONES, a JSON list such as
 * [{"label":"bkc","cell":"87608b...fffffff"}], each cell an H3 res-7 index.
 * A label becomes `<label>.miniklaim.eth`.
 */
export function parseZones(raw: string | undefined): Zone[] {
  if (!raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: Zone[] = [];
  for (const z of list) {
    const label = typeof z?.label === "string" ? z.label.toLowerCase() : "";
    const cell = typeof z?.cell === "string" ? z.cell : "";
    if (!/^[a-z0-9-]{1,32}$/.test(label)) continue;
    if (!isValidCell(cell) || getResolution(cell) !== ZONE_RESOLUTION) continue;
    out.push({ label, cell, name: `${label}.${ENS_PARENT}` });
  }
  return out;
}

export function configuredZones(): Zone[] {
  return parseZones(process.env.ENS_ZONES);
}
