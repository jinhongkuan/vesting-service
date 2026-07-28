export type VestingSchedule = {
  id: string;
  beneficiary: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  startTimestamp: number;
  durationSeconds: number;
  tokenSymbol: string;
  tokenDecimals: number;
};
