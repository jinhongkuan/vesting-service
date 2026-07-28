import { describe, expect, it } from "vitest";
import type { VestingSchedule } from "../src/domain/types.js";
import { releasableAmount, vestedAmount } from "../src/domain/vestingMath.js";

const sample: VestingSchedule = {
  id: "x",
  beneficiary: "0xabc",
  totalAmount: 1000n,
  releasedAmount: 0n,
  startTimestamp: 100,
  durationSeconds: 100,
  tokenSymbol: "DEMO",
  tokenDecimals: 18,
};

describe("vestingMath", () => {
  it("placeholder: candidate should implement vesting math tests", () => {
    expect(() => vestedAmount(sample, 150)).toThrow(/TODO/i);
    expect(() => releasableAmount(sample, 150)).toThrow(/TODO/i);
  });
});
