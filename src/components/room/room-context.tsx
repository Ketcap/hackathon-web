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
  NodeAddBroadcast,
  NodeRemoveBroadcast,
} from "../../../cloudflare/types/cursor-room";
import { NodeType, Node as PrismaNode } from "@prisma/client";

export interface NodeData {
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
  lastNodeUpdate: NodePositionBroadcast | null;
  handleNodeAdd: (node: PrismaNode) => void;
  handleNodeRemove: (nodeId: string) => void;
  lastNodeAdd: NodeAddBroadcast | null;
  lastNodeRemove: NodeRemoveBroadcast | null;
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
  const [lastNodeUpdate, setLastNodeUpdate] =
    useState<NodePositionBroadcast | null>(null);
  const [lastNodeAdd, setLastNodeAdd] = useState<NodeAddBroadcast | null>(null);
  const [lastNodeRemove, setLastNodeRemove] =
    useState<NodeRemoveBroadcast | null>(null);

  const handleMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === "join") {
      const joinCursor = data as unknown as CursorJoinBroadCast;
      setIdNames((prev) => ({
        ...prev,
        [joinCursor.id]: {
          name: joinCursor.username,
          color: ghibliColors[Math.floor(Math.random() * ghibliColors.length)],
        },
      }));
      toast.success(`${joinCursor.username} joined the room`);
    } else if (data.type === "cursor-update" && data.id) {
      const cursor = data as unknown as CursorUpdateBroadCast;
      setCursors((prev) => ({
        ...prev,
        [cursor.id]: {
          ...cursor,
        },
      }));
    } else if (data.type === "cursor-leave") {
      const leaveCursor = data as unknown as CursorLeaveBroadCast;
      setCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[leaveCursor.id];
        return newCursors;
      });
      setIdNames((prev) => {
        const newIdNames = { ...prev };
        if (newIdNames[leaveCursor.id]) {
          toast.success(`${newIdNames[leaveCursor.id].name} left the room`);
          delete newIdNames[leaveCursor.id];
        }
        return newIdNames;
      });
    } else if (data.type === "node-position") {
      const update = data as unknown as NodePositionBroadcast;
      setLastNodeUpdate(update);
    } else if (data.type === "node-add") {
      const addData = data as unknown as NodeAddBroadcast;
      setLastNodeAdd(addData);
    } else if (data.type === "node-remove") {
      const removeData = data as unknown as NodeRemoveBroadcast;
      setLastNodeRemove(removeData);
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
      sendMessage(joinMessage as unknown as WebSocketMessage);
    },
  });

  const handleNodePositionChange = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const update: NodePositionBroadcast = {
        type: "node-position",
        nodeId,
        position,
      };
      sendMessage(update as unknown as WebSocketMessage);
    },
    [sendMessage]
  );

  const handleNodeAdd = useCallback(
    (node: PrismaNode) => {
      const message: NodeAddBroadcast = {
        type: "node-add",
        node: {
          id: node.id,
          type: node.type,
          posX: node.posX,
          posY: node.posY,
          name: node.name,
        },
      };
      sendMessage(message as unknown as WebSocketMessage);
    },
    [sendMessage]
  );

  const handleNodeRemove = useCallback(
    (nodeId: string) => {
      const message: NodeRemoveBroadcast = {
        type: "node-remove",
        nodeId,
      };
      sendMessage(message as unknown as WebSocketMessage);
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
        lastNodeUpdate,
        handleNodeAdd,
        handleNodeRemove,
        lastNodeAdd,
        lastNodeRemove,
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
