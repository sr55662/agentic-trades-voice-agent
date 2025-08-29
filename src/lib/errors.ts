/**
 * Application error type for consistent HTTP error responses.
 */
export class AppError extends Error {
  type: string;
  status: number;
  details?: unknown;
  constructor(type: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

/**
 * Convert an unknown error to a serializable response body.
 */
export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return { error: { type: err.type, message: err.message, details: err.details } };
  }
  const message = err instanceof Error ? err.message : 'internal_error';
  return { error: { type: 'Internal', message } };
}
