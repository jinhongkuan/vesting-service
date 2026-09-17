import { releasableAmount, release as proposeRelease } from "../domain/vestingMath.js";
import type { Release, VestingSchedule } from "../domain/types.js";
import {
  appendRelease,
  getById,
  listByBeneficiary as listSchedulesByBeneficiary,
  listReleases,
  upsert,
} from "../repository/scheduleRepo.js";
import type { Clock } from "./clock.js";

export type ScheduleWithLog = {
  schedule: VestingSchedule;
  releases: Release[];
};

export function createVestingService(clock: Clock) {
  function load(id: string): ScheduleWithLog | undefined {
    const schedule = getById(id);
    if (!schedule) return undefined;
    return { schedule, releases: listReleases(id) };
  }

  return {
    create(schedule: VestingSchedule): ScheduleWithLog {
      upsert(schedule);
      return { schedule, releases: [] };
    },

    listByBeneficiary(beneficiary: string): ScheduleWithLog[] {
      return listSchedulesByBeneficiary(beneficiary).map((schedule) => ({
        schedule,
        releases: listReleases(schedule.id),
      }));
    },

    get(id: string): ScheduleWithLog | undefined {
      return load(id);
    },

    snapshot(id: string, at?: number): (ScheduleWithLog & { at: number }) | undefined {
      const loaded = load(id);
      if (!loaded) return undefined;
      return { ...loaded, at: at ?? clock.now() };
    },

    release(id: string, amount?: bigint): { fact: Release; releases: Release[] } | undefined {
      const loaded = load(id);
      if (!loaded) return undefined;
      const timestamp = clock.now();
      const qty = amount ?? releasableAmount(loaded.schedule, loaded.releases, timestamp);
      const fact = proposeRelease(loaded.schedule, loaded.releases, qty, timestamp);
      appendRelease(fact);
      return { fact, releases: listReleases(id) };
    },
  };
}

export type VestingService = ReturnType<typeof createVestingService>;
