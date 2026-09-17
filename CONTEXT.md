# Vesting

A beneficiary earns tokens over time on a Schedule. A Release records an amount leaving that Schedule.

## Domain Model

### Entities

`Schedule`
: The agreement that one beneficiary receives a fixed total of one token, linearly, from start over duration.

`Release`
: An append-only record of an amount leaving a Schedule, with a `timestamp` (unix seconds). Once recorded it is not rewritten.

### Amounts

`vested`
: How much of the Schedule has been earned at a given `at`. Derived from the Schedule and `at`. Never stored.

`released`
: The sum of every Release on that Schedule. Not filtered by query time.

`releasable`
: `vested` minus `released` at a given `at`. Derived.

### Relationships

`Schedule` belongs to one `beneficiary`.

`Schedule` has `Release` [0..*].

## Terminology Notes

- Use `Schedule`, not grant, lockup, or vest.
- Use `Release`, not taking, transaction, claim, or withdrawal.
- Use `vested`, `released`, and `releasable` — not unlocked, available, claimable, or balance.
- Time is an argument named `at`. "Now" is not a domain concept.
- Query `at` may be supplied by the caller. A Release `timestamp` is the server's now.
- Amounts are integers in the token's smallest unit.
- The brief's "transaction" is a `Release`. Do not use "transaction" in types or routes.
- JSON keeps the boiler names `totalAmount` and `releasedAmount`. In speech and domain code, that quantity is `released`.
