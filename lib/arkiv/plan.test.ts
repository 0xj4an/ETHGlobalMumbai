import { describe, expect, it } from "vitest";
import { planSync } from "./plan";

const KEY = "0x00000000000000000000000000000000000000000000000000000000000000aa" as const;
const entity = (lifetimeBlocks: number) =>
  ({ kind: "entity", level: 3, fallsToOneAt: new Date(), lifetimeBlocks, needsExtend: false }) as const;
const none = { kind: "none", level: 1 } as const;

describe("planSync", () => {
  it("creates when nothing is known", () => {
    expect(planSync(entity(100), null, 1000n)).toEqual({ op: "create", lifetimeBlocks: 100 });
  });
  it("recreates an entity that already expired on Arkiv", () => {
    expect(planSync(entity(100), { entityKey: KEY, expiresAtBlock: 900n }, 1000n).op).toBe("create");
  });
  it("patches and extends when the expiry moves later (reinforce)", () => {
    expect(planSync(entity(500), { entityKey: KEY, expiresAtBlock: 1200n }, 1000n)).toEqual({
      op: "patch-extend",
      entityKey: KEY,
      lifetimeBlocks: 500,
    });
  });
  it("replaces when the expiry must get shorter (attack)", () => {
    expect(planSync(entity(50), { entityKey: KEY, expiresAtBlock: 1200n }, 1000n).op).toBe("replace");
  });
  it("deletes when the block is back at level 1 (capture or full damage)", () => {
    expect(planSync(none, { entityKey: KEY, expiresAtBlock: 1200n }, 1000n)).toEqual({ op: "delete", entityKey: KEY });
  });
  it("does nothing for level 1 with no live entity", () => {
    expect(planSync(none, null, 1000n).op).toBe("noop");
    expect(planSync(none, { entityKey: KEY, expiresAtBlock: 999n }, 1000n).op).toBe("noop");
  });
});
