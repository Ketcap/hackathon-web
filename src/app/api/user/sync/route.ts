import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const SYNC_SECRET =
  process.env.SYNC_SECRET || "default-secret-do-not-use-in-production";

export async function POST(request: Request) {
  const headersList = await headers();
  const syncToken = headersList.get("X-Sync-Token");

  // Verify the request is coming from our middleware
  if (syncToken !== SYNC_SECRET) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const userData = await request.json();

    // Try to find the user first
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userData.id,
      },
    });

    if (!existingUser) {
      // Create new user if they don't exist
      await prisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          name:
            userData.user_metadata?.full_name ||
            userData.email?.split("@")[0] ||
            "Anonymous",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
