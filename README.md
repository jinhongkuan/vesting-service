# Vesting Service API

**Root Branch:** `boiler-node`  
**Time spent:** 2 hours

This service manages token vesting. You record an agreement for how many tokens someone earns, linearly, over a period of time. They can check how much has been vested so far and they can trigger a release for vested tokens.

## Install / run / test

Node 18+.

```bash
npm install
npm test
npm run dev          # http://localhost:3000  (PORT to override)
npm run build && npm start
```

## API

Base: `http://localhost:3000/api/vesting`.
In-memory. On boot, two example Schedules already exist (`id` `1` and `2`) so you can GET without creating first.

| Method | Path                           | Description                                                                     |
| ------ | ------------------------------ | ------------------------------------------------------------------------------- |
| `POST` | `/schedules`                   | Start a vesting Schedule for a beneficiary.                                     |
| `GET`  | `/schedules/:beneficiary`      | See every Schedule for that beneficiary.                                        |
| `GET`  | `/schedule/:id`                | See one Schedule, how much has been Released, and the Release history.          |
| `GET`  | `/schedule/:id/releasable?at=` | Ask how much can be Released now, or at a chosen time (`at`). Does not Release. |
| `POST` | `/schedule/:id/release`        | Release what is currently releasable, or a chosen `amount`.                     |

Amounts on the wire are decimal strings.

**Walkthrough.** 1000 tokens over 1000 seconds, starting `1700000000`. Halfway through, 500 is earned. `GET ?at=` asks about that moment and does not Release. `POST /release` uses **current time** (this Schedule is already finished, so it Releases the full 1000).

Create a Schedule:

```bash
curl -s -X POST localhost:3000/api/vesting/schedules \
  -H 'Content-Type: application/json' \
  -d '{"id":"t1","beneficiary":"0xabc","totalAmount":"1000","startTimestamp":1700000000,"durationSeconds":1000,"tokenSymbol":"DEMO","tokenDecimals":18}'

# { "id": "t1", "releasedAmount": "0", "releases": [], ... }
```

How much was earned halfway (`at` = start + 500s) — a what-if, nothing Released:

```bash
curl -s 'localhost:3000/api/vesting/schedule/t1/releasable?at=1700000500'

# { "scheduleId": "t1", "at": 1700000500, "vested": "500", "releasable": "500" }
```

Release what is earned **now** (empty body = all currently releasable):

```bash
curl -s -X POST localhost:3000/api/vesting/schedule/t1/release \
  -H 'Content-Type: application/json' -d '{}'

# { "scheduleId": "t1", "released": "1000", "totalReleased": "1000" }
```

See the Schedule and the Release history (`releasedAmount` comes from the log):

```bash
curl -s localhost:3000/api/vesting/schedule/t1

# {
#   "id": "t1",
#   "releasedAmount": "1000",
#   "releases": [{ "scheduleId": "t1", "amount": "1000", "asOf": 1740000000 }]
# }
# asOf is the server clock at POST time.
```

| HTTP | `error`           | When                                                                          |
| ---- | ----------------- | ----------------------------------------------------------------------------- |
| 400  | `invalid_payload` | Body or query could not be read, including unknown fields such as POST `at`   |
| 404  | `not_found`       | No Schedule with that id                                                      |
| 409  | `cannot_release`  | Amount is not allowed (`> releasable`, `<= 0`, or vested = 0). Log unchanged. |

## Glossary

- **Schedule** — the agreement (curve facts).
- **Release** — append-only record of an amount leaving a Schedule.
- **vested** — earned at a given time; derived, never stored.
- **released** — sum of Release amounts.
- **releasable** — vested minus released.

## Design notes

### 1. Releases are the source of truth

**Context.** The Schedule is the agreement. A Release is a separate recorded event: you should be able to see each one, not only `released`. The starter keeps `releasedAmount` on the Schedule and updates it on POST, which collapses those two. The brief also wants release history.

**Decision.** A Release is an append-only fact: which Schedule, how much, at which server `asOf`. We never rewrite it. `released` (JSON `releasedAmount`) is the sum of that log. It does not live on the Schedule. Create cannot seed it.

```
store                         domain (pure)
Schedule           ──┐
                     ├── vested(schedule, asOf)
Release[]            ├── sum(log) = released
                     └── releasable = vested - released
```

**Consequences.**

- You can see each Release, not only the latest `released`. A counter sitting next to a log cannot drift.
- Summing the log is a bit more work than the starter’s O(1) field. Fine at this scale.

**Rejected (starter):** writable `releasedAmount` on the Schedule.

### 2. Repo type vs return type

**Context.** Some fields on the return type are derived domain amounts (`released`, `vested`, `releasable`). They belong in the domain — they are how we talk about the Schedule — but they are not persisted. They are computed from the Schedule, the Release log, and `asOf`.

**Decision.** The repository stores domain types (the facts). HTTP returns View types, where those derived amounts are filled in.

Examples: GET Schedule injects `releasedAmount` and `releases`; a snapshot injects `vested` / `releasable`; a Release result injects `totalReleased`; a stored `Release` is `bigint`, its view is a string amount. Error bodies stay `{ error }` — they are not domain types.

**Consequences.**

- The store does not know about JSON-only fields.
- We keep two (or more) view types in sync.

**Rejected:** one type for store and HTTP, with stub zeros / stringified amounts on the row.

### 3. Floor on the linear stretch

**Context.** You cannot release more than has been earned. Amounts are integers, and `total * (asOf - start) / duration` does not always divide evenly. Rounding up would make `vested` larger than the curve has earned.

**Decision.**

```
asOf <= start              → vested = 0
asOf >= start + duration   → vested = total
else                       → floor(total * (asOf - start) / duration)
```

The end cap picks up leftover from flooring.

**Consequences.**

- A Release never exceeds `releasable`.
- Until the end, 1 unit can sit outside `vested` (1000 over 3s is 333, 666, then 1000).

**Rejected:** round-to-nearest (`vested` can be 1 over the curve); per-second remainder distribution (more ledger than this task needs).

### 4. Time is a protected entity

**Context.** Time is part of the Schedule: how much has been earned is a function of the Schedule and a moment on the clock. Whoever supplies that moment can change `vested` and `releasable`. If the caller who POSTs a Release also names the time, they can make tomorrow’s `vested` releasable today.

Asking “what would be `vested` at T?” is different. That does not create a Release.

**Decision.** The `asOf` a Release is claimed against is the server’s now, not the caller’s. A snapshot may use a caller-supplied `asOf`; it is a what-if and cannot create a Release.

On the wire: GET `?at=` is that what-if (omit it and we use the server clock). POST `/release` does not accept `at`. Unknown fields, including `at`, are **400 `invalid_payload`**, not silently dropped. Domain math takes `asOf` as an argument; it never calls `Date.now()`.

Query `asOf` changes `vested` only. `released` is the sum of every Release, not only those with `asOf <= T`.

**Consequences.**

- You can replay or preview the curve without a Release.
- A Release cannot include tokens that have not been earned yet.
- Tests inject a clock. They do not send `body.at`.

**Rejected (starter):** `body.at` on POST.

### 5. Parse vs business error types

**Context.** “We could not read the request” is not the same failure as “you asked for more than `releasable`.” The starter returns **400 `nothing_releasable`**, which treats a failed Release like a bad payload.

**Decision.** Status says how the request failed, not a second taxonomy. HTTP body is `{ error: string }`.

| Kind     | `error`           | HTTP | Meaning                                                                                   |
| -------- | ----------------- | ---- | ----------------------------------------------------------------------------------------- |
| Parse    | `invalid_payload` | 400  | Body/query could not be read (including unknown fields).                                  |
| Lookup   | `not_found`       | 404  | No Schedule with that id.                                                                 |
| Business | `cannot_release`  | 409  | Release not allowed (`amount > releasable`, `amount <= 0`, or vested = 0). Log unchanged. |

**Consequences.**

- One refusal covers over-release, zero, and vested = 0. Do not clamp.
- Handlers map `CannotRelease` → 409. They do not invent a fourth code.

**Rejected (starter):** `400 nothing_releasable`.

## Out of scope

### 1. Importing ongoing Schedule

**Context.** Creating a Schedule that already has Releases is not the same as creating a new Schedule. The starter allowed that by seeding `releasedAmount`.

**Decision.** Not in this task. Under a log, the honest shape is Create plus an initial `releases[]`. That needs product sign-off.

**Consequences.** Example Schedules start with an empty log. Restarting the process loses in-memory state. No auth.
