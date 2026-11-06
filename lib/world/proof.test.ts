import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { describe, expect, it } from "vitest";
import { checkProofPayload } from "./proof";

const address = "0x1111111111111111111111111111111111111111";
const expected = { environment: "staging", action: "miniklaim-attack-2026", address };
const good = {
  environment: "staging",
  action: "miniklaim-attack-2026",
  responses: [{ identifier: "proof_of_human", signal_hash: hashSignal(address), nullifier: "0xABC" }],
};

describe("checkProofPayload", () => {
  it("accepts a proof bound to this player", () => {
    expect(checkProofPayload(good, expected)).toEqual({ ok: true, nullifier: "0xabc", credential: "proof_of_human" });
  });
  it("rejects the wrong environment", () => {
    expect(checkProofPayload({ ...good, environment: "production" }, expected)).toEqual({ ok: false, reason: "environment" });
  });
  it("rejects a proof made for another address", () => {
    const other = { ...good, responses: [{ ...good.responses[0]!, signal_hash: hashSignal("0x2222222222222222222222222222222222222222") }] };
    expect(checkProofPayload(other, expected)).toEqual({ ok: false, reason: "signal" });
  });
  it("rejects a missing nullifier", () => {
    expect(checkProofPayload({ ...good, responses: [{}] }, expected)).toEqual({ ok: false, reason: "no-nullifier" });
  });
});
