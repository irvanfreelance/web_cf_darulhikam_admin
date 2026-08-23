import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // If authenticated user visits /login, redirect to dashboard
    if (pathname.startsWith("/login") && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Unauthenticated API calls must fail with JSON, not an HTML redirect to
    // /login — a redirected response still resolves as 200/`res.ok`, so
    // callers doing res.json() (e.g. the @vercel/blob client upload flow)
    // get a cryptic parse failure instead of a clear auth error.
    if (pathname.startsWith("/api/") && !req.nextauth.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Always allow access to login page, api/auth routes, and API
        // routes (handled above so they get a JSON 401 instead of a redirect)
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/")
        ) {
          return true;
        }

        // All other routes require a valid token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
