"use server";

import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NodeType } from "@prisma/client";
import { AINodeSettings } from "@/components/canvas/nodes/types";
import { JsonObject } from "@prisma/client/runtime/library";

export async function createNode(
  roomId: string,
  type: NodeType,
  position: { x: number; y: number }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const node = await prisma.node.create({
      data: {
        name: `${type} Node`,
        posX: Math.round(position.x),
        posY: Math.round(position.y),
        type,
        creatorId: user.id,
        roomId,
      },
    });

    revalidatePath(`/room/${roomId}`);
    return { success: true, node };
  } catch (error) {
    console.error("Error creating node:", error);
    return { success: false, error: "Failed to create node" };
  }
}

export async function updateNodeSettings(
  nodeId: string,
  settings: AINodeSettings
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const node = await prisma.node.update({
    where: { id: nodeId },
    data: {
      settings: settings as unknown as JsonObject,
    },
  });

  return { success: true, node };
}
