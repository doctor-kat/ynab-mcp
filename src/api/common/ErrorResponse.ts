export interface ErrorResponse {
  error: ErrorDetail;
}

export interface ErrorDetail {
  id: string;
  name: string;
  detail: string;
}
