import { NextRequest, NextResponse } from "next/server";

// Old URL to new URL mappings.
// Operational dashboard paths (dashboard/console/workflows/logs/settings) were
// moved to the product app (dashboard.aivory.id) and intentionally return
// not-found on the marketing site, so they are no longer redirected here.
const OLD_URLS: Record<string, string> = {
  "/index.html": "/",
};

/**
 * Middleware for URL redirects and backward compatibility
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for old URL redirects
  if (OLD_URLS[pathname]) {
    const redirectUrl = new URL(OLD_URLS[pathname], request.url);

    // Preserve query parameters
    redirectUrl.search = request.nextUrl.search;

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Configure which routes should run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - api routes (API endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
