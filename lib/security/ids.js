const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Plain Firestore-safe ID: no slashes, so a client-supplied value can never change a document path. */
export function isSafeId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}
