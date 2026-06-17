import { NextRequest, NextResponse } from "next/server";
import type { OperatorNote, RequestFile, StatusHistory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// GET /api/requests/:id — full request detail for admin card.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const request = await prisma.printRequest.findUnique({
    where: { id: params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let parsedPayload: unknown = null;
  try {
    parsedPayload = JSON.parse(request.payload);
  } catch {
    parsedPayload = null;
  }

  return NextResponse.json({
    id: request.id,
    publicNumber: request.publicNumber,
    status: request.status,
    productType: request.productType,
    clientName: request.clientName,
    clientEmail: request.clientEmail,
    clientPhone: request.clientPhone,
    payload: parsedPayload,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    notes: request.notes.map((n: OperatorNote) => ({
      id: n.id,
      requestId: n.requestId,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    statusHistory: request.statusHistory.map((s: StatusHistory) => ({
      id: s.id,
      requestId: s.requestId,
      fromStatus: s.fromStatus,
      toStatus: s.toStatus,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
    })),
    files: request.files.map((f: RequestFile) => ({
      id: f.id,
      requestId: f.requestId,
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
  });
}
