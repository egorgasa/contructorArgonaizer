import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/requests/:id/files/:fileId — stream one attachment back to client.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; fileId: string } },
) {
  const file = await prisma.requestFile.findUnique({ where: { id: params.fileId } });
  if (!file || file.requestId !== params.id) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  const stored = await getStorage().read(file.storageKey);
  if (!stored) {
    return NextResponse.json({ error: "Файл отсутствует в хранилище" }, { status: 404 });
  }

  // Encode filename safely for Content-Disposition (RFC 5987).
  const fallback = file.filename.replace(/[^\x20-\x7E]/g, "_");
  const utf8 = encodeURIComponent(file.filename);

  // Buffer/Uint8Array's generic ArrayBufferLike type doesn't satisfy BodyInit's
  // narrower ArrayBuffer constraint under our TS lib. Wrap in a Blob to bridge.
  const body = new Blob([new Uint8Array(stored.data)], {
    type: file.mimeType || "application/octet-stream",
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename="${fallback}"; filename*=UTF-8''${utf8}`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
