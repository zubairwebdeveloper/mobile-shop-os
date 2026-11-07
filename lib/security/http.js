import { NextResponse } from "next/server";
import { AppError } from "./errors";

/** JSON response that must never be cached by browsers or proxies (auth/tenant data). */
export function json(body, status = 200, extraHeaders = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

/**
 * Wraps a route handler so thrown errors become safe JSON responses.
 * Never returns stack traces or raw error messages from unknown errors.
 */
export function route(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        return json({ error: { code: error.code, message: error.message } }, error.status);
      }
      if (error?.name === "ZodError") {
        return json({ error: { code: "INVALID_INPUT", message: "Invalid input." } }, 400);
      }
      // Log only the error name: messages can contain document paths or user data.
      console.error("Unhandled route error:", error?.name ?? "UnknownError");
      return json({ error: { code: "INTERNAL", message: "Unexpected error." } }, 500);
    }
  };
}
