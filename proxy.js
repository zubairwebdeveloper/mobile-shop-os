import { NextResponse } from "next/server";

export function proxy(request) {
  // Temporary development authentication bypass
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_PLATFORM_ADMIN === "true"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("msos_session")?.value;

  const protectedRoutes = ["/dashboard", "/platform"];

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`),
  );

  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*"],
};
