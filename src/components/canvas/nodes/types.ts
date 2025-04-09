import { NodeType } from "@prisma/client";

export type NodeSettings =
  | {
      type: typeof NodeType.Chat;
      data: AINodeSettings;
    }
  | {
      type: typeof NodeType.Image;
      data: ImageNodeSettings;
    };

export interface AINodeSettings {
  model: string;
  temperature: number;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface ImageNodeSettings {
  prompt: string;
  size: {
    width: number;
    height: number;
  };
}
