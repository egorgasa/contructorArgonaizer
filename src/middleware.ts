import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, expectedAuthCookie } from "@/lib/admin-auth";

/**
 * Edge middleware that gates admin pages and admin-only API routes behind a
 * shared password cookie. If ADMIN_PASSWORD is unset, the middleware is a
 * no-op (useful for local dev where you don't want to bother with login).
 */
export async function middleware(req: NextRequest) {
  const expected = await expectedAuthCookie();
  if (!expected) return NextResponse.next();

  const provided = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (provided === expected) return NextResponse.next();

  const url = req.nextUrl;
  const isApi = url.pathname.startsWith("/api/");

  if (isApi) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  // Redirect HTML routes to /admin/login with a ?next= back-link.
  const login = new URL("/admin/login", url);
  if (url.pathname !== "/admin/login") {
    login.searchParams.set("next", `${url.pathname}${url.search}`);
  }
  return NextResponse.redirect(login);
}

export const config = {
  // Protect:
  //   /admin/*           — except /admin/login itself
  //   /api/requests/[id]/status   — admin status changes
  //   /api/requests/[id]/notes    — admin notes
  //   /api/requests/[id]/quote    — admin quote / estimate
  //   /api/requests (GET listing) — admin list view
  //
  // Public endpoints that are NOT matched here:
  //   POST /api/requests, POST /api/requests/[id]/files, GET /api/requests/[id]/files/[fileId]
  //   (clients in the constructor must remain able to submit and upload).
  matcher: [
    "/admin/((?!login).*)",
    "/admin",
    "/api/requests/:id/status",
    "/api/requests/:id/notes",
    "/api/requests/:id/quote",
  ],
};
