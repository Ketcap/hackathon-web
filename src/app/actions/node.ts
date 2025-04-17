"use server";

import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NodeType } from "@prisma/client";

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

export async function updateNodePosition(
  nodeId: string,
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
    const node = await prisma.node.update({
      where: { id: nodeId },
      data: {
        posX: Math.round(position.x),
        posY: Math.round(position.y),
      },
    });

    return { success: true, node };
  } catch (error) {
    console.error("Error updating node position:", error);
    return { success: false, error: "Failed to update node position" };
  }
}

export async function updateNodeSettings(
  nodeId: string,
  settings: Record<string, string | number | boolean>
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const node = await prisma.node.update({
    where: {
      id: nodeId,
    },
    data: {
      settings: { ...settings },
    },
  });

  return { success: true, node };
}

export async function deleteNode(nodeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.node.delete({
      where: {
        id: nodeId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting node:", error);
    return { success: false, error: "Failed to delete node" };
  }
}
