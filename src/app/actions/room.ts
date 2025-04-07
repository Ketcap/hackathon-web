"use server";

import prisma from "@/lib/prisma";
import { generateInvitationCode, generateRoomName } from "@/lib/utils/room";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRoom() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await prisma.room.create({
      data: {
        name: generateRoomName(),
        invitationCode: generateInvitationCode(),
        creatorId: session.user.id,
        Participants: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });

    revalidatePath(`/room/${room.id}`);
    return { success: true, room };
  } catch (error) {
    console.error("Error creating room:", error);
    return { success: false, error: "Failed to create room" };
  }
}

export async function joinRoom(invitationCode: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    // Find the room with the given invitation code
    // invitation code should be unique
    const room = await prisma.room.findFirst({
      where: {
        invitationCode: invitationCode,
      },
    });

    if (!room) {
      return { success: false, error: "Room not found" };
    }

    // Add user to participants
    const updatedRoom = await prisma.room.update({
      where: {
        id: room.id,
      },
      data: {
        Participants: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });

    revalidatePath(`/room/${room.id}`);
    return { success: true, room: updatedRoom };
  } catch (error) {
    console.error("Error joining room:", error);
    return { success: false, error: "Failed to join room" };
  }
}
