export class YnabApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown,
    public readonly headers: Record<string, string>
  ) {
    super(message);
    this.name = "YnabApiError";
  }
}






