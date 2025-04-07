import { createSupabaseMiddlewareClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This should match the secret in your .env file
const SYNC_SECRET =
  process.env.SYNC_SECRET || "default-secret-do-not-use-in-production";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = await createSupabaseMiddlewareClient(request, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Sync user data through API route
    try {
      await fetch(`${request.nextUrl.origin}/api/user/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sync-Token": SYNC_SECRET,
        },
        body: JSON.stringify(user),
      });
    } catch (error) {
      console.error("Error syncing user:", error);
    }
    return res;
  }

  // if there is no user and they're trying to access a protected route,
  // redirect them to the home page
  if (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/room")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
