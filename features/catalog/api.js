/** Small fetch helper shared by catalogue forms. Throws Error(message) on failure. */
export async function callApi(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
  return body;
}
