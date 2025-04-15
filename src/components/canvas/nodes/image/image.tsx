"use client";

import { type NodeProps } from "reactflow";
import { useEffect } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Loader2, MoveIcon, Send, SettingsIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ImageProvider, useImage } from "./image-provider";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ImageNodeSettings } from "./image-settings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ImageNodeData = object;

function ImageNodeBase({ id }: NodeProps<ImageNodeData>) {
  const [open, setOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<number>(0);
  const [message, setMessage] = useState("");
  const { generateImage, isRunning, runs } = useImage();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateImage(message);
    setMessage("");
  };

  useEffect(() => {
    if (runs.length > 0) {
      setSelectedRun(runs.length - 1);
    }
  }, [runs]);

  const isLatestImageRunning =
    isRunning &&
    runs.length > 0 &&
    runs[runs.length - 1].output === undefined &&
    selectedRun === runs.length - 1;

  return (
    <>
      <Card className="h-[450px] w-[500px] shadow-md">
        <CardHeader className="pb-2 ">
          <CardTitle className="text-sm font-medium">Image</CardTitle>
          <CardAction className="flex flex-row gap-2">
            {runs.length > 0 && (
              <Select
                onValueChange={(value) => setSelectedRun(parseInt(value))}
                value={selectedRun.toString()}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run, index) => (
                    <SelectItem key={run.id} value={index.toString()}>
                      {run.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" className="drag-handle">
              <MoveIcon />
            </Button>
            <Button onClick={() => setOpen(true)} variant="ghost" size="sm">
              <SettingsIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="h-[100%] flex flex-col justify-between">
          <AspectRatio ratio={16 / 9}>
            {isLatestImageRunning ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Image
                src={
                  runs[selectedRun]?.output ??
                  "https://placehold.co/600x400.png"
                }
                alt="Image"
                fill
                className="h-full w-full object-cover"
              />
            )}
            {runs[selectedRun] && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-2">
                      <p>
                        <strong>Model:</strong> {runs[selectedRun].modelId}
                      </p>
                      <p>
                        <strong>Prompt:</strong>{" "}
                        {runs[selectedRun].parameters.prompt}
                      </p>
                      {runs[selectedRun].parameters.aspect_ratio && (
                        <p>
                          <strong>Aspect Ratio:</strong>{" "}
                          {runs[selectedRun].parameters.aspect_ratio}
                        </p>
                      )}
                      {runs[selectedRun].parameters.style && (
                        <p>
                          <strong>Style:</strong>{" "}
                          {runs[selectedRun].parameters.style}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </AspectRatio>

          <form onSubmit={handleSubmit} className="flex flex-row ">
            <div className="flex gap-2 w-full">
              <Input
                name="message"
                placeholder="Prompt ..."
                className=""
                disabled={isRunning}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button size="icon" type="submit" disabled={isRunning}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <ImageNodeSettings open={open} onOpenChange={setOpen} nodeId={id} />
    </>
  );
}

export const ImageNode = (props: NodeProps<ImageNodeData>) => (
  <ImageProvider
    roomId={props.id}
    serverUrl={`wss://canvas-ai.uoruc5.workers.dev`}
    // serverUrl={`wss://localhost:8787`}
  >
    <ImageNodeBase {...props} />
  </ImageProvider>
);
