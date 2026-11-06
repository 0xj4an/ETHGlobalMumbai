import type { Address } from "viem";

/**
 * ENSv2 zone titles (ETHGlobal Mumbai, ADR-0002). Off unless ENS_TITLES=on.
 * `miniklaim.eth` stays with its owner; the game relayer only holds the
 * per-key setter roles for the `miniklaim.*` text records below.
 */
export function isEnsTitlesEnabled(): boolean {
  return process.env.ENS_TITLES === "on";
}

export const ENS_PARENT = "miniklaim.eth";
export const LEADER_KEY = "miniklaim.leader";
export const SCORE_KEY = "miniklaim.score";

/** ENSv2 on Ethereum mainnet (docs.ens.domains/learn/deployments). */
export const ETH_REGISTRY: Address = "0xf60aba43e1f7f3dab1186ff03b561401c9df85e2";
export const VERIFIABLE_FACTORY: Address = "0x77510ba162dfea3d8989e3f0928a691b345730d2";
export const USER_REGISTRY_IMPL: Address = "0xfaa23592aca10a6d8875b18ea86954e8eb6d8d72";
export const PERMISSIONED_RESOLVER_IMPL: Address = "0x565b0f456a04ac9b48758190e90030623cff57c5";
export const UNIVERSAL_RESOLVER: Address = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";

/** The Permissioned Resolver deployed by scripts/ens-setup.ts. */
export function ensResolverAddress(): Address | null {
  const v = process.env.ENS_RESOLVER_ADDRESS;
  return v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : null;
}

export function ethRpcUrl(): string {
  return process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";
}

/** Seconds a zone waits between two paid writes, so a fight does not burn gas. */
export function ensMinIntervalSeconds(): number {
  const n = Number(process.env.ENS_MIN_INTERVAL ?? "300");
  return Number.isFinite(n) && n >= 0 ? n : 300;
}
