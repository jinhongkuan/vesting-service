import type { Release, VestingSchedule } from "../domain/types.js";

export const seedSchedules: VestingSchedule[] = [
  {
    id: "1",
    beneficiary: "0x1111111111111111111111111111111111111111",
    totalAmount: 1_000_000n,
    startTimestamp: 1_700_000_000,
    durationSeconds: 1000,
    tokenSymbol: "DEMO",
    tokenDecimals: 18,
  },
  {
    id: "2",
    beneficiary: "0x1111111111111111111111111111111111111111",
    totalAmount: 500_000n,
    startTimestamp: 1_699_999_000,
    durationSeconds: 1000,
    tokenSymbol: "DEMO",
    tokenDecimals: 18,
  },
];

let schedules = seedSchedules.map((x) => ({ ...x }));
let releases: Release[] = [];

export function listByBeneficiary(beneficiary: string): VestingSchedule[] {
  return schedules.filter(
    (s) => s.beneficiary.toLowerCase() === beneficiary.toLowerCase(),
  );
}

export function getById(id: string): VestingSchedule | undefined {
  return schedules.find((s) => s.id === id);
}

export function upsert(schedule: VestingSchedule): void {
  const idx = schedules.findIndex((s) => s.id === schedule.id);
  if (idx >= 0) schedules[idx] = schedule;
  else schedules.push(schedule);
}

export function listReleases(scheduleId: string): Release[] {
  return releases.filter((r) => r.scheduleId === scheduleId);
}

export function appendRelease(release: Release): void {
  releases.push(release);
}

export function resetForTests(): void {
  schedules = seedSchedules.map((x) => ({ ...x }));
  releases = [];
}
