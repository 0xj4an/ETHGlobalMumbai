import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { buildSetup } from "../lib/ens/setup";
import { configuredZones } from "../lib/ens/zones";

/**
 * Print the ENS setup (ADR-0002), simulated on mainnet state. Sends nothing:
 * the owner of miniklaim.eth signs these from /mumbai/ens-setup.
 *
 *   ENS_ZONES='[{"label":"bkc","cell":"87..."}]' npm run ens:setup -- \
 *     --owner=0x8f51DC0791CdDDDCE08052FfF939eb7cf0c17856 \
 *     --relayer=0x8da26Ae1B32a7e4Cd158622D7d70Fe16D6F1dE83
 */
async function main() {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
  const owner = arg("owner") as `0x${string}`;
  const relayer = arg("relayer") as `0x${string}`;
  if (!owner || !relayer) throw new Error("--owner and --relayer are required");
  const zones = configuredZones();
  const plan = await buildSetup({ owner, relayer, zones });
  console.log(`registry ${plan.registry}\nresolver ${plan.resolver}\nexpiry   ${plan.expiry}`);
  let gas = 0n;
  for (const t of plan.txs) {
    gas += t.gasUsed;
    console.log(`${t.ok ? "OK    " : "REVERT"} ${String(t.gasUsed).padStart(8)}  ${t.step}`);
  }
  console.log(`total gas ${gas}`);
  console.log(`\nSet ENS_RESOLVER_ADDRESS=${plan.resolver} on the server once these are sent.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
