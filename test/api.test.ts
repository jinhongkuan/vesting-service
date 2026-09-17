import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { resetForTests } from "../src/repository/scheduleRepo.js";

const schedule = {
  id: "t1",
  beneficiary: "0xabc",
  totalAmount: "1000",
  startTimestamp: 100,
  durationSeconds: 100,
  tokenSymbol: "DEMO",
  tokenDecimals: 18,
};

function appAt(now: number) {
  return createApp({ clock: { now: () => now } });
}

describe("vesting API", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("health", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  describe("start a Schedule", () => {
    it("create then releasable at midpoint: vested 500, releasable 500", async () => {
      const app = appAt(150);
      const created = await request(app).post("/api/vesting/schedules").send(schedule);
      expect(created.status).toBe(201);
      expect(created.body.releasedAmount).toBe("0");
      expect(created.body.releases).toEqual([]);

      const snap = await request(app).get("/api/vesting/schedule/t1/releasable?at=150");
      expect(snap.status).toBe(200);
      expect(snap.body).toMatchObject({ vested: "500", releasable: "500", at: 150 });
    });
  });

  describe("how much can be Released", () => {
    it("GET ?at= is a what-if: clock at start, query at end shows total without a Release", async () => {
      const app = appAt(100);
      await request(app).post("/api/vesting/schedules").send(schedule);
      const snap = await request(app).get("/api/vesting/schedule/t1/releasable?at=200");
      expect(snap.body).toMatchObject({ vested: "1000", releasable: "1000" });
      const page = await request(app).get("/api/vesting/schedule/t1");
      expect(page.body.releasedAmount).toBe("0");
    });
  });

  describe("Release", () => {
    it("omit amount drains currently releasable; history records the Release", async () => {
      const app = appAt(150);
      await request(app).post("/api/vesting/schedules").send(schedule);

      const released = await request(app).post("/api/vesting/schedule/t1/release").send({});
      expect(released.status).toBe(200);
      expect(released.body).toMatchObject({
        scheduleId: "t1",
        released: "500",
        totalReleased: "500",
      });

      const page = await request(app).get("/api/vesting/schedule/t1");
      expect(page.body.releasedAmount).toBe("500");
      expect(page.body.releases).toEqual([
        { scheduleId: "t1", amount: "500", asOf: 150 },
      ]);

      const snap = await request(app).get("/api/vesting/schedule/t1/releasable?at=150");
      expect(snap.body.releasable).toBe("0");
    });

    it("partial Release then over-release is 409; GET still shows the first Release only", async () => {
      const app = appAt(150);
      await request(app).post("/api/vesting/schedules").send(schedule);

      const first = await request(app)
        .post("/api/vesting/schedule/t1/release")
        .send({ amount: "400" });
      expect(first.status).toBe(200);
      expect(first.body.released).toBe("400");

      const over = await request(app)
        .post("/api/vesting/schedule/t1/release")
        .send({ amount: "200" });
      expect(over.status).toBe(409);
      expect(over.body).toEqual({ error: "cannot_release" });

      const page = await request(app).get("/api/vesting/schedule/t1");
      expect(page.body.releasedAmount).toBe("400");
      expect(page.body.releases).toHaveLength(1);
    });
  });

  describe("errors", () => {
    it("POST body.at is 400 invalid_payload, not a silent no-op", async () => {
      const app = appAt(150);
      await request(app).post("/api/vesting/schedules").send(schedule);
      const res = await request(app)
        .post("/api/vesting/schedule/t1/release")
        .send({ at: 200, amount: "1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_payload");
      const page = await request(app).get("/api/vesting/schedule/t1");
      expect(page.body.releases).toEqual([]);
    });

    it("invalid create payload is 400 invalid_payload", async () => {
      const res = await request(appAt(150)).post("/api/vesting/schedules").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_payload");
    });

    it("unknown Schedule is 404 not_found", async () => {
      const res = await request(appAt(150)).get("/api/vesting/schedule/missing");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "not_found" });
    });

    it("Create with releasedAmount is 400 invalid_payload", async () => {
      const app = appAt(150);
      const created = await request(app)
        .post("/api/vesting/schedules")
        .send({ ...schedule, releasedAmount: "999" });
      expect(created.status).toBe(400);
      expect(created.body.error).toBe("invalid_payload");
    });
  });
});
