/**
 * Application-level error carrying an HTTP status code so the central error
 * handler can translate thrown errors into consistent JSON responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Preserve the actual subclass prototype (e.g. BadRequestError) so
    // `instanceof` checks and `constructor.name` stay accurate after transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}
