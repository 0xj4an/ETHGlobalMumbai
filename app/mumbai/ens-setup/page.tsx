"use client";

import { useState } from "react";
import { createWalletClient, custom, type Address, type Hex } from "viem";
import { mainnet } from "viem/chains";

type Tx = { step: string; to: Address; data: Hex; ok: boolean; gasUsed: string };
type Plan = { registry: Address | null; resolver: Address | null; txs: Tx[] };

const OWNER: Address = "0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856";
const RELAYER: Address = "0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83";

/**
 * One-time ENSv2 setup for miniklaim.eth (ADR-0002), signed by its owner in
 * their own wallet. Each transaction was simulated on mainnet state by the
 * server; this page only asks the wallet to send them, in order.
 */
export default function EnsSetupPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hashes, setHashes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    const r = await fetch(`/api/mumbai/ens-setup?owner=${OWNER}&relayer=${RELAYER}`);
    const body = await r.json();
    if (!r.ok) return setError(body.error ?? "could not build the plan");
    setPlan(body);
  };

  const send = async (i: number) => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("No browser wallet found.");
      const wallet = createWalletClient({ chain: mainnet, transport: custom(eth) });
      const [account] = await wallet.requestAddresses();
      if (account?.toLowerCase() !== OWNER.toLowerCase()) {
        throw new Error(`Connect ${OWNER}, the owner of miniklaim.eth.`);
      }
      if ((await wallet.getChainId()) !== mainnet.id) await wallet.switchChain({ id: mainnet.id });
      const tx = plan.txs[i]!;
      const hash = await wallet.sendTransaction({ account, to: tx.to, data: tx.data, chain: mainnet, kzg: undefined });
      setHashes((h) => ({ ...h, [i]: hash }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-bold">miniklaim.eth: ENSv2 zone setup</h1>
      <p className="text-sm text-zinc-700">
        Owner <span className="font-mono break-all">{OWNER}</span> keeps the name. The game relayer{" "}
        <span className="font-mono break-all">{RELAYER}</span> only gets the right to write two text records.
        Send the steps in order and wait for each to confirm before the next.
      </p>
      <button
        type="button"
        onClick={() => void load()}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Build and simulate
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {plan && (
        <>
          <p className="text-xs break-all text-zinc-600">
            Registry {plan.registry} - Resolver {plan.resolver} (set ENS_RESOLVER_ADDRESS to the resolver)
          </p>
          <ol className="flex flex-col gap-2">
            {plan.txs.map((t, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 text-sm">
                <span>
                  {i + 1}. {t.step}
                </span>
                <span className="text-xs text-zinc-500">
                  Simulation: {t.ok ? "OK" : "REVERTS"} - gas {t.gasUsed}
                </span>
                {hashes[i] ? (
                  <a href={`https://etherscan.io/tx/${hashes[i]}`} target="_blank" rel="noreferrer" className="font-mono text-xs break-all underline">
                    {hashes[i]}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !t.ok || (i > 0 && !hashes[i - 1])}
                    onClick={() => void send(i)}
                    className="self-start rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium disabled:opacity-40"
                  >
                    Send
                  </button>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
