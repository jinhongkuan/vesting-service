export type Clock = {
  now(): number;
};

export const systemClock: Clock = {
  now: () => Math.floor(Date.now() / 1000),
};
