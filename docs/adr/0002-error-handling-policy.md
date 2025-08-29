# 0002: Unified Error Handling via AppError

## Status
Accepted

## Context
Inconsistent error responses complicate ops and client handling.

## Decision
Introduce `AppError` and a single Fastify `setErrorHandler` to normalize responses.

## Consequences
- Consistent machine-parseable error envelopes.
- Simpler alerting and client UX.
