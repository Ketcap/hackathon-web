import { streamText, smoothStream, CoreMessage } from "ai";
import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { createGroq, groq, GroqProvider } from "@ai-sdk/groq";

import { BasicDurableObject } from "./basic";

interface Message {
  id: number;
  message: string;
  messageType: string;
  timestamp: Date;
}

export class AIRoom extends BasicDurableObject {
  // sql: SqlStorage;
  isRunning = false;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    prompt: string;
  } = {
    model: "openai:o3-mini",
    temperature: 0.5,
    maxTokens: 1000,
    prompt: "",
  };
  openAIProvider: OpenAIProvider;
  groqProvider: GroqProvider;

  messages: Message[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    console.log("AI Room constructor");

    this.openAIProvider = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    this.groqProvider = createGroq({
      apiKey: env.GROQ_API_KEY,
    });

    // this.sql = ctx.storage.sql;

    // this.sql.exec(`
    //   CREATE TABLE IF NOT EXISTS messages (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     message TEXT NOT NULL,
    //     messageType TEXT NOT NULL,
    //     timestamp TEXT DEFAULT (datetime('now'))
    //   );`);

    console.log("AI Room initialized");
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = (await this.ctx.storage.get("messages")) as Message[];
      // After initialization, future reads do not need to access storage.
      this.messages = stored || [];
    });
  }

  handleJoin(event: MessageEvent, server: WebSocket) {
    // const chatHistory = this.sql
    //   .exec(
    //     `
    //   SELECT * FROM messages ORDER BY timestamp DESC
    // `
    //   )
    //   .toArray();

    server.send(
      JSON.stringify({
        type: "chat-history",
        messages: this.messages,
      })
    );
    server.send(
      JSON.stringify({
        type: "status",
        isRunning: this.isRunning,
      })
    );
    server.send(
      JSON.stringify({
        type: "config",
        config: this.config,
      })
    );
  }

  handleDisconnect(_: WebSocket) {
    console.log("Client disconnected");
  }

  async handleMessage(event: MessageEvent, server: WebSocket) {
    const data = JSON.parse(event.data);

    console.log("AI Room handleMessage", data);

    if (data.type === "config") {
      this.config = data.config;
      this.broadcast({
        type: "config",
        config: this.config,
      });
    }

    if (data.type === "message") {
      console.log("AI Room handleMessage message", data);
      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      // const userMessage = this.sql
      //   .exec(
      //     `
      //   INSERT INTO messages (message, messageType) VALUES (?, ?)
      // `,
      //     [data.message, "user"]
      //   )
      //   .toArray();
      const message = {
        id: this.messages.length + 1,
        message: data.message,
        messageType: data.messageType,
        timestamp: new Date(),
      };
      this.messages.push(message);

      this.broadcast({
        type: "message",
        id: message.id,
        message: message.message,
        messageType: message.messageType,
        timestamp: message.timestamp,
      });

      this.broadcast({
        type: "status",
        isRunning: this.isRunning,
      });

      try {
        const [provider, model] = this.config.model.split(":");

        // Insert initial AI message to get an ID
        // const aiMessage = this.sql
        //   .exec(`INSERT INTO messages ( message, messageType) VALUES (?, ?)`, [
        //     "",
        //     "assistant",
        //   ])
        //   .toArray();
        const aiMessage = {
          id: this.messages.length + 1,
          message: "",
          messageType: "assistant",
          timestamp: new Date(),
        };
        this.messages.push(aiMessage);

        const messageId = aiMessage.id;
        let accumulatedText = "";
        let lastSaveTime = Date.now();

        const mappedMessages = this.messages.map((message) => ({
          role: message.messageType === "user" ? "user" : "assistant",
          content: message.message,
        })) satisfies CoreMessage[];

        this.broadcast({
          type: "message",
          id: messageId,
          message: "",
          messageType: "assistant",
          timestamp: new Date().toISOString(),
        });

        const { textStream } = streamText({
          experimental_transform: smoothStream(),
          model:
            provider === "openai"
              ? this.openAIProvider(model)
              : this.groqProvider(model),
          messages: [
            { role: "system", content: this.config.prompt },
            ...mappedMessages,
          ],
          onFinish: ({ text }) => {
            this.isRunning = false;

            // Final save to DB
            // this.sql.exec(`UPDATE messages SET message = ? WHERE id = ?`, [
            //   text,
            //   messageId,
            // ]);
            this.messages[messageId - 1].message = text;

            this.broadcast({
              type: "message",
              id: messageId,
              message: text,
              messageType: "assistant",
              timestamp: new Date().toISOString(),
            });

            // Broadcast final state
            this.broadcast({
              type: "status",
              isRunning: false,
            });
          },
          onError: (error) => {
            console.log(error);
            this.isRunning = false;
            this.broadcast({
              type: "status",
              isRunning: false,
            });
          },
        });

        for await (const chunk of textStream) {
          accumulatedText += chunk;

          // Send chunk with message ID
          this.broadcast({
            type: "chunk",
            id: messageId,
            content: chunk,
          });

          // Save to DB every 100ms
          const now = Date.now();
          if (now - lastSaveTime >= 100) {
            // this.sql.exec(`UPDATE messages SET message = ? WHERE id = ?`, [
            //   accumulatedText,
            //   messageId,
            // ]);
            this.messages[messageId - 1].message = accumulatedText;
            lastSaveTime = now;
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
}
