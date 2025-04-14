import { BasicDurableObject } from "./basic";
// This file would be deployed to Cloudflare Workers

interface CursorData {
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  color: string;
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
export class CursorRoom extends BasicDurableObject {
  cursors: Record<string, CursorData> = {};

  colorAssignments = new Map<string, string>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

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

  handleJoin(event: MessageEvent, server: WebSocket) {
    const data = JSON.parse(event.data);

    const userId = data.userId;
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

        // Send current cursor state to the new client
        server.send(
          JSON.stringify({
            type: "cursors-state",
            cursors: this.cursors,
            yourColor: color, // Send the user their assigned color
          })
        );
      } else if (data.type === "cursor-update") {
        const cursorData = {
          id: data.userId,
          x: data.x,
          y: data.y,
          canvasX: data.canvasX,
          canvasY: data.canvasY,
          color: this.getColorForUser(data.userId), // Add color to cursor data
        };

        // Broadcast to all clients except sender
        this.broadcast(
          {
            type: "cursor-update",
            ...cursorData,
          },
          server
        );
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
      delete this.cursors[userId];

      // Notify other clients that this user left
      this.broadcast({
        type: "cursor-leave",
        userId,
      });

      this.ctx.storage.put("cursors", this.cursors);
    }
  }
}
