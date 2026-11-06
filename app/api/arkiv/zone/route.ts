import { getResolution, isValidCell } from "h3-js";
import { NextResponse } from "next/server";
import { ARKIV_EXPLORER, arkivWriterAddress } from "@/lib/arkiv/client";
import { ZONE_RESOLUTION, arkivGame, isArkivMapEnabled, isArkivSyncEnabled } from "@/lib/arkiv/config";
import { zoneDefense } from "@/lib/arkiv/zoneCache";

export const dynamic = "force-dynamic";

/**
 * GET ?zone=<h3 res-7 cell>: every defended block in the zone, read from
 * Arkiv (not from MiniKlaim's database). Public, so anyone can check the
 * mirror against the chain.
 */
export async function GET(request: Request) {
  if (!isArkivSyncEnabled() && !isArkivMapEnabled()) {
    return NextResponse.json({ error: "arkiv off" }, { status: 404 });
  }
  const zone = new URL(request.url).searchParams.get("zone") ?? "";
  if (!isValidCell(zone) || getResolution(zone) !== ZONE_RESOLUTION) {
    return NextResponse.json({ error: `zone must be an H3 res-${ZONE_RESOLUTION} cell` }, { status: 400 });
  }
  const entries = [...(await zoneDefense(zone)).values()];
  return NextResponse.json({
    zone,
    game: arkivGame(),
    writer: arkivWriterAddress(),
    explorer: ARKIV_EXPLORER,
    count: entries.length,
    hexes: entries.map((e) => ({
      h3: e.h3,
      player: e.player,
      level: e.level,
      entityKey: e.entityKey,
      expiresAtBlock: e.expiresAtBlock.toString(),
    })),
  });
}
