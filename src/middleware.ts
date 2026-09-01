import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isAuthPage = pathname.startsWith("/auth/");
  const isAppPage = pathname.startsWith("/dashboard") || pathname.startsWith("/org/");
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) {
    return NextResponse.next();
  }

  const isInvitePage = pathname.startsWith("/auth/accept-invite");

  if (isAuthPage && isLoggedIn && !isInvitePage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAppPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
