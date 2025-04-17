"use client";

import { useCallback } from "react";
import { useReactFlow } from "reactflow";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateNodeSettings } from "@/app/actions/node";
import { useAI } from "./ai-provider";

export interface AINodeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
}

const models = [
  { label: "OpenAI GPT-4.1", value: "openai:gpt-4.1" },
  { label: "OpenAI GPT-4O", value: "openai:gpt-4o" },
  { label: "OpenAI GPT-4O Mini", value: "openai:gpt-4o-mini" },
  { label: "Groq Gemma 2 9B", value: "groq:gemma2-9b-it" },
  { label: "Groq Llama 3.1 8B Instant", value: "groq:llama-3.1-8b-instant" },
  { label: "Groq Llama3 70B", value: "groq:llama3-70b-8192" },
  {
    label: "Groq Llama-4 Scout 17B",
    value: "groq:meta-llama/llama-4-scout-17b-16e-instruct",
  },
  {
    label: "Groq Llama-4 Maverick 17B",
    value: "groq:meta-llama/llama-4-maverick-17b-128e-instruct",
  },
  { label: "Groq Qwen 32B", value: "groq:qwen-qwq-32b" },
  { label: "Groq Llama 3.3 70B", value: "groq:llama-3.3-70b-specdec" },
  {
    label: "Groq DeepSeek R1 Llama 70B",
    value: "groq:deepseek-r1-distill-llama-70b",
  },
];

export function AINodeSettings({
  open,
  onOpenChange,
  nodeId,
}: AINodeSettingsProps) {
  const { setNodes } = useReactFlow();
  const { updateConfig, config, isRunning } = useAI();

  const updateNodeData = useCallback(
    (formData: FormData) => {
      const model = formData.get("model") as string;
      const temperature = Number.parseFloat(
        formData.get("temperature") as string
      );
      const systemPrompt = formData.get("systemPrompt") as string;
      const maxTokens =
        Number.parseInt(formData.get("maxTokens") as string) || 1024;

      updateConfig({
        model,
        temperature,
        maxTokens: maxTokens || 1024,
        prompt: systemPrompt,
      });

      updateNodeSettings(nodeId, {
        model,
        temperature,
        systemPrompt,
        maxTokens,
      });

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                model,
                temperature,
                systemPrompt,
                maxTokens,
              },
            };
          }
          return node;
        })
      );

      onOpenChange(false);
    },
    [nodeId, setNodes, onOpenChange, updateConfig]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Chat Settings</DialogTitle>
          <DialogDescription>
            Configure your AI chat node settings. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <form action={updateNodeData} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select name="model" defaultValue={config.model}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                name="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                defaultValue={
                  typeof config.temperature === "number"
                    ? config.temperature
                    : 0.7
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                name="maxTokens"
                type="number"
                min="1"
                max="4096"
                defaultValue={config.maxTokens || 1024}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              placeholder="Enter system prompt..."
              defaultValue={config.prompt || ""}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isRunning}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
