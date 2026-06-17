import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import type { FileStorage, ReadFile, SavedFile } from "./types";

/**
 * Local filesystem storage. Files are saved under <root>/<requestId>/<key>.bin
 * Metadata (filename, MIME) lives in the database; the storage layer keeps the
 * raw bytes only.
 *
 * The default root is `<cwd>/uploads`, but this can be overridden via the
 * `UPLOADS_DIR` environment variable.
 */
export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
  }

  private safeRequestDir(requestId: string): string {
    // Restrict requestId to a CUID-like character set to harden against traversal.
    if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) {
      throw new Error("invalid request id");
    }
    return path.join(this.root, requestId);
  }

  private resolveKeyPath(storageKey: string): string {
    // storageKey is `<requestId>/<random>.bin` — validate strictly.
    const parts = storageKey.split("/");
    if (parts.length !== 2) throw new Error("invalid storage key");
    const [requestId, fileName] = parts;
    if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) throw new Error("invalid storage key");
    if (!/^[a-zA-Z0-9_-]+\.bin$/.test(fileName)) throw new Error("invalid storage key");
    return path.join(this.root, requestId, fileName);
  }

  async save(args: {
    requestId: string;
    filename: string;
    mimeType: string;
    data: Buffer;
  }): Promise<SavedFile> {
    const dir = this.safeRequestDir(args.requestId);
    await mkdir(dir, { recursive: true });

    const random = randomBytes(16).toString("hex");
    const fileName = `${random}.bin`;
    const filePath = path.join(dir, fileName);
    await writeFile(filePath, args.data, { flag: "wx" });

    return {
      storageKey: `${args.requestId}/${fileName}`,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.data.byteLength,
    };
  }

  async read(storageKey: string): Promise<ReadFile | null> {
    try {
      const filePath = this.resolveKeyPath(storageKey);
      const data = await readFile(filePath);
      // The caller is expected to combine bytes with the DB-stored MIME/filename.
      return { data, mimeType: "application/octet-stream", filename: "" };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async remove(storageKey: string): Promise<void> {
    try {
      const filePath = this.resolveKeyPath(storageKey);
      await unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }
  }
}
