/**
 * ValidationError represents an error during request body, query, or parameter validation.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
