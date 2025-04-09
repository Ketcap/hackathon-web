import { DurableObject } from "cloudflare:workers";
// This file would be deployed to Cloudflare Workers

interface CursorData {
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  color: string;
}

interface NodeData {
  id: string;
  position: {
    x: number;
    y: number;
  };
}

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

// Define the Durable Object class
export class CursorRoom extends DurableObject<Env> {
  sessions = new Map();

  cursors: Record<string, CursorData>;

  nodes = [];

  colorAssignments = new Map<string, string>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.cursors = {};

    // Store connected WebSockets and cursor positions

    // Handle when a client disconnects
    ctx.blockConcurrencyWhile(async () => {
      // Load any stored data
      const stored = (await ctx.storage.get("cursors")) as Record<
        string,
        CursorData
      >;
      this.cursors = stored ?? {};

      // Load color assignments
      const storedColors = (await ctx.storage.get("colorAssignments")) as Map<
        string,
        string
      >;
      this.colorAssignments = storedColors ?? new Map<string, string>();

      // Load React Flow state
      const storedNodes = (await ctx.storage.get("nodes")) as Record<
        string,
        NodeData
      >;
      this.nodes = storedNodes ?? [];
    });
  }

  // Get a color for a user
  getColorForUser(userId: string): string {
    // If user already has a color, return it
    if (this.colorAssignments.has(userId)) {
      return this.colorAssignments.get(userId)!;
    }

    // Find colors not in use
    const usedColors = new Set(this.colorAssignments.values());
    const availableColors = ghibliColors.filter(
      (color) => !usedColors.has(color)
    );

    // If we have available colors, pick one randomly
    let color;
    if (availableColors.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      color = availableColors[randomIndex];
    } else {
      // If all colors are used, pick a random one from the full set
      const randomIndex = Math.floor(Math.random() * ghibliColors.length);
      color = ghibliColors[randomIndex];
    }

    // Assign and store the color
    this.colorAssignments.set(userId, color);

    // Persist color assignments
    this.ctx.storage.put("colorAssignments", this.colorAssignments);

    return color;
  }

  // Handle incoming requests to the Durable Object
  async fetch(request: Request) {
    // Accept the WebSocket
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Set up event handlers for the WebSocket
      server.accept();

      server.addEventListener("message", (event) =>
        this.handleMessage(event, server)
      );

      server.addEventListener("close", () => {
        this.handleDisconnect(server);
      });

      server.addEventListener("error", () => {
        this.handleDisconnect(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Expected WebSocket", { status: 400 });
  }

  handleMessage(event: MessageEvent, server: WebSocket) {
    try {
      const data = JSON.parse(event.data);

      let userId = null;

      if (data.type === "join") {
        userId = data.userId;
        this.sessions.set(server, userId);
        // Assign a color to this user
        const color = this.getColorForUser(userId);

        // Make sure all cursors have colors
        for (const id in this.cursors) {
          if (!this.cursors[id].color) {
            this.cursors[id].color = this.getColorForUser(id);
          }
        }

        // Send current cursor state to the new client
        server.send(
          JSON.stringify({
            type: "cursors-state",
            cursors: this.cursors,
            yourColor: color, // Send the user their assigned color
          })
        );

        console.log(`User ${userId} joined`);
      } else if (data.type === "cursor-update") {
        const cursorData = {
          id: data.userId,
          x: data.x,
          y: data.y,
          canvasX: data.canvasX,
          canvasY: data.canvasY,
          color: this.getColorForUser(data.userId), // Add color to cursor data
        };
        // Update cursor position
        this.cursors[data.userId] = cursorData;

        // Broadcast to all clients except sender
        this.broadcast(
          {
            type: "cursor-update",
            ...cursorData,
          },
          server
        );

        // Persist cursor positions
        await this.ctx.storage.put("cursors", this.cursors);
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
      this.sessions.delete(websocket);
      delete this.cursors[userId];

      // Notify other clients that this user left
      this.broadcast({
        type: "cursor-leave",
        userId,
      });

      console.log(`User ${userId} left`);

      // Update storage
      this.ctx.storage.put("cursors", this.cursors);
    }
  }

  // Broadcast a message to all connected clients
  broadcast(message: unknown, exclude: WebSocket | null = null) {
    const serialized = JSON.stringify(message);

    for (const [client] of this.sessions) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }
}

// Worker script to route requests to the Durable Object
// eslint-disable-next-line
export default {
  async fetch(request: Request, env: Env) {
    // Extract the room ID from the request URL
    const url = new URL(request.url);

    // Get the room ID from the 'id' query parameter, or use 'default-room' as fallback
    const roomId = url.searchParams.get("id") || "default-room";

    // Get the Durable Object stub for the cursor room using the provided room ID
    const id = env.CURSOR_ROOM.idFromName(roomId);
    const room = env.CURSOR_ROOM.get(id);

    // Forward the request to the Durable Object
    return room.fetch(request);
  },
};

// Define the Durable Object binding
export { CursorRoom as DurableObject };
