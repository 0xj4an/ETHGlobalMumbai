import { afterEach, describe, expect, it } from "vitest";
import { DECAY_DAYS } from "@/lib/runs/hexStrength";
import { BLOCK_SECONDS, MAX_LIFETIME_BLOCKS, decaySecondsPerLevel, planDefense } from "./expiry";

const NOW = new Date("2026-11-06T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

afterEach(() => {
  delete process.env.DEMO_TIME_SCALE;
});

describe("planDefense", () => {
  it("level 1 needs no entity", () => {
    expect(planDefense({ baseStrength: 1, damage: 0, reinforcedAt: NOW }, NOW)).toEqual({ kind: "none", level: 1 });
  });

  it("damage down to 1 needs no entity", () => {
    expect(planDefense({ baseStrength: 3, damage: 2, reinforcedAt: NOW }, NOW).kind).toBe("none");
  });

  it("level 2 just reinforced lives one decay period", () => {
    const p = planDefense({ baseStrength: 2, damage: 0, reinforcedAt: NOW }, NOW);
    expect(p.kind).toBe("entity");
    if (p.kind !== "entity") return;
    expect(p.level).toBe(2);
    expect(p.lifetimeBlocks).toBe((DECAY_DAYS * 86_400) / BLOCK_SECONDS);
    expect(p.needsExtend).toBe(false);
  });

  it("an attack shortens the lifetime", () => {
    const a = planDefense({ baseStrength: 5, damage: 0, reinforcedAt: NOW }, NOW);
    const b = planDefense({ baseStrength: 5, damage: 1, reinforcedAt: NOW }, NOW);
    if (a.kind !== "entity" || b.kind !== "entity") throw new Error("expected entities");
    expect(b.lifetimeBlocks).toBeLessThan(a.lifetimeBlocks);
  });

  it("time already spent counts", () => {
    const p = planDefense({ baseStrength: 3, damage: 0, reinforcedAt: daysAgo(40) }, NOW);
    if (p.kind !== "entity") throw new Error("expected entity");
    expect(p.level).toBe(2);
    expect(p.fallsToOneAt.getTime()).toBe(daysAgo(40).getTime() + 60 * 86_400_000);
  });

  it("levels 8-10 are capped at the chain maximum and flagged for extension", () => {
    const p = planDefense({ baseStrength: 10, damage: 0, reinforcedAt: NOW }, NOW);
    if (p.kind !== "entity") throw new Error("expected entity");
    expect(p.lifetimeBlocks).toBe(MAX_LIFETIME_BLOCKS);
    expect(p.needsExtend).toBe(true);
  });

  it("the demo scale makes everything N times faster", () => {
    process.env.DEMO_TIME_SCALE = "720";
    const p = planDefense({ baseStrength: 2, damage: 0, reinforcedAt: NOW }, NOW);
    if (p.kind !== "entity") throw new Error("expected entity");
    expect(p.lifetimeBlocks).toBe((DECAY_DAYS * 86_400) / 720 / BLOCK_SECONDS);
    expect(decaySecondsPerLevel()).toBe(3600);
  });
});
