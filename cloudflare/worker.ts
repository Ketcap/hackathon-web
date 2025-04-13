export { CursorRoom } from "./cursor-room";
export { AIRoom } from "./ai-room";

interface Env {
  CURSOR_ROOM: DurableObjectNamespace;
  AI_ROOM: DurableObjectNamespace;
}

// eslint-disable-next-line
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const roomId = url.searchParams.get("id");

    if (!roomId) {
      return new Response("No room ID provided", { status: 400 });
    }

    // Route based on the path
    if (path.startsWith("/ai")) {
      // Route to AI Room
      const id = env.AI_ROOM.idFromName(roomId);
      const room = env.AI_ROOM.get(id);
      return room.fetch(request);
    }
    if (path.startsWith("/cursor")) {
      // Default to Cursor Room
      const id = env.CURSOR_ROOM.idFromName(roomId);
      const room = env.CURSOR_ROOM.get(id);
      return room.fetch(request);
    }

    return new Response("Welcome to the AI Room", { status: 200 });
  },
};
