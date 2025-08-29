# 0001: Adopt Vitest for Unit Testing

## Status
Accepted

## Context
We need fast, TS-friendly tests and simple coverage for server and library code.

## Decision
Use **Vitest** with Node environment and `coverage-v8`. Config in `vitest.config.ts`.

## Consequences
- Simple `npm test` integration in CI.
- Easy migration path from Jest if needed.
