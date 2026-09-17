import type { Release, VestingSchedule } from "./types.js";

export class CannotRelease extends Error {
  readonly error = "cannot_release" as const;

  constructor(
    readonly amount: bigint,
    readonly releasable: bigint,
  ) {
    super("cannot_release");
    this.name = "CannotRelease";
  }
}

export function vestedAmount(schedule: VestingSchedule, at: number): bigint {
  const start = schedule.startTimestamp;
  const duration = schedule.durationSeconds;
  const end = start + duration;
  if (at <= start) return 0n;
  if (at >= end) return schedule.totalAmount;
  const elapsed = BigInt(at - start);
  return (schedule.totalAmount * elapsed) / BigInt(duration);
}

export function releasedTotal(releases: Release[]): bigint {
  return releases.reduce((sum, release) => sum + release.amount, 0n);
}

export function releasableAmount(
  schedule: VestingSchedule,
  releases: Release[],
  at: number,
): bigint {
  return vestedAmount(schedule, at) - releasedTotal(releases);
}

export function release(
  schedule: VestingSchedule,
  releases: Release[],
  amount: bigint,
  timestamp: number,
): Release {
  const releasable = releasableAmount(schedule, releases, timestamp);
  if (amount <= 0n || amount > releasable) {
    throw new CannotRelease(amount, releasable);
  }
  return { scheduleId: schedule.id, amount, timestamp };
}
