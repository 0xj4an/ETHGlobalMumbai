import {
  http,
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionResult,
  encodeFunctionData,
  namehash,
} from "viem";
import { mainnet } from "viem/chains";
import { textAbi, universalResolverAbi } from "./abi";
import { LEADER_KEY, SCORE_KEY, UNIVERSAL_RESOLVER, ethRpcUrl } from "./config";
import { dnsEncode } from "./dns";

/** Read one text record through the ENS Universal Resolver (works for v2 names). */
export async function readEnsText(name: string, key: string): Promise<string | null> {
  const client = createPublicClient({ chain: mainnet, transport: http(ethRpcUrl()) });
  try {
    const data = encodeFunctionData({ abi: textAbi, functionName: "text", args: [namehash(name), key] });
    const call = encodeFunctionData({
      abi: universalResolverAbi,
      functionName: "resolve",
      args: [dnsEncode(name), data],
    });
    const res = await client.call({ to: UNIVERSAL_RESOLVER, data: call });
    if (!res.data) return null;
    const [out] = decodeFunctionResult({
      abi: universalResolverAbi,
      functionName: "resolve",
      data: res.data,
    });
    const [value] = decodeAbiParameters([{ type: "string" }], out);
    return value || null;
  } catch {
    return null;
  }
}

export async function readZoneTitle(
  name: string,
): Promise<{ name: string; leader: string | null; score: number | null }> {
  const [leader, score] = await Promise.all([readEnsText(name, LEADER_KEY), readEnsText(name, SCORE_KEY)]);
  return { name, leader, score: score === null ? null : Number(score) };
}
