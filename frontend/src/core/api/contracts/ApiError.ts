export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: ApiErrorDetail[];
  public requestId?: string;

  constructor(message: string, status = 500, code?: string, details?: ApiErrorDetail[], requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}
