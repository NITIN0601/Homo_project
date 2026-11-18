import { ApiError } from "../contracts/ApiError";

export function normalizeError(error: unknown, fallbackMessage = "An unexpected error occurred"): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    return new ApiError(error.message, 500);
  }
  if (typeof error === "string") {
    return new ApiError(error, 500);
  }
  return new ApiError(fallbackMessage, 500);
}
