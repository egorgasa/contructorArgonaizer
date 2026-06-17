/**
 * Storage abstraction for request attachments.
 *
 * The MVP uses a local filesystem implementation. The interface is designed
 * so that an S3-backed implementation can be dropped in later without changing
 * any API route or component code.
 */

export interface SavedFile {
  /** Opaque storage key that uniquely identifies the file inside the backend. */
  storageKey: string;
  /** Original filename as supplied by the client. */
  filename: string;
  /** MIME type as supplied by the client (or sniffed). */
  mimeType: string;
  /** Size in bytes. */
  sizeBytes: number;
}

export interface ReadFile {
  /** File contents as a Node Buffer. */
  data: Buffer;
  /** MIME type. */
  mimeType: string;
  /** Original filename. */
  filename: string;
}

export interface FileStorage {
  /**
   * Persist a file scoped to a specific request and return its storage key.
   *
   * Implementations should generate the storage key themselves (do not trust
   * client input) and isolate per-request files in a stable namespace
   * (folder, prefix, bucket subdir, etc.).
   */
  save(args: {
    requestId: string;
    filename: string;
    mimeType: string;
    data: Buffer;
  }): Promise<SavedFile>;

  /**
   * Read a previously stored file by its storage key.
   * Returns null if the file no longer exists.
   */
  read(storageKey: string): Promise<ReadFile | null>;

  /**
   * Remove a previously stored file. Idempotent — should not throw if the
   * file is already gone.
   */
  remove(storageKey: string): Promise<void>;
}

/** Limits used by the upload endpoint to bound resource usage. */
export const FILE_UPLOAD_LIMITS = {
  /** Maximum bytes per file (10 MiB for MVP). */
  maxFileSizeBytes: 10 * 1024 * 1024,
  /** Maximum number of files per request. */
  maxFilesPerRequest: 5,
  /** Allowed MIME types — kept narrow for safety. */
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
  ] as const,
} as const;

export type AllowedMimeType = (typeof FILE_UPLOAD_LIMITS.allowedMimeTypes)[number];
