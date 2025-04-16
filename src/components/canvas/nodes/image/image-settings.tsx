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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateNodeSettings } from "@/app/actions/node";
import { useImage } from "./image-provider";

export interface ImageNodeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
}

export function ImageNodeSettings({
  open,
  onOpenChange,
  nodeId,
}: ImageNodeSettingsProps) {
  const { setNodes } = useReactFlow();
  const { updateConfig, config, setConfig, isRunning, models } = useImage();

  const selectedModelConfig = models.find(
    (model) => model.id === config.model
  ) || { options: {} };

  const handleOptionChange = useCallback((key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateNodeData = useCallback(() => {
    setConfig(config);
    updateConfig(config);
    updateNodeSettings(nodeId, { ...config });

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...config,
            },
          };
        }
        return node;
      })
    );

    onOpenChange(false);
  }, [nodeId, setNodes, onOpenChange, setConfig, config, updateConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Image Generation Settings</DialogTitle>
          <DialogDescription>
            Configure your image generation settings. Click save when
            you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateNodeData();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              name="model"
              value={config.model}
              onValueChange={(value) => {
                setConfig({
                  ...config,
                  model: value,
                });
              }}
            >
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model, index) => (
                  <SelectItem key={index} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.entries(selectedModelConfig.options).map(([key, value]) => {
            const options = value.split(",").map((opt) => opt.trim());
            const currentValue =
              config[key as keyof typeof config] || options[0];

            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {key.replace(/_/g, " ").toUpperCase()}
                </Label>
                <Select
                  name={key}
                  value={currentValue}
                  onValueChange={(value) => handleOptionChange(key, value)}
                >
                  <SelectTrigger id={key} className="w-full">
                    <SelectValue
                      placeholder={`Select ${key.replace(/_/g, " ")}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

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
