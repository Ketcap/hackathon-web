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

interface NodeAddBroadcast {
  type: "node-add";
  node: {
    id: string;
    type: string; // Using string here for simplicity, adjust if needed
    posX: number;
    posY: number;
    name: string;
  };
}

interface NodeRemoveBroadcast {
  type: "node-remove";
  nodeId: string;
}
