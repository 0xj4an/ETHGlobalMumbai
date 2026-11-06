"use client";

import { IDKitRequestWidget, proofOfHuman, type IDKitResult, type RpContext } from "@worldcoin/idkit";
import { useCallback, useEffect, useState } from "react";

type WorldConfig = { appId: string; rpId: string; action: string; environment: "production" | "staging" };

type Status = "unknown" | "verified" | "unverified";

/**
 * "Verify to attack" (ADR-0003). The proof's signal is the player's address,
 * so it only counts for this player; the backend checks it, verifies it with
 * the World Developer Portal and stores the nullifier.
 */
export function WorldVerify({ address, config }: { address: `0x${string}` | null; config: WorldConfig }) {
  const [status, setStatus] = useState<Status>("unknown");
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    const r = await fetch(`/api/world/status?address=${address}`).then((x) => x.json()).catch(() => null);
    setStatus(r?.verified ? "verified" : "unverified");
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const start = async () => {
    setMessage(null);
    const sig = await fetch("/api/world/rp-signature", { method: "POST" }).then((r) => r.json());
    setRpContext({
      rp_id: config.rpId,
      nonce: sig.nonce,
      created_at: sig.created_at,
      expires_at: sig.expires_at,
      signature: sig.sig,
    });
    setOpen(true);
  };

  if (!address) {
    return <p className="text-sm text-zinc-600">Connect your wallet to verify.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "verified" ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-900">
          Verified with World ID. Your attacks count.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-700">
            Capturing free blocks and defending your own is open to everyone. Attacking another
            player&apos;s block needs proof that you are one unique human, so one person cannot win
            a neighbourhood with many accounts.
          </p>
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Verify with World ID
          </button>
        </>
      )}
      {message && <p className="text-sm text-red-700">{message}</p>}
      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={config.appId as `app_${string}`}
          action={config.action}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          environment={config.environment}
          preset={proofOfHuman({ signal: address.toLowerCase() })}
          handleVerify={async (result: IDKitResult) => {
            const res = await fetch("/api/world/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ address, idkitResponse: result }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              const text =
                body?.reason === "nullifier-taken"
                  ? "This World ID already backs another player."
                  : "Verification failed. Try again.";
              setMessage(text);
              throw new Error(text);
            }
          }}
          onSuccess={() => {
            setStatus("verified");
            setMessage(null);
          }}
          onError={() => setMessage((m) => m ?? "Verification cancelled.")}
        />
      )}
    </div>
  );
}
