import { describe, expect, it } from "vitest";
import { levelFromEntity } from "./read";

const DAY = 30 * 86_400;
describe("levelFromEntity", () => {
  it("matches the game rule", () => {
    const at = 1_000_000n;
    expect(levelFromEntity({ base: 5, damage: 0, reinforcedAt: at, decaySeconds: DAY }, 1_000_000)).toBe(5);
    expect(levelFromEntity({ base: 5, damage: 1, reinforcedAt: at, decaySeconds: DAY }, 1_000_000 + 2 * DAY)).toBe(2);
    expect(levelFromEntity({ base: 5, damage: 0, reinforcedAt: at, decaySeconds: DAY }, 1_000_000 + 99 * DAY)).toBe(1);
  });
});
