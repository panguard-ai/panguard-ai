/**
 * Error payloads the gateway itself returns.
 *
 * A policy block is `invalid_request` (400): the spec's error types have no
 * "blocked by policy", and 400 is the one a client treats as not retryable.
 * Never a 5xx for a block: a client retries those, and a guard's refusal sent
 * as 500 turns into a retry loop. A 5xx (`server_error`) is reserved for the
 * gateway's own faults, where a retry can succeed.
 *
 * @module @panguard-ai/panguard-gateway/errors
 */

export interface Rejection {
  readonly status: number;
  readonly type: 'invalid_request' | 'not_found' | 'server_error' | 'too_many_requests';
  readonly code: string;
  readonly message: string;
  readonly param: string | null;
}

export function policyRejection(message: string, param: string | null): Rejection {
  return {
    status: 400,
    type: 'invalid_request',
    code: 'policy_violation',
    message: `[PanGuard] ${message}`,
    param,
  };
}

export function invalidRequest(code: string, message: string, param: string | null): Rejection {
  return { status: 400, type: 'invalid_request', code, message, param };
}

export function faultRejection(message: string, param: string | null): Rejection {
  return {
    status: 500,
    type: 'server_error',
    code: 'gateway_evaluation_failed',
    message: `[PanGuard] ${message}`,
    param,
  };
}

export function previousResponseNotFound(id: string): Rejection {
  return {
    status: 400,
    type: 'invalid_request',
    code: 'previous_response_not_found',
    message: `Previous response with id '${id}' not found.`,
    param: 'previous_response_id',
  };
}

/** HTTP JSON error body. */
export function httpErrorBody(rejection: Rejection): Record<string, unknown> {
  const { type, code, message, param } = rejection;
  return { error: { type, code, message, param } };
}

/** WebSocket error envelope (spec: JSON `error` with `status` and `error.code`). */
export function wsErrorEnvelope(rejection: Rejection): Record<string, unknown> {
  const { status, type, code, message, param } = rejection;
  return { type: 'error', status, error: { type, code, message, param } };
}
