import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return await cookieStore.getAll();
        },
        async setAll(cookies) {
          cookies.forEach((cookie) => {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          });
        },
      },
    }
  );
}

export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookies) {
          cookies.forEach((cookie) => {
            res.cookies.set({
              name: cookie.name,
              value: cookie.value,
              ...cookie.options,
            });
          });
        },
      },
    }
  );
}
