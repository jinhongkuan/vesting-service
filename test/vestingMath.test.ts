import { describe, expect, it } from "vitest";
import type { Release, VestingSchedule } from "../src/domain/types.js";
import {
  CannotRelease,
  releasableAmount,
  release,
  vestedAmount,
} from "../src/domain/vestingMath.js";

const sample: VestingSchedule = {
  id: "x",
  beneficiary: "0xabc",
  totalAmount: 1000n,
  startTimestamp: 100,
  durationSeconds: 100,
  tokenSymbol: "DEMO",
  tokenDecimals: 18,
};

describe("vestedAmount", () => {
  it("at start, vested is 0", () => {
    expect(vestedAmount(sample, 100)).toBe(0n);
  });

  it("before start, vested is 0", () => {
    expect(vestedAmount(sample, 99)).toBe(0n);
  });

  it("at end, vested is total", () => {
    expect(vestedAmount(sample, 200)).toBe(1000n);
  });

  it("after end, vested stays total", () => {
    expect(vestedAmount(sample, 201)).toBe(1000n);
  });

  it("at midpoint, vested is 500 (floor of 1000 * 50 / 100)", () => {
    expect(vestedAmount(sample, 150)).toBe(500n);
  });

  it("1s after start, vested is 10 (floor of 1000 * 1 / 100)", () => {
    expect(vestedAmount(sample, 101)).toBe(10n);
  });

  it("end cap includes leftover from floor (1000 over 3s is 333, 666, then 1000)", () => {
    const uneven: VestingSchedule = { ...sample, startTimestamp: 0, durationSeconds: 3 };
    expect(vestedAmount(uneven, 1)).toBe(333n);
    expect(vestedAmount(uneven, 2)).toBe(666n);
    expect(vestedAmount(uneven, 3)).toBe(1000n);
  });

  it("1s before end, vested is 990 not total (floor of 1000 * 99 / 100)", () => {
    expect(vestedAmount(sample, 199)).toBe(990n);
  });

  it("1 token over 100s, 1s in, vested is 0 (floor of 1 * 1 / 100)", () => {
    const tiny: VestingSchedule = { ...sample, totalAmount: 1n };
    expect(vestedAmount(tiny, 101)).toBe(0n);
    expect(vestedAmount(tiny, 200)).toBe(1n);
  });
});

describe("releasableAmount", () => {
  it("empty log at midpoint, releasable is vested (500)", () => {
    expect(releasableAmount(sample, [], 150)).toBe(500n);
  });

  it("subtracts the log: 100 already Released, midpoint releasable is 400", () => {
    const log: Release[] = [{ scheduleId: sample.id, amount: 100n, timestamp: 140 }];
    expect(releasableAmount(sample, log, 150)).toBe(400n);
  });

  it("empty log before start, releasable is 0", () => {
    expect(releasableAmount(sample, [], 99)).toBe(0n);
  });

  it("empty log after end, releasable is total", () => {
    expect(releasableAmount(sample, [], 201)).toBe(1000n);
  });

  it("two Releases 100 then 150, midpoint releasable is 250", () => {
    const log: Release[] = [
      { scheduleId: sample.id, amount: 100n, timestamp: 140 },
      { scheduleId: sample.id, amount: 150n, timestamp: 145 },
    ];
    expect(releasableAmount(sample, log, 150)).toBe(250n);
  });

  it("Released 100 at midpoint; at end releasable is 900 (vested grew)", () => {
    const log: Release[] = [{ scheduleId: sample.id, amount: 100n, timestamp: 150 }];
    expect(releasableAmount(sample, log, 200)).toBe(900n);
  });

  it("query at start still subtracts later Releases (released is the whole log)", () => {
    const log: Release[] = [{ scheduleId: sample.id, amount: 100n, timestamp: 150 }];
    expect(releasableAmount(sample, log, 100)).toBe(-100n);
  });
});

describe("release", () => {
  it("partial Release returns a Release fact", () => {
    expect(release(sample, [], 100n, 150)).toEqual({
      scheduleId: sample.id,
      amount: 100n,
      timestamp: 150,
    });
  });

  it("exact remainder is allowed", () => {
    expect(release(sample, [], 500n, 150).amount).toBe(500n);
  });

  it("amount > releasable is cannot_release and yields no fact", () => {
    expect(() => release(sample, [], 501n, 150)).toThrow(CannotRelease);
    try {
      release(sample, [], 501n, 150);
    } catch (err) {
      expect(err).toMatchObject({ error: "cannot_release", amount: 501n, releasable: 500n });
    }
  });

  it("amount <= 0 is cannot_release", () => {
    expect(() => release(sample, [], 0n, 150)).toThrow(CannotRelease);
    expect(() => release(sample, [], -1n, 150)).toThrow(CannotRelease);
  });

  it("before start, a positive amount is cannot_release (vested is 0)", () => {
    expect(() => release(sample, [], 1n, 99)).toThrow(CannotRelease);
  });

  it("second Release that exceeds remainder is cannot_release; first Release still stands", () => {
    const first = release(sample, [], 400n, 150);
    const log = [first];
    expect(() => release(sample, log, 200n, 150)).toThrow(CannotRelease);
    expect(releasableAmount(sample, log, 150)).toBe(100n);
  });

  it("exact remainder then releasable is 0", () => {
    const first = release(sample, [], 500n, 150);
    expect(releasableAmount(sample, [first], 150)).toBe(0n);
    expect(() => release(sample, [first], 1n, 150)).toThrow(CannotRelease);
  });
});


