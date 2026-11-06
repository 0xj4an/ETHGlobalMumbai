import { NextResponse } from "next/server";
import { addressesForPlayer } from "@/lib/players";
import { playerKey } from "@/lib/runs/hexStrength";
import { isWorldGateEnabled } from "@/lib/world/config";
import { isPlayerVerified } from "@/lib/world/verified";

export const dynamic = "force-dynamic";

/** GET ?address=0x... -> { gate, verified } */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  if (!isWorldGateEnabled()) return NextResponse.json({ gate: false, verified: true });
  const key = playerKey(await addressesForPlayer(address), address);
  return NextResponse.json({ gate: true, verified: await isPlayerVerified(key) });
}
