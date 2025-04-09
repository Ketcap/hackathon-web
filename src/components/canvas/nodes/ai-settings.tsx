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
import { AINodeSettings } from "./types";

export interface AINodeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  data: AINodeSettings;
}

export function AINodeSettings({
  open,
  onOpenChange,
  nodeId,
  data,
}: AINodeSettingsProps) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback(
    (formData: FormData) => {
      const model = formData.get("model") as string;
      const temperature = Number.parseFloat(
        formData.get("temperature") as string
      );
      const systemPrompt = formData.get("systemPrompt") as string;
      const maxTokens =
        Number.parseInt(formData.get("maxTokens") as string) || undefined;

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
    [nodeId, setNodes, onOpenChange]
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
            <Select name="model" defaultValue={data.model || "gpt-4"}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
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
                defaultValue={data.temperature || 0.7}
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
                defaultValue={data.maxTokens || 1024}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              placeholder="Enter system prompt..."
              defaultValue={data.systemPrompt || ""}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
