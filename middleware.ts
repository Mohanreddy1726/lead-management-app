import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;
  const isAuth = !!token;
  const isLoginPage = pathname === "/login";

  // If already authenticated and visiting /login, redirect to /dashboard
  if (isLoginPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // If visiting root URL '/'
  if (pathname === "/") {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // For protected routes, if not authenticated, redirect to /login
  if (!isAuth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/leads/:path*",
    "/team/:path*",
    "/follow-ups/:path*",
    "/calls/:path*",
    "/counselling/:path*",
    "/applications/:path*",
    "/admissions/:path*",
    "/operations/:path*",
    "/assignment/:path*",
    "/campaigns/:path*",
    "/sources/:path*",
    "/analytics/:path*",
    "/campaign-analytics/:path*",
    "/telecaller-analytics/:path*",
    "/roi-analysis/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/automation/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/choose-role/:path*",
  ],
};
