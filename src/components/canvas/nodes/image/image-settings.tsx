"use client";

import { useCallback, useState } from "react";
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
  const {
    updateConfig,
    config,
    isRunning,
    models,
    selectedModel,
    setSelectedModel,
  } = useImage();

  const selectedModelConfig = models.find(
    (model) => model.id === selectedModel
  ) || { options: {} };
  const [localConfig, setLocalConfig] = useState({
    model: config.model,
    aspect_ratio: config.aspect_ratio,
    style: config.style,
    image_size: config.image_size,
  });

  const handleOptionChange = useCallback((key: string, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateNodeData = useCallback(() => {
    updateConfig(localConfig);
    updateNodeSettings(nodeId, localConfig);

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...localConfig,
            },
          };
        }
        return node;
      })
    );

    onOpenChange(false);
  }, [nodeId, setNodes, onOpenChange, updateConfig, localConfig]);

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
              value={selectedModel.toString()}
              onValueChange={(value) => {
                setSelectedModel(value);
                setLocalConfig({
                  ...localConfig,
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
              localConfig[key as keyof typeof localConfig] || options[0];

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
