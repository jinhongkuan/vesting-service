# Vesting Service API — Boilerplate (Node)

**Branch:** `boiler-node`  
**Expected duration:** This is a **4-hour task**  
**Goal:** Complete the Web3 vesting backend and make tests meaningfully pass/expand

---

## Quick start

```bash
npm install
npm run dev
npm test
```

---

## What is already provided

- Node.js + TypeScript setup
- Express app shell
- Seed schedules in memory
- Vesting math stubs
- API route stubs
- Skeleton tests

---

## What to implement (required)

### Core logic

- Implement linear vesting math in `src/domain/vestingMath.ts`
- Compute vested/releasable correctly at arbitrary timestamps

### API behavior

- `POST /api/vesting/schedules` create schedule with validation
- `GET /api/vesting/schedules/:beneficiary` list by beneficiary
- `GET /api/vesting/schedule/:id` get one schedule
- `GET /api/vesting/schedule/:id/releasable?at=...` compute amounts
- `POST /api/vesting/schedule/:id/release` release currently releasable amount

### Tests

Expand beyond placeholders to prove:
1. vesting formula before/mid/after boundaries
2. releasable subtracts already released
3. release mutates schedule released amount
4. invalid input and unknown schedule handling

---

## Design notes to document

- Validation strategy
- Error contract shape
- Time source handling for deterministic tests
- Assumptions and known gaps

## Acceptance criteria

- [ ] `npm test` passes for your suite
- [ ] API works for core flows
- [ ] README lists commands + assumptions + known gaps

### Your notes

_Add assumptions and remaining work before submit._
