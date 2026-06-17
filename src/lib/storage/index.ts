import type { FileStorage } from "./types";
import { LocalFileStorage } from "./local";
import { VercelBlobStorage } from "./vercel-blob";

/**
 * Storage singleton resolver. The backend is chosen at runtime from the env:
 *
 *   - FILE_STORAGE_DRIVER="local"        → local filesystem (dev default)
 *   - FILE_STORAGE_DRIVER="vercel-blob"  → Vercel Blob (requires token)
 *   - FILE_STORAGE_DRIVER unset:
 *       - BLOB_READ_WRITE_TOKEN present   → Vercel Blob (prod convenience)
 *       - otherwise                       → local filesystem
 *
 * Selection happens lazily (on first use), so a production build never needs a
 * Blob token unless the Blob driver is actually exercised at runtime.
 */
let cached: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (cached) return cached;

  const driver = process.env.FILE_STORAGE_DRIVER?.trim().toLowerCase();
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (driver === "vercel-blob") {
    if (!token) {
      throw new Error(
        'FILE_STORAGE_DRIVER="vercel-blob" requires BLOB_READ_WRITE_TOKEN to be set.',
      );
    }
    cached = new VercelBlobStorage(token);
  } else if (driver === "local") {
    cached = new LocalFileStorage();
  } else if (!driver && token) {
    // No explicit driver, but a Blob token is present — prefer durable storage.
    cached = new VercelBlobStorage(token);
  } else {
    cached = new LocalFileStorage();
  }

  return cached;
}

export type { FileStorage, SavedFile, ReadFile } from "./types";
export { FILE_UPLOAD_LIMITS } from "./types";
