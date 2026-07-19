/**
 * HttpError represents a standard HTTP error with a status code
 * and an optional array of specific error messages.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
