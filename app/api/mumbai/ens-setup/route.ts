import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { buildSetup } from "@/lib/ens/setup";
import { configuredZones } from "@/lib/ens/zones";

export const dynamic = "force-dynamic";

/**
 * The ENS setup transactions for the owner of miniklaim.eth to sign, each
 * already simulated on mainnet state. Read-only: nothing is sent from here.
 * GET ?owner=0x...&relayer=0x...
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") ?? "";
  const relayer = url.searchParams.get("relayer") ?? process.env.ENS_RELAYER_ADDRESS ?? "";
  if (!isAddress(owner) || !isAddress(relayer)) {
    return NextResponse.json({ error: "owner and relayer must be addresses" }, { status: 400 });
  }
  const zones = configuredZones();
  if (zones.length === 0) return NextResponse.json({ error: "no ENS_ZONES" }, { status: 400 });
  const plan = await buildSetup({ owner, relayer, zones });
  return NextResponse.json({
    registry: plan.registry,
    resolver: plan.resolver,
    expiry: plan.expiry.toString(),
    txs: plan.txs.map((t) => ({ step: t.step, to: t.to, data: t.data, ok: t.ok, gasUsed: t.gasUsed.toString() })),
  });
}
