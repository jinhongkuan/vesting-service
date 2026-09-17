import { Router } from "express";
import { z } from "zod";
import { CannotRelease } from "../domain/vestingMath.js";
import type { VestingService } from "../service/vestingService.js";
import { releasableView, releaseResultView, scheduleView } from "./views.js";

const createSchema = z
  .object({
    id: z.string().min(1),
    beneficiary: z.string().min(1),
    totalAmount: z.coerce.bigint(),
    startTimestamp: z.number().int(),
    durationSeconds: z.number().int().positive(),
    tokenSymbol: z.string().min(1),
    tokenDecimals: z.number().int().min(0),
  })
  .strict();

const releaseSchema = z
  .object({
    amount: z.coerce.bigint().optional(),
  })
  .strict();

export function createVestingRouter(service: VestingService) {
  const vestingRouter = Router();

  vestingRouter.post("/schedules", (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_payload", details: parsed.error.issues });
    }
    const { schedule, releases } = service.create(parsed.data);
    return res.status(201).json(scheduleView(schedule, releases));
  });

  vestingRouter.get("/schedules/:beneficiary", (req, res) => {
    const rows = service.listByBeneficiary(req.params.beneficiary).map(({ schedule, releases }) =>
      scheduleView(schedule, releases),
    );
    return res.json(rows);
  });

  vestingRouter.get("/schedule/:id", (req, res) => {
    const loaded = service.get(req.params.id);
    if (!loaded) return res.status(404).json({ error: "not_found" });
    return res.json(scheduleView(loaded.schedule, loaded.releases));
  });

  vestingRouter.get("/schedule/:id/releasable", (req, res) => {
    const at = req.query.at === undefined ? undefined : Number(req.query.at);
    if (at !== undefined && !Number.isFinite(at)) {
      return res.status(400).json({ error: "invalid_payload" });
    }
    const loaded = service.snapshot(req.params.id, at);
    if (!loaded) return res.status(404).json({ error: "not_found" });
    return res.json(releasableView(loaded.schedule, loaded.releases, loaded.at));
  });

  vestingRouter.post("/schedule/:id/release", (req, res) => {
    const parsed = releaseSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_payload", details: parsed.error.issues });
    }

    try {
      const result = service.release(req.params.id, parsed.data.amount);
      if (!result) return res.status(404).json({ error: "not_found" });
      return res.json(releaseResultView(result.fact, result.releases));
    } catch (err) {
      if (err instanceof CannotRelease) {
        return res.status(409).json({ error: "cannot_release" });
      }
      throw err;
    }
  });

  return vestingRouter;
}
