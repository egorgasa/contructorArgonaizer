// Lightweight id generator. Avoids pulling in a uuid dependency for Slice 1.
// `crypto.randomUUID` is available in modern browsers and Node 19+.
// We fall back to a timestamp+random string when it's not available
// (e.g. very old runtimes) so this stays safe to call anywhere.
export function generateId(prefix = "id"): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
