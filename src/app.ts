import express from "express";
import { vestingRouter } from "./routes/vestingRoutes.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/vesting", vestingRouter);
  return app;
}
