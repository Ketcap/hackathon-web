"use server";

import prisma from "@/lib/prisma";
import { User } from "@supabase/supabase-js";

export async function syncUser(supabaseUser: User) {
  try {
    // Try to find the user first
    const existingUser = await prisma.user.findUnique({
      where: {
        id: supabaseUser.id,
      },
    });
    console.log("existingUser", existingUser);
    if (!existingUser) {
      // Create new user if they don't exist
      await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split("@")[0] ||
            "Anonymous",
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing user:", error);
    return { success: false, error: "Failed to sync user" };
  }
}
