import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ARKIV_EXPLORER, arkivWriterAddress } from "@/lib/arkiv/client";
import { arkivGame, isArkivMapEnabled, isArkivSyncEnabled } from "@/lib/arkiv/config";
import { zoneDefense } from "@/lib/arkiv/zoneCache";
import { db } from "@/lib/db";
import { ensTitles } from "@/lib/db/schema";
import { ENS_PARENT, isEnsTitlesEnabled } from "@/lib/ens/config";
import { readZoneTitle } from "@/lib/ens/read";
import { configuredZones } from "@/lib/ens/zones";
import { timeScale } from "@/lib/runs/hexStrength";
import { WORLD_ACTION, isWorldGateEnabled, worldAppId, worldEnvironment, worldRpId } from "@/lib/world/config";

export const dynamic = "force-dynamic";

/**
 * Everything the /mumbai demo page shows, in one call: the zones, how many
 * defended blocks each has on Arkiv, and each zone's ENS title read back from
 * mainnet. Each part fails on its own.
 */
export async function GET() {
  const zones = configuredZones();
  const arkivOn = isArkivSyncEnabled() || isArkivMapEnabled();
  const rows = await Promise.all(
    zones.map(async (z) => {
      const [arkiv, onEns, last] = await Promise.all([
        arkivOn
          ? zoneDefense(z.cell)
              .then((m) => ({
                count: m.size,
                top: [...m.values()]
                  .sort((a, b) => b.level - a.level)
                  .slice(0, 5)
                  .map((d) => ({ h3: d.h3, level: d.level, player: d.player, entityKey: d.entityKey })),
              }))
              .catch(() => null)
          : null,
        isEnsTitlesEnabled() ? readZoneTitle(z.name).catch(() => null) : null,
        db.select().from(ensTitles).where(eq(ensTitles.zone, z.cell)).limit(1).then((r) => r[0] ?? null).catch(() => null),
      ]);
      return {
        label: z.label,
        cell: z.cell,
        ensName: z.name,
        arkiv,
        ens: onEns,
        lastTx: last?.txHash ?? null,
      };
    }),
  );
  return NextResponse.json({
    timeScale: timeScale(),
    arkiv: arkivOn
      ? { game: arkivGame(), writer: safe(arkivWriterAddress), explorer: ARKIV_EXPLORER }
      : null,
    world: isWorldGateEnabled()
      ? { appId: worldAppId(), rpId: worldRpId(), action: WORLD_ACTION, environment: worldEnvironment() }
      : null,
    ens: isEnsTitlesEnabled() ? { parent: ENS_PARENT } : null,
    zones: rows,
  });
}

function safe(f: () => string): string | null {
  try {
    return f();
  } catch {
    return null;
  }
}
