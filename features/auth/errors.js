/**
 * Maps Firebase Auth / session errors to safe, user-friendly messages.
 * Sign-in failures are deliberately generic (no hint whether the email exists).
 */
export class SessionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "SessionError";
    this.code = code;
  }
}

export function authErrorMessage(error) {
  if (error?.name === "SessionError") return error.message;

  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/email-already-in-use":
      return "An account with this email may already exist. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
