import { createSupabaseServerClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { CopyInvitation } from "@/components/room/copy-invitation";
import InfiniteCanvasWrapper from "@/components/room/infinite-canvas";
import ReactFlowCursorTracker from "@/components/canvas/cursors";
import { PersistentViewport } from "@/components/canvas/usePersistentViewport";

type RoomWithRelations = Prisma.RoomGetPayload<{
  include: {
    Creator: true;
    Participants: true;
    Nodes: true;
  };
}>;

interface ExtendedRoomData extends RoomWithRelations {
  isCreator: boolean;
  isParticipant: boolean;
}

async function getRoomData(
  roomId: string,
  userId: string
): Promise<ExtendedRoomData | null> {
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
    include: {
      Creator: true,
      Participants: true,
      Nodes: true,
    },
  });

  if (!room) {
    return null;
  }

  // Check if user is authorized to view this room
  const isCreator = room.creatorId === userId;
  const isParticipant = room.Participants.some((p) => p.id === userId);

  if (!isCreator && !isParticipant) {
    return null;
  }

  return {
    ...room,
    isCreator,
    isParticipant,
  } as ExtendedRoomData;
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const roomData = await getRoomData(id, user.id);

  if (!roomData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="absolute top-9 left-9 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-md border   px-3 py-1.5 ">
          <h2 className="text-lg font-semibold">{roomData.name}</h2>
          <CopyInvitation invitationCode={roomData.invitationCode} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Canvas area */}
          <div className="flex-1 relative">
            <InfiniteCanvasWrapper roomId={id} initialNodes={roomData.Nodes}>
              {/* Add your canvas content here */}
              <PersistentViewport roomId={id} />
              <ReactFlowCursorTracker
                userId={user.id}
                roomId={id}
                serverUrl={`wss://canvas-ai.uoruc5.workers.dev`}
                // serverUrl={`wss://localhost:8787`}
              />
            </InfiniteCanvasWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
