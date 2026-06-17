import { randomBytes } from "crypto";
import { del, put } from "@vercel/blob";
import type { FileStorage, ReadFile, SavedFile } from "./types";

/**
 * Vercel Blob storage backend — the production-safe alternative to the local
 * filesystem (which is ephemeral on serverless).
 *
 * Files are uploaded under a stable, per-request prefix:
 *   requests/<requestId>/<random>.bin
 * The returned blob URL is used as the `storageKey` stored in the DB. The key
 * is never exposed to clients — the file-list API omits it and downloads are
 * proxied through our own route — so although blobs are stored with public
 * (but unguessable) URLs, they are only reachable via the existing app routes.
 *
 * Auth: the SDK reads `BLOB_READ_WRITE_TOKEN` from the environment, but we pass
 * it explicitly so the storage factory can validate its presence and fail fast.
 */
export class VercelBlobStorage implements FileStorage {
  private readonly token: string | undefined;

  constructor(token?: string) {
    this.token = token ?? process.env.BLOB_READ_WRITE_TOKEN;
  }

  async save(args: {
    requestId: string;
    filename: string;
    mimeType: string;
    data: Buffer;
  }): Promise<SavedFile> {
    // Restrict requestId to a CUID-like character set to keep the blob path
    // well-formed and prevent prefix injection.
    if (!/^[a-zA-Z0-9_-]+$/.test(args.requestId)) {
      throw new Error("invalid request id");
    }

    const random = randomBytes(16).toString("hex");
    const pathname = `requests/${args.requestId}/${random}.bin`;

    const result = await put(pathname, args.data, {
      access: "public",
      token: this.token,
      contentType: args.mimeType || "application/octet-stream",
      // We already add our own random segment; don't let the SDK append another.
      addRandomSuffix: false,
    });

    return {
      // The blob URL round-trips back to read()/remove(). It is unique, which
      // satisfies the DB's unique constraint on storageKey.
      storageKey: result.url,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.data.byteLength,
    };
  }

  async read(storageKey: string): Promise<ReadFile | null> {
    const res = await fetch(storageKey);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`blob fetch failed: ${res.status}`);
    }
    const data = Buffer.from(await res.arrayBuffer());
    // The caller combines these bytes with the DB-stored MIME/filename, so the
    // exact values here are not relied upon (mirrors the local backend).
    return {
      data,
      mimeType: res.headers.get("content-type") ?? "application/octet-stream",
      filename: "",
    };
  }

  async remove(storageKey: string): Promise<void> {
    // `del` is idempotent — deleting a missing blob does not throw.
    await del(storageKey, { token: this.token });
  }
}
