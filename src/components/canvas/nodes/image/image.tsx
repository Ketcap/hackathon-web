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
import {
  Loader2,
  MoveIcon,
  Send,
  SettingsIcon,
  Info,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ImageNodeData = {
  onDelete?: (nodeId: string) => void;
};

function ImageNodeBase({ id, onDelete }: NodeProps & ImageNodeData) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageDetailOpen, setImageDetailOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(id);
    }
    setDeleteOpen(false);
  };

  const handleCopyUrl = () => {
    if (runs[selectedRun]?.output) {
      navigator.clipboard.writeText(runs[selectedRun].output).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const selectedImageUrl = runs[selectedRun]?.output;

  return (
    <>
      <Card className="h-[450px] w-[500px] shadow-md">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Image</CardTitle>
          <CardAction className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              className="drag-handle cursor-grab"
            >
              <MoveIcon size={16} />
            </Button>
            <Button onClick={() => setOpen(true)} variant="ghost" size="icon">
              <SettingsIcon size={16} />
            </Button>
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </CardAction>
        </CardHeader>

        <CardContent className="h-[100%] flex flex-col justify-between">
          <AspectRatio
            ratio={16 / 9}
            className="relative cursor-pointer"
            onClick={() => selectedImageUrl && setImageDetailOpen(true)}
          >
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              node.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={imageDetailOpen} onOpenChange={setImageDetailOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader></AlertDialogHeader>
          {selectedImageUrl && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <AspectRatio ratio={16 / 9} className="w-full">
                <Image
                  src={selectedImageUrl}
                  alt="Generated Image"
                  fill
                  className="object-contain rounded-md"
                />
              </AspectRatio>
              <div className="flex w-full items-center gap-2">
                <Input
                  readOnly
                  value={selectedImageUrl}
                  className="flex-grow"
                />
                <Button onClick={handleCopyUrl} variant="outline" size="icon">
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
          <AlertDialogFooter></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const ImageNode = (props: NodeProps & ImageNodeData) => (
  <ImageProvider
    roomId={props.id}
    serverUrl={`wss://canvas-ai.uoruc5.workers.dev`}
  >
    <ImageNodeBase {...props} />
  </ImageProvider>
);
