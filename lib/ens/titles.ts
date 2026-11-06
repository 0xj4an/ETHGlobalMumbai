import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { http, createPublicClient, createWalletClient, encodeFunctionData, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { ensTitles } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { getSignerKey } from "@/lib/onchain/signer";
import { resolverAbi } from "./abi";
import { LEADER_KEY, SCORE_KEY, ensMinIntervalSeconds, ensResolverAddress, ethRpcUrl } from "./config";
import { dnsEncode } from "./dns";
import { pickLeader, zoneStandings } from "./leader";
import { configuredZones } from "./zones";

const log = createLogger("ens:titles");

type Db = PgDatabase<PgQueryResultHKT, Record<string, never>>;

/** Should this zone pay for a write now? Pure, for tests. */
export function shouldWrite(
  current: { leader: string | null; writtenAt: Date | null } | undefined,
  leader: string,
  now: Date,
  minIntervalSeconds: number,
): boolean {
  if (!current || current.leader?.toLowerCase() !== leader.toLowerCase()) {
    if (!current?.writtenAt) return true;
    return now.getTime() - current.writtenAt.getTime() >= minIntervalSeconds * 1000;
  }
  return false;
}

/**
 * For every configured zone: compute the leader (sum of levels) and, when it
 * changed and the zone is past its debounce window, set the two text records
 * on `<zone>.miniklaim.eth` from the relayer. Only leader changes cost gas.
 */
export async function ensTitlesPass(db: Db): Promise<void> {
  const resolver = ensResolverAddress();
  const zones = configuredZones();
  if (!resolver || zones.length === 0) return;
  const transport = http(ethRpcUrl());
  const account = privateKeyToAccount(getSignerKey() as Hex);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const wallet = createWalletClient({ chain: mainnet, transport, account });
  const now = new Date();

  for (const zone of zones) {
    const standings = await zoneStandings(db, zone.cell);
    const top = pickLeader(standings);
    if (!top) continue;
    const [current] = await db.select().from(ensTitles).where(eq(ensTitles.zone, zone.cell));
    if (!shouldWrite(current, top.owner, now, ensMinIntervalSeconds())) {
      if (current && current.score !== top.score) {
        await db.update(ensTitles).set({ score: top.score }).where(eq(ensTitles.zone, zone.cell));
      }
      continue;
    }
    const name = dnsEncode(zone.name);
    const leaderTx = await wallet.sendTransaction({
      account,
      chain: mainnet,
      kzg: undefined,
      to: resolver,
      data: encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: [name, LEADER_KEY, top.owner] }),
    });
    await publicClient.waitForTransactionReceipt({ hash: leaderTx });
    const scoreTx = await wallet.sendTransaction({
      account,
      chain: mainnet,
      kzg: undefined,
      to: resolver,
      data: encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: [name, SCORE_KEY, String(top.score)] }),
    });
    await publicClient.waitForTransactionReceipt({ hash: scoreTx });
    await db
      .insert(ensTitles)
      .values({
        zone: zone.cell,
        label: zone.label,
        leader: top.owner,
        score: top.score,
        txHash: leaderTx,
        writtenAt: now,
      })
      .onConflictDoUpdate({
        target: ensTitles.zone,
        set: { leader: top.owner, score: top.score, txHash: leaderTx, writtenAt: now },
      });
    log.info("zone title written", {
      zone: zone.name,
      leader: top.owner,
      score: top.score,
      leaderTx,
      scoreTx,
    });
  }
}
