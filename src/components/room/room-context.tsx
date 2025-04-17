"use client";

import {
  createContext,
  useContext,
  useCallback,
  ReactNode,
  useState,
} from "react";
import {
  useWebSocketConnection,
  type WebSocketMessage,
} from "@/hooks/useWebSocketConnection";
import { toast } from "sonner";
import {
  CursorJoinBroadCast,
  CursorLeaveBroadCast,
  CursorUpdateBroadCast,
  NodePositionBroadcast,
} from "../../../cloudflare/types/cursor-room";
import { Node } from "reactflow";
import { NodeType } from "@prisma/client";

interface NodeData {
  label: string;
  type: NodeType;
}

interface CursorPosition {
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

interface RoomContextType {
  cursors: Record<string, CursorPosition>;
  idNames: Record<string, { name: string; color: string }>;
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
  handleNodePositionChange: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

const ghibliColors = [
  "#7CA9E6", // Sky Blue
  "#D56D5A", // Forest Red
  "#8BC28A", // Totoro Pasture
  "#E6A4B4", // Chihiro Rose
  "#F0A868", // Calcifer's Ember
  "#5D9B9B", // Ponyo Ocean
  "#A893C0", // Wind Lavender
  "#D8B44A", // Kiki Yellow
  "#7D9367", // Forest Moss
  "#C67D5E", // Kaguya Clay
];

interface RoomProviderProps {
  children: ReactNode;
  userId: string;
  username: string;
  roomId: string;
}

const serverUrl = "wss://canvas-ai.uoruc5.workers.dev";

export function RoomProvider({
  children,
  userId,
  roomId,
  username,
}: RoomProviderProps) {
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [idNames, setIdNames] = useState<
    Record<string, { name: string; color: string }>
  >({});

  const handleMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === "join") {
      const joinCursor = data as unknown as CursorJoinBroadCast;
      setIdNames((prev: Record<string, { name: string; color: string }>) => ({
        ...prev,
        [joinCursor.id]: {
          name: joinCursor.username,
          color: ghibliColors[Math.floor(Math.random() * ghibliColors.length)],
        },
      }));

      toast.success(`${joinCursor.username} joined the room`);
    } else if (data.type === "cursor-update" && data.id) {
      const cursor = data as unknown as CursorUpdateBroadCast;
      setCursors((prev: Record<string, CursorPosition>) => ({
        ...prev,
        [cursor.id]: {
          ...cursor,
        },
      }));
    } else if (data.type === "cursor-leave") {
      const leaveCursor = data as unknown as CursorLeaveBroadCast;

      setCursors((prev: Record<string, CursorPosition>) => {
        const newCursors = { ...prev };
        delete newCursors[leaveCursor.id];
        return newCursors;
      });
      setIdNames((prev: Record<string, { name: string; color: string }>) => {
        const newIdNames = { ...prev };
        toast.success(`${newIdNames[leaveCursor.id].name} left the room`);
        delete newIdNames[leaveCursor.id];
        return newIdNames;
      });
    } else if (data.type === "node-position") {
      // const update = data as unknown as NodePositionBroadcast;
      // setNodes((nds: Node<NodeData>[]) =>
      //   nds.map((node: Node<NodeData>) =>
      //     node.id === update.nodeId
      //       ? { ...node, position: update.position }
      //       : node
      //   )
      // );
    }
  }, []);

  const { sendMessage, isConnected } = useWebSocketConnection({
    url: `${serverUrl}/cursor?id=${roomId}`,
    onMessage: handleMessage,
    onOpen: () => {
      const joinMessage = {
        type: "join",
        id: userId,
        username,
      } as const;
      sendMessage(joinMessage);
    },
  });

  const handleNodePositionChange = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const update = {
        type: "node-position",
        nodeId,
        position,
      } as const;
      sendMessage(update);
    },
    [sendMessage]
  );

  return (
    <RoomContext.Provider
      value={{
        cursors,
        idNames,
        sendMessage,
        isConnected,
        handleNodePositionChange,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
