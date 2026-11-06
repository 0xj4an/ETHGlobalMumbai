import { describe, expect, it } from "vitest";
import { pickLeader } from "./leader";
import { shouldWrite } from "./titles";
import { parseZones } from "./zones";

describe("parseZones", () => {
  it("keeps valid res-7 cells with clean labels", () => {
    const z = parseZones('[{"label":"BKC","cell":"87608b0b0ffffff"},{"label":"bad label","cell":"87608b0b0ffffff"},{"label":"x","cell":"nope"}]');
    expect(z).toEqual([{ label: "bkc", cell: "87608b0b0ffffff", name: "bkc.miniklaim.eth" }]);
  });
  it("tolerates junk", () => {
    expect(parseZones(undefined)).toEqual([]);
    expect(parseZones("{")).toEqual([]);
  });
});

describe("pickLeader", () => {
  it("highest score wins, ties by blocks then address", () => {
    expect(pickLeader([{ owner: "0xb", score: 10, blocks: 3 }, { owner: "0xa", score: 12, blocks: 2 }])?.owner).toBe("0xa");
    expect(pickLeader([{ owner: "0xb", score: 10, blocks: 3 }, { owner: "0xa", score: 10, blocks: 2 }])?.owner).toBe("0xb");
    expect(pickLeader([{ owner: "0xb", score: 10, blocks: 3 }, { owner: "0xa", score: 10, blocks: 3 }])?.owner).toBe("0xa");
    expect(pickLeader([])).toBeNull();
  });
});

describe("shouldWrite", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  it("writes the first leader", () => {
    expect(shouldWrite(undefined, "0xa", now, 300)).toBe(true);
  });
  it("does not pay to write the same leader", () => {
    expect(shouldWrite({ leader: "0xA", writtenAt: now }, "0xa", now, 300)).toBe(false);
  });
  it("waits out the debounce window on a change", () => {
    expect(shouldWrite({ leader: "0xa", writtenAt: new Date(now.getTime() - 100_000) }, "0xb", now, 300)).toBe(false);
    expect(shouldWrite({ leader: "0xa", writtenAt: new Date(now.getTime() - 400_000) }, "0xb", now, 300)).toBe(true);
  });
});
