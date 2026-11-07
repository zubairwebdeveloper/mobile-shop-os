import { badRequest } from "./errors";

const MAX_BODY_BYTES = 20 * 1024;

/** Reads a small JSON body. Invalid or oversized bodies become a clean 400, never a 500. */
export async function readJson(request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw badRequest("Request is too large.");

  let text;
  try {
    text = await request.text();
  } catch {
    throw badRequest("Invalid request.");
  }
  if (text.length > MAX_BODY_BYTES) throw badRequest("Request is too large.");

  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("Invalid JSON.");
  }
}
