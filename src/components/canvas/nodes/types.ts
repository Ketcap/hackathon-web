import { NodeType } from "@prisma/client";

export type NodeSettings =
  | {
      type: NodeType.Chat;
      data: AINodeSettings;
    }
  | {
      type: NodeType.Image;
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
