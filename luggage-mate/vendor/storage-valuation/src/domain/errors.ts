export type ErrorCode =
  | "NO_IMAGES"
  | "TOO_MANY_IMAGES"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_IMAGE"
  | "INVALID_RISK_MULTIPLIER"
  | "AI_PROVIDER_ERROR"
  | "INVALID_AI_RESPONSE"
  | "EMPTY_AI_RESPONSE"
  | "UNSUPPORTED_CURRENCY"
  | "INVALID_CONFIGURATION"
  | "INVALID_REQUEST"
  | "INVALID_SESSION"
  | "INCOMPLETE_CONFIRMATION"
  | "NO_SELECTED_ITEMS"
  | "INVALID_DRAFT_TOKEN"
  | "EXPIRED_DRAFT";
export class StorageAnalysisError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StorageAnalysisError";
  }
}
export function safeError(error: unknown) {
  return error instanceof StorageAnalysisError
    ? { code: error.code, message: error.message }
    : { code: "INTERNAL_ERROR", message: "Analysis could not be completed." };
}
