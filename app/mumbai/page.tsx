"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/useWallet";
import { WorldVerify } from "./WorldVerify";

type ZoneRow = {
  label: string;
  cell: string;
  ensName: string;
  arkiv: { count: number; top: Array<{ h3: string; level: number; player: string; entityKey: string }> } | null;
  ens: { leader: string | null; score: number | null } | null;
  lastTx: string | null;
};

type Demo = {
  timeScale: number;
  arkiv: { game: string; writer: string | null; explorer: string } | null;
  world: { appId: string; rpId: string; action: string; environment: "production" | "staging" } | null;
  ens: { parent: string } | null;
  zones: ZoneRow[];
};

/**
 * ETHGlobal Mumbai demo hub: the three integrations on one screen.
 * Arkiv holds each block's defense, World ID gates attacks, ENSv2 names the
 * leader of each zone. Everything here is read back from the chains.
 */
export default function MumbaiPage() {
  const { address } = useWallet();
  const [demo, setDemo] = useState<Demo | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/mumbai")
        .then((r) => r.json())
        .then((d) => alive && setDemo(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-8 pb-24">
      <header className="flex items-center justify-between">
        <Link href="/" className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          Back
        </Link>
        <h1 className="text-xl font-bold">MiniKlaim x ETHGlobal Mumbai</h1>
        <span className="w-12" />
      </header>

      <p className="text-sm text-zinc-700">
        Every block you defend lives on Arkiv until it would decay. Attacking needs World ID. The
        player with the most defended levels in a zone holds its name on ENS.
        {demo && demo.timeScale > 1 && (
          <span className="mt-1 block text-xs text-zinc-500">
            Demo clock: {demo.timeScale}x faster (one game day = {Math.round(1440 / demo.timeScale)} min).
          </span>
        )}
      </p>

      <section id="world" className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-base font-semibold">World ID: one human, one army</h2>
        {demo?.world ? (
          <WorldVerify address={address} config={demo.world} />
        ) : (
          <p className="text-sm text-zinc-500">Off on this server.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-base font-semibold">Zones</h2>
        {!demo && <p className="text-sm text-zinc-500">Loading...</p>}
        {demo?.zones.length === 0 && <p className="text-sm text-zinc-500">No zones configured.</p>}
        {demo?.zones.map((z) => (
          <div key={z.cell} className="flex flex-col gap-2 rounded-md bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{z.ensName}</span>
              <a
                href={`https://app.ens.domains/${z.ensName}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-600 underline"
              >
                ENS
              </a>
            </div>
            <div className="text-sm">
              Leader on ENS:{" "}
              {z.ens?.leader ? (
                <span className="font-mono break-all">
                  {z.ens.leader} ({z.ens.score ?? "?"} levels)
                </span>
              ) : (
                <span className="text-zinc-500">not written yet</span>
              )}
              {z.lastTx && (
                <a
                  href={`https://etherscan.io/tx/${z.lastTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-xs underline"
                >
                  tx
                </a>
              )}
            </div>
            <div className="text-sm">
              Defended blocks on Arkiv: {z.arkiv ? z.arkiv.count : <span className="text-zinc-500">unavailable</span>}
            </div>
            {z.arkiv && z.arkiv.top.length > 0 && demo?.arkiv && (
              <ul className="flex flex-col gap-1 text-xs">
                {z.arkiv.top.map((h) => (
                  <li key={h.h3} className="flex justify-between gap-2 font-mono">
                    <span>
                      {h.h3} level {h.level}
                    </span>
                    <a
                      href={`${demo.arkiv!.explorer}/entity/${h.entityKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      entity
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <a href={`/api/arkiv/zone?zone=${z.cell}`} className="text-xs text-zinc-600 underline">
              Raw Arkiv read for this zone
            </a>
          </div>
        ))}
      </section>

      {demo?.arkiv && (
        <p className="text-xs break-all text-zinc-500">
          Arkiv writer (owns every entity): {demo.arkiv.writer}. Game tag: {demo.arkiv.game}.
        </p>
      )}
    </main>
  );
}
