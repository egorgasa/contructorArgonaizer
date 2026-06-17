import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { printRequestSchema } from "@/lib/validations/print-request";
import { buildPublicNumber } from "@/lib/public-number";

// POST /api/requests — create a new print request from the constructor.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = printRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Generate a public number based on per-year sequence.
  const year = new Date().getUTCFullYear();
  const countThisYear = await prisma.printRequest.count({
    where: {
      createdAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
  });
  const publicNumber = buildPublicNumber(year, countThisYear + 1);

  const created = await prisma.printRequest.create({
    data: {
      publicNumber,
      status: "new",
      productType: data.productType,
      clientName: data.clientName,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      payload: JSON.stringify(data),
      statusHistory: {
        create: {
          fromStatus: "",
          toStatus: "new",
          reason: "Создание заявки",
        },
      },
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      publicNumber: created.publicNumber,
      status: created.status,
    },
    { status: 201 },
  );
}

// GET /api/requests — list requests for the admin.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const productType = searchParams.get("productType") || undefined;
  const take = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200);

  const items = await prisma.printRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(productType ? { productType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      publicNumber: true,
      status: true,
      productType: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    items: items.map((it) => ({
      ...it,
      createdAt: it.createdAt.toISOString(),
      updatedAt: it.updatedAt.toISOString(),
    })),
  });
}
