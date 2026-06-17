import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { operatorNoteSchema } from "@/lib/validations/print-request";

// POST /api/requests/:id/notes — add internal operator note.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = operatorNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const exists = await prisma.printRequest.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.operatorNote.create({
    data: {
      requestId: params.id,
      body: parsed.data.body,
    },
  });

  return NextResponse.json(
    {
      id: note.id,
      requestId: note.requestId,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
