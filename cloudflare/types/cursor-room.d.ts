export interface CursorJoinInput {
  type: "join";
  id: string;
  username: string;
}

export interface CursorJoinBroadCast {
  type: "join";
  id: string;
  username: string;
}

export interface CursorUpdateInput {
  type: "cursor-update";
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export interface CursorUpdateBroadCast {
  type: "cursor-update";
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export interface CursorLeaveBroadCast {
  type: "cursor-leave";
  id: string;
}

interface NodePositionBroadcast {
  type: "node-position";
  nodeId: string;
  position: { x: number; y: number };
}
