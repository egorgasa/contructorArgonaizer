import { NextRequest, NextResponse } from "next/server";
import type { RequestQuote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { quoteUpsertSchema } from "@/lib/validations/print-request";
import type { StoredRequestQuote } from "@/types/print-request";

// Admin-only quote endpoints (gated by the middleware matcher).
//
//   GET /api/requests/:id/quote — latest quote for a request (or null).
//   PUT /api/requests/:id/quote — create the first quote or update the latest.
//
// The MVP keeps a single live quote per request: PUT updates the most recent
// row if one exists, otherwise creates it. This leaves room for storing
// multiple versions later without a schema change.

function serialize(q: RequestQuote): StoredRequestQuote {
  return {
    id: q.id,
    requestId: q.requestId,
    priceCents: q.priceCents,
    currency: q.currency,
    productionDays: q.productionDays,
    validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    operatorComment: q.operatorComment,
    internalCostNote: q.internalCostNote,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const exists = await prisma.printRequest.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const quote = await prisma.requestQuote.findFirst({
    where: { requestId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ quote: quote ? serialize(quote) : null });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = quoteUpsertSchema.safeParse(body);
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

  const data = {
    priceCents: parsed.data.priceCents ?? null,
    currency: parsed.data.currency,
    productionDays: parsed.data.productionDays ?? null,
    validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
    operatorComment: parsed.data.operatorComment?.trim() || null,
    internalCostNote: parsed.data.internalCostNote?.trim() || null,
    status: parsed.data.status,
  };

  const existing = await prisma.requestQuote.findFirst({
    where: { requestId: params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.requestQuote.update({ where: { id: existing.id }, data })
    : await prisma.requestQuote.create({ data: { requestId: params.id, ...data } });

  return NextResponse.json({ quote: serialize(saved) });
}
