import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "checkupp_web_session";

const hasSession = (request: NextRequest) => request.cookies.get(SESSION_COOKIE)?.value === "1";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionActive = hasSession(request);

  if (pathname.startsWith("/app") && !sessionActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/auth/sign-in") && sessionActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/auth/sign-in"],
};
