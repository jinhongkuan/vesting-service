import { Router } from "express";
import { z } from "zod";
import { getById, listByBeneficiary, upsert } from "../repository/scheduleRepo.js";
import { releasableAmount, vestedAmount } from "../domain/vestingMath.js";

export const vestingRouter = Router();

const createSchema = z.object({
  id: z.string().min(1),
  beneficiary: z.string().min(1),
  totalAmount: z.coerce.bigint(),
  releasedAmount: z.coerce.bigint().default(0n),
  startTimestamp: z.number().int(),
  durationSeconds: z.number().int().positive(),
  tokenSymbol: z.string().min(1),
  tokenDecimals: z.number().int().min(0),
});

vestingRouter.post("/schedules", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.issues });
  }
  upsert(parsed.data);
  return res.status(201).json(parsed.data);
});

vestingRouter.get("/schedules/:beneficiary", (req, res) => {
  return res.json(listByBeneficiary(req.params.beneficiary));
});

vestingRouter.get("/schedule/:id", (req, res) => {
  const schedule = getById(req.params.id);
  if (!schedule) return res.status(404).json({ error: "not_found" });
  return res.json(schedule);
});

vestingRouter.get("/schedule/:id/releasable", (req, res) => {
  const schedule = getById(req.params.id);
  if (!schedule) return res.status(404).json({ error: "not_found" });

  const at = Number(req.query.at ?? Math.floor(Date.now() / 1000));
  return res.json({
    scheduleId: schedule.id,
    at,
    vested: vestedAmount(schedule, at).toString(),
    releasable: releasableAmount(schedule, at).toString(),
  });
});

vestingRouter.post("/schedule/:id/release", (req, res) => {
  const schedule = getById(req.params.id);
  if (!schedule) return res.status(404).json({ error: "not_found" });

  const at = Number(req.body?.at ?? Math.floor(Date.now() / 1000));
  const amount = releasableAmount(schedule, at);
  if (amount <= 0n) {
    return res.status(400).json({ error: "nothing_releasable" });
  }

  const next = { ...schedule, releasedAmount: schedule.releasedAmount + amount };
  upsert(next);
  return res.json({ scheduleId: next.id, released: amount.toString(), totalReleased: next.releasedAmount.toString() });
});
