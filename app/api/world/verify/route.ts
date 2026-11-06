import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { worldVerifications } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { addressesForPlayer } from "@/lib/players";
import { playerKey } from "@/lib/runs/hexStrength";
import { WORLD_ACTION, isWorldGateEnabled, worldEnvironment, worldRpId } from "@/lib/world/config";
import { checkProofPayload } from "@/lib/world/proof";

const log = createLogger("api:world:verify");

export const dynamic = "force-dynamic";

/**
 * Verify a World ID proof for a player and store its nullifier (ADR-0003).
 * Body: { address, idkitResponse }. The proof's signal must be the address.
 * One nullifier backs one player: the same human on a second account is
 * rejected, which is what makes the attack gate mean "one human, one army".
 */
export async function POST(request: Request) {
  if (!isWorldGateEnabled()) {
    return NextResponse.json({ error: "world gate off" }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as {
    address?: string;
    idkitResponse?: Record<string, unknown>;
  } | null;
  const address = body?.address ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const environment = worldEnvironment();
  const local = checkProofPayload(body?.idkitResponse as never, {
    environment,
    action: WORLD_ACTION,
    address,
  });
  if ("reason" in local) {
    log.warn("world proof rejected locally", { reason: local.reason });
    return NextResponse.json({ error: "verification failed", reason: local.reason }, { status: 400 });
  }

  const rpId = worldRpId();
  const res = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body!.idkitResponse, environment }),
  });
  const verification = (await res.json().catch(() => null)) as {
    success?: boolean;
    environment?: string;
  } | null;
  if (!res.ok || verification?.success !== true || verification.environment !== environment) {
    log.warn("world proof rejected by portal", { status: res.status });
    return NextResponse.json({ error: "verification failed", reason: "portal" }, { status: 400 });
  }

  const key = playerKey(await addressesForPlayer(address), address);
  const [taken] = await db
    .select({ playerKey: worldVerifications.playerKey })
    .from(worldVerifications)
    .where(eq(worldVerifications.nullifier, local.nullifier))
    .limit(1);
  if (taken && taken.playerKey !== key) {
    log.warn("world nullifier already backs another player");
    return NextResponse.json(
      { error: "this World ID already backs another player", reason: "nullifier-taken" },
      { status: 409 },
    );
  }
  await db
    .insert(worldVerifications)
    .values({ playerKey: key, nullifier: local.nullifier, credential: local.credential, environment })
    .onConflictDoUpdate({
      target: worldVerifications.playerKey,
      set: { nullifier: local.nullifier, credential: local.credential, environment },
    });
  log.info("world proof stored", { credential: local.credential });
  return NextResponse.json({ success: true });
}
