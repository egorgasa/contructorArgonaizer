import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage, FILE_UPLOAD_LIMITS } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/requests/:id/files — multipart/form-data attachment upload.
// Accepts one or more files in the field `files`.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const exists = await prisma.printRequest.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const existingCount = await prisma.requestFile.findMany({
    where: { requestId: params.id },
  });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 },
    );
  }

  const incoming = form.getAll("files").filter((v): v is File => v instanceof File);
  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "Не приложено ни одного файла" },
      { status: 400 },
    );
  }

  if (existingCount.length + incoming.length > FILE_UPLOAD_LIMITS.maxFilesPerRequest) {
    return NextResponse.json(
      {
        error: `К заявке можно прикрепить не более ${FILE_UPLOAD_LIMITS.maxFilesPerRequest} файлов`,
      },
      { status: 400 },
    );
  }

  // Validate each file against MIME allowlist and size limit.
  const allowed: readonly string[] = FILE_UPLOAD_LIMITS.allowedMimeTypes;
  for (const file of incoming) {
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Тип файла не поддерживается: ${file.type || "неизвестно"}. Допустимы: JPEG, PNG, WEBP, HEIC, PDF.`,
        },
        { status: 400 },
      );
    }
    if (file.size > FILE_UPLOAD_LIMITS.maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `Файл «${file.name}» больше допустимого размера (${Math.round(FILE_UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024))} МБ).`,
        },
        { status: 400 },
      );
    }
  }

  const storage = getStorage();

  // Save each file to storage, then persist a DB row. We do the writes
  // serially so that a later failure does not leave many orphans on disk.
  const saved: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }> = [];

  try {
    for (const file of incoming) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const stored = await storage.save({
        requestId: params.id,
        filename: file.name || "attachment",
        mimeType: file.type,
        data: bytes,
      });
      const row = await prisma.requestFile.create({
        data: {
          requestId: params.id,
          filename: stored.filename,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
        },
      });
      saved.push({
        id: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        uploadedAt: row.uploadedAt.toISOString(),
      });
    }
  } catch (err) {
    console.error("file upload failed", err);
    return NextResponse.json(
      { error: "Не удалось сохранить файлы", saved },
      { status: 500 },
    );
  }

  return NextResponse.json({ files: saved }, { status: 201 });
}

// GET /api/requests/:id/files — list of files attached to a request (admin).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const files = await prisma.requestFile.findMany({
    where: { requestId: params.id },
    orderBy: { uploadedAt: "asc" },
  });
  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
  });
}
