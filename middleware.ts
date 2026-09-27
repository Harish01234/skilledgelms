import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Node.js runtime (not the default Edge runtime) — needed because
// auth.api.getSession() goes through Better Auth's Prisma adapter,
// which requires a real database driver, not something Edge supports.
export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthed = Boolean(session?.user);
  const isAdmin = session?.user?.role === "admin";
  const homeFor = (admin: boolean) => (admin ? "/admin" : "/dashboard");

  // 0. "/" is blocked outright for everyone — always bounce to /signin,
  //    signed in or not. The actual entry-point logic lives below.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // 1. "/signin" is the entry point. A signed-in user never sees it —
  //    they get sent straight to their real home page.
  if (pathname === "/signin") {
    if (isAuthed) {
      return NextResponse.redirect(new URL(homeFor(isAdmin), request.url));
    }
    return NextResponse.next();
  }

  // 2. Anything else under /dashboard or /admin requires a session at all
  if (!isAuthed) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // 3. Role gating — a user can't wander into /admin, and an admin
  //    visiting /dashboard gets sent to their own home instead
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/signin", "/dashboard/:path*", "/admin/:path*"],
};