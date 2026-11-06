import {
  http,
  type Address,
  type Hex,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  stringToHex,
  toHex,
} from "viem";
import { mainnet } from "viem/chains";
import {
  ethRegistryAbi,
  factoryAbi,
  registryInitAbi,
  resolverAbi,
  resolverInitAbi,
  userRegistryAbi,
} from "./abi";
import {
  ENS_PARENT,
  ETH_REGISTRY,
  LEADER_KEY,
  PERMISSIONED_RESOLVER_IMPL,
  SCORE_KEY,
  USER_REGISTRY_IMPL,
  VERIFIABLE_FACTORY,
  ethRpcUrl,
} from "./config";
import type { Zone } from "./zones";

/** Every role and its admin, as in the ENS docs' Verifiable Factory example. */
const ALL_ROLES = 0x1111111111111111111111111111111111111111111111111111111111111111n;
/** Roles the owner keeps on each zone subname (same bitmap as the simulation). */
const SUBNAME_ROLES = 0x1111111n;

export type SetupTx = { step: string; to: Address; data: Hex };
export type SimulatedTx = SetupTx & { ok: boolean; gasUsed: bigint; returnData: Hex };

const stateAbi = parseAbi([
  "function getState(uint256 anyId) view returns ((uint8 status, uint64 expiry, address latestOwner, uint256 tokenId, uint256 resource))",
]);

function client() {
  return createPublicClient({ chain: mainnet, transport: http(ethRpcUrl()) });
}

/** `miniklaim.eth` on the v2 ETHRegistry: status, expiry, owner. */
export async function parentState() {
  const label = ENS_PARENT.split(".")[0]!;
  const tokenId = BigInt(keccak256(toHex(label)));
  const data = encodeFunctionData({ abi: stateAbi, functionName: "getState", args: [tokenId] });
  const res = await client().call({ to: ETH_REGISTRY, data });
  const { decodeFunctionResult } = await import("viem");
  const state = decodeFunctionResult({ abi: stateAbi, functionName: "getState", data: res.data! });
  return { tokenId, ...state };
}

type Simulated = { status: Hex; gasUsed: Hex; returnData: Hex };

async function simulate(from: Address, txs: Array<{ to: Address; data: Hex; from?: Address }>) {
  const res = (await client().request({
    method: "eth_simulateV1" as never,
    params: [
      {
        blockStateCalls: [
          {
            stateOverrides: { [from]: { balance: "0xDE0B6B3A7640000" } },
            calls: txs.map((t) => ({ from: t.from ?? from, to: t.to, data: t.data })),
          },
        ],
        validation: false,
      },
      "latest",
    ] as never,
  })) as Array<{ calls: Simulated[] }>;
  return res[0]!.calls;
}

/**
 * The full setup (ADR-0002), simulated on mainnet state, in the order the
 * owner signs it. The proxy addresses come out of the simulation: the factory
 * deploys deterministically from (sender, salt), so the real deploy lands on
 * the same addresses. Every later step depends on that, which is why the
 * page re-checks each one before asking for a signature.
 */
export async function buildSetup(params: {
  owner: Address;
  relayer: Address;
  zones: Zone[];
}): Promise<{ txs: SimulatedTx[]; registry: Address | null; resolver: Address | null; expiry: bigint }> {
  const { owner, relayer, zones } = params;
  const parent = await parentState();
  const registrySalt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }],
        [keccak256(stringToHex("UserRegistry")), namehash(ENS_PARENT), 0n],
      ),
    ),
  );
  const resolverSalt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
        [keccak256(stringToHex("OwnedResolver")), owner, 1n],
      ),
    ),
  );
  const deploys: SetupTx[] = [
    {
      step: "Deploy the zone registry (UserRegistry proxy)",
      to: VERIFIABLE_FACTORY,
      data: encodeFunctionData({
        abi: factoryAbi,
        functionName: "deployProxy",
        args: [
          USER_REGISTRY_IMPL,
          registrySalt,
          encodeFunctionData({
            abi: registryInitAbi,
            functionName: "initialize",
            args: [[{ account: owner, roleBitmap: ALL_ROLES }]],
          }),
        ],
      }),
    },
    {
      step: "Deploy the zone resolver (PermissionedResolver proxy)",
      to: VERIFIABLE_FACTORY,
      data: encodeFunctionData({
        abi: factoryAbi,
        functionName: "deployProxy",
        args: [
          PERMISSIONED_RESOLVER_IMPL,
          resolverSalt,
          encodeFunctionData({
            abi: resolverInitAbi,
            functionName: "initialize",
            args: [[{ account: owner, roleBitmap: ALL_ROLES }], []],
          }),
        ],
      }),
    },
  ];
  const first = await simulate(owner, deploys);
  const addr = (r: Simulated | undefined) =>
    r && r.status === "0x1" ? (`0x${r.returnData.slice(-40)}` as Address) : null;
  const registry = addr(first[0]);
  const resolver = addr(first[1]);
  if (!registry || !resolver) {
    return {
      txs: deploys.map((d, i) => ({
        ...d,
        ok: first[i]?.status === "0x1",
        gasUsed: BigInt(first[i]?.gasUsed ?? "0x0"),
        returnData: first[i]?.returnData ?? "0x",
      })),
      registry,
      resolver,
      expiry: parent.expiry,
    };
  }

  const rest: SetupTx[] = [
    {
      step: `Point ${ENS_PARENT} at the zone registry`,
      to: ETH_REGISTRY,
      data: encodeFunctionData({
        abi: ethRegistryAbi,
        functionName: "setSubregistry",
        args: [parent.tokenId, registry],
      }),
    },
    ...zones.map((z) => ({
      step: `Register ${z.name}`,
      to: registry,
      data: encodeFunctionData({
        abi: userRegistryAbi,
        functionName: "register",
        args: [z.label, owner, "0x0000000000000000000000000000000000000000", resolver, SUBNAME_ROLES, parent.expiry],
      }),
    })),
    ...[LEADER_KEY, SCORE_KEY].map((k) => ({
      step: `Let the game relayer write only "${k}"`,
      to: resolver,
      data: encodeFunctionData({
        abi: resolverAbi,
        functionName: "grantSetterRoles",
        args: [encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: ["0x", k, ""] }), relayer],
      }),
    })),
  ];
  const all = [...deploys, ...rest];
  const sim = await simulate(owner, all);
  return {
    txs: all.map((t, i) => ({
      ...t,
      ok: sim[i]?.status === "0x1",
      gasUsed: BigInt(sim[i]?.gasUsed ?? "0x0"),
      returnData: sim[i]?.returnData ?? "0x",
    })),
    registry,
    resolver,
    expiry: parent.expiry,
  };
}
