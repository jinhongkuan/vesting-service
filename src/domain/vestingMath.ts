import type { VestingSchedule } from "./types.js";

/**
 * TODO(candidate): implement linear vesting math.
 */
export function vestedAmount(schedule: VestingSchedule, at: number): bigint {
  void schedule;
  void at;
  throw new Error("TODO: implement vestedAmount");
}

export function releasableAmount(schedule: VestingSchedule, at: number): bigint {
  void schedule;
  void at;
  throw new Error("TODO: implement releasableAmount");
}
