# Error Handling Strategy

- Use `AppError` for expected business errors; include `type`, `message`, `status`.
- All routes throw `AppError` (or return normally). The global Fastify `setErrorHandler` serializes to:
  ```json
  { "error": { "type": "InvalidSignature", "message": "invalid signature", "details": {...} } }
  ```
- Unknown errors are logged and return `{ error: { type: "Internal", message: "internal_error" } }` with HTTP 500.
- Do not leak PII or secrets in error messages.
