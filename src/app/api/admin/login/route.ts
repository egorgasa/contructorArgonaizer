import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  isAdminProtectionEnabled,
  sha256Hex,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/login — exchange password for a session cookie.
export async function POST(req: NextRequest) {
  if (!isAdminProtectionEnabled()) {
    return NextResponse.json(
      { error: "Защита админки отключена" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const password =
    body && typeof body === "object" && "password" in body
      ? String((body as Record<string, unknown>).password ?? "")
      : "";

  if (!password) {
    return NextResponse.json({ error: "Введите пароль" }, { status: 400 });
  }

  const expected = await sha256Hex(process.env.ADMIN_PASSWORD!);
  const provided = await sha256Hex(password);

  // Constant-time-ish comparison on equal-length hex strings.
  if (!safeEqual(expected, provided)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: provided,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
