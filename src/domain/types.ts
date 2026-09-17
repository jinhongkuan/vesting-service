/** Stored Schedule. Curve facts only — no released total. */
export type VestingSchedule = {
  id: string;
  beneficiary: string;
  totalAmount: bigint;
  startTimestamp: number;
  durationSeconds: number;
  tokenSymbol: string;
  tokenDecimals: number;
};

export type Release = {
  scheduleId: string;
  amount: bigint;
  asOf: number;
};
