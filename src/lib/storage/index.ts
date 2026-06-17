import type { FileStorage } from "./types";
import { LocalFileStorage } from "./local";

/**
 * Storage singleton resolver.
 *
 * For the MVP we always return the local-filesystem implementation. To swap
 * to S3 later, add an alternative implementation and branch here on an env var
 * (e.g. STORAGE_BACKEND=local|s3).
 */
let cached: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (!cached) {
    cached = new LocalFileStorage();
  }
  return cached;
}

export type { FileStorage, SavedFile, ReadFile } from "./types";
export { FILE_UPLOAD_LIMITS } from "./types";
