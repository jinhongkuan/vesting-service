import express from "express";
import { createVestingRouter } from "./http/vestingRoutes.js";
import type { Clock } from "./service/clock.js";
import { systemClock } from "./service/clock.js";
import { createVestingService } from "./service/vestingService.js";

export function createApp(deps: { clock?: Clock } = {}) {
  const clock = deps.clock ?? systemClock;
  const service = createVestingService(clock);
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/vesting", createVestingRouter(service));
  return app;
}
