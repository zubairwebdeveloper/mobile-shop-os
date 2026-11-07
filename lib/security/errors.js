/**
 * Typed application errors. Messages are safe to show to clients.
 * Both "tenant does not exist" and "you are not a member" map to the SAME 403 so that
 * tenant IDs cannot be enumerated.
 */
export class AppError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", 401, "Authentication required.");
export const forbidden = () => new AppError("FORBIDDEN", 403, "You do not have access to this resource.");
export const badRequest = (message = "Invalid request.") => new AppError("BAD_REQUEST", 400, message);
export const notFound = (message = "Not found.") => new AppError("NOT_FOUND", 404, message);
export const conflict = (code, message) => new AppError(code, 409, message);
