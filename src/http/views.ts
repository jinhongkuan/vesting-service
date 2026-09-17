import type { Release, VestingSchedule } from "../domain/types.js";
import { releasableAmount, releasedTotal, vestedAmount } from "../domain/vestingMath.js";

function amountJson(n: bigint): string {
  return n.toString();
}

export type ReleaseView = {
  scheduleId: string;
  amount: string;
  timestamp: number;
};

export type VestingScheduleView = {
  id: string;
  beneficiary: string;
  totalAmount: string;
  releasedAmount: string;
  startTimestamp: number;
  durationSeconds: number;
  tokenSymbol: string;
  tokenDecimals: number;
  releases: ReleaseView[];
};

export type ReleasableView = {
  scheduleId: string;
  at: number;
  vested: string;
  releasable: string;
};

export type ReleaseResultView = {
  scheduleId: string;
  released: string;
  totalReleased: string;
};

export function releaseView(release: Release): ReleaseView {
  return {
    scheduleId: release.scheduleId,
    amount: amountJson(release.amount),
    timestamp: release.timestamp,
  };
}

export function scheduleView(schedule: VestingSchedule, releases: Release[]): VestingScheduleView {
  return {
    id: schedule.id,
    beneficiary: schedule.beneficiary,
    totalAmount: amountJson(schedule.totalAmount),
    releasedAmount: amountJson(releasedTotal(releases)),
    startTimestamp: schedule.startTimestamp,
    durationSeconds: schedule.durationSeconds,
    tokenSymbol: schedule.tokenSymbol,
    tokenDecimals: schedule.tokenDecimals,
    releases: releases.map(releaseView),
  };
}

export function releasableView(
  schedule: VestingSchedule,
  releases: Release[],
  at: number,
): ReleasableView {
  return {
    scheduleId: schedule.id,
    at,
    vested: amountJson(vestedAmount(schedule, at)),
    releasable: amountJson(releasableAmount(schedule, releases, at)),
  };
}

export function releaseResultView(fact: Release, log: Release[]): ReleaseResultView {
  return {
    scheduleId: fact.scheduleId,
    released: amountJson(fact.amount),
    totalReleased: amountJson(releasedTotal(log)),
  };
}
