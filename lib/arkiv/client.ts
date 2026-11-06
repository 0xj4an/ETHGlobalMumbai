import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getSignerKey } from "@/lib/onchain/signer";
import { arkivAccessKey } from "./config";

/** Public client: reads only, safe anywhere on the server. */
export function arkivPublicClient() {
  return createPublicClient({ chain: rabdi({ accessKey: arkivAccessKey() }), transport: http() });
}

/** The game relayer signs every Arkiv write (it owns every entity). */
export function arkivWalletClient() {
  const account = privateKeyToAccount(getSignerKey() as Hex);
  return createWalletClient({
    chain: rabdi({ accessKey: arkivAccessKey() }),
    transport: http(),
    account,
  });
}

export function arkivWriterAddress(): `0x${string}` {
  return privateKeyToAccount(getSignerKey() as Hex).address;
}

export const ARKIV_EXPLORER = "https://rabdi.explorer.arkiv.network";
