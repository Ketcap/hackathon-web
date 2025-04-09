import { getSupabaseMiddleware } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This should match the secret in your .env file
const SYNC_SECRET =
  process.env.SYNC_SECRET || "default-secret-do-not-use-in-production";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next({
    request,
  });
  const { user } = await getSupabaseMiddleware(request, res);

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

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
