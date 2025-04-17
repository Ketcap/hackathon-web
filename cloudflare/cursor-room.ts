import { BasicDurableObject } from "./basic";
import {
  CursorJoinBroadCast,
  CursorJoinInput,
  CursorLeaveBroadCast,
  CursorUpdateBroadCast,
  NodePositionBroadcast,
} from "./types/cursor-room";

// This file would be deployed to Cloudflare Workers

// Define the Durable Object class
export class CursorRoom extends BasicDurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  handleJoin(event: MessageEvent, server: WebSocket) {
    const data = JSON.parse(event.data) as CursorJoinInput;

    // Send current cursor state to the new client
    this.broadcast(
      {
        type: "join",
        id: data.id,
        username: data.username,
      } as CursorJoinBroadCast,
      server
    );
  }

  handleMessage(event: MessageEvent, server: WebSocket) {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "cursor-update") {
        const cursorUpdateData = {
          type: "cursor-update",
          id: data.id,
          x: data.x,
          y: data.y,
          canvasX: data.canvasX,
          canvasY: data.canvasY,
        } as CursorUpdateBroadCast;

        // Broadcast to all clients except sender
        this.broadcast(cursorUpdateData, server);
      } else if (data.type === "node-position") {
        const nodePositionData = {
          type: "node-position",
          nodeId: data.nodeId,
          position: data.position,
        } as NodePositionBroadcast;

        // Broadcast to all clients except sender
        this.broadcast(nodePositionData, server);
      } else if (data.type === "leave") {
        this.handleDisconnect(server);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  // Handle client disconnection
  handleDisconnect(websocket: WebSocket) {
    const userId = this.sessions.get(websocket);

    if (userId) {
      const cursorLeaveData = {
        type: "cursor-leave",
        id: userId,
      } as CursorLeaveBroadCast;

      // Notify other clients that this user left
      this.broadcast(cursorLeaveData, websocket);
    }
  }
}
