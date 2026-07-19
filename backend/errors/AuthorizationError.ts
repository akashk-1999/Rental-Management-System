/**
 * AuthorizationError represents an error where a user is authenticated but
 * does not have the necessary permissions or roles to access a resource.
 */
export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied. Insufficient permissions.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
