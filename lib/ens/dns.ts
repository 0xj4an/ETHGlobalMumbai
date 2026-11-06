import { type Hex, toHex } from "viem";
import { packetToBytes } from "viem/ens";

/** DNS wire-format name, as ENSv2 resolvers and the Universal Resolver take it. */
export function dnsEncode(name: string): Hex {
  return toHex(packetToBytes(name));
}
