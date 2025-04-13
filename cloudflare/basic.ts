import { DurableObject } from "cloudflare:workers";

export abstract class BasicDurableObject extends DurableObject<Env> {
  protected sessions: Map<WebSocket, string>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();
  }

  abstract handleMessage(event: MessageEvent, server: WebSocket): void;

  abstract handleDisconnect(websocket: WebSocket): void;

  abstract handleJoin(event: MessageEvent, server: WebSocket): void;

  // Handle incoming requests to the Durable Object
  async fetch(request: Request): Promise<Response> {
    console.log("BasicDurableObject fetch");
    // Accept the WebSocket
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Set up event handlers for the WebSocket
      server.accept();

      server.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "join") {
          this.sessions.set(server, data.id);
          if (this.handleJoin) {
            this.handleJoin(event, server);
          }
        }
        this.handleMessage(event, server);
      });

      server.addEventListener("close", () => {
        this._handleDisconnect(server);
        if (this.handleDisconnect) {
          this.handleDisconnect(server);
        }
      });

      server.addEventListener("error", () => {
        this._handleDisconnect(server);
        if (this.handleDisconnect) {
          this.handleDisconnect(server);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Expected WebSocket", { status: 400 });
  }

  _handleDisconnect(websocket: WebSocket) {
    const userId = this.sessions.get(websocket);

    if (userId) {
      this.sessions.delete(websocket);
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
