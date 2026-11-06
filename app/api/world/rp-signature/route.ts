import { signRequest } from "@worldcoin/idkit-core/signing";
import { NextResponse } from "next/server";
import { WORLD_ACTION, isWorldGateEnabled } from "@/lib/world/config";

export const dynamic = "force-dynamic";

/**
 * RP signature for one World ID request (ETHGlobal Mumbai, ADR-0003).
 * Signed on the server: the signing key never reaches the client.
 */
export async function POST() {
  if (!isWorldGateEnabled()) {
    return NextResponse.json({ error: "world gate off" }, { status: 404 });
  }
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  if (!signingKeyHex) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const { sig, nonce, createdAt, expiresAt } = signRequest({ signingKeyHex, action: WORLD_ACTION });
  return NextResponse.json({
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
    action: WORLD_ACTION,
    rp_id: process.env.WORLD_RP_ID ?? "",
  });
}
