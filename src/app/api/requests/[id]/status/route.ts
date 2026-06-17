import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusChangeSchema } from "@/lib/validations/print-request";

// PATCH /api/requests/:id/status — change status and append to history.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await prisma.printRequest.findUnique({
    where: { id: params.id },
    select: { status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === parsed.data.toStatus) {
    return NextResponse.json(
      { error: "Status is already set to this value" },
      { status: 409 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.printRequest.update({
      where: { id: params.id },
      data: { status: parsed.data.toStatus },
    });
    await tx.statusHistory.create({
      data: {
        requestId: params.id,
        fromStatus: existing.status,
        toStatus: parsed.data.toStatus,
        reason: parsed.data.reason || null,
      },
    });
    return next;
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
