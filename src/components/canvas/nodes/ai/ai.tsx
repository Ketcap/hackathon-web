"use client";

import { type NodeProps } from "reactflow";
import { useRef, useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MoveIcon, Send, SettingsIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AINodeSettings } from "./ai-settings";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AIProvider, useAI } from "./ai-provider";
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
import { deleteNode } from "@/app/actions/node";
import { useReactFlow } from "reactflow";
import { toast } from "sonner";

export interface AINodeData {
  messages: Message[];
}

function AINodeBase({ id }: NodeProps<AINodeData>) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { sendMessage, messages, isRunning } = useAI();
  const { setNodes } = useReactFlow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(message);
    setMessage("");
  };

  const handleDelete = async () => {
    try {
      const result = await deleteNode(id);
      if (result.success) {
        setNodes((nds) => nds.filter((node) => node.id !== id));
        toast.success("Node deleted successfully");
      } else {
        toast.error("Failed to delete node");
      }
    } catch (error) {
      console.error("Error deleting node:", error);
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <Card className="h-[600px] w-[500px] shadow-md">
        <CardHeader className="pb-2 ">
          <CardTitle className="text-sm font-medium">Chat</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" className={"drag-handle"}>
              <MoveIcon />
            </Button>
            <Button onClick={() => setOpen(true)} variant="ghost" size="sm">
              <SettingsIcon />
            </Button>
            <Button
              onClick={() => setDeleteOpen(true)}
              variant="ghost"
              size="sm"
            >
              <Trash2 className="text-destructive" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="h-[100%] flex flex-col justify-between">
          <form
            onSubmit={handleSubmit}
            className="h-[100%] flex flex-col justify-between"
          >
            <ScrollArea className="w-[100%] h-[450px] pr-4" ref={scrollRef}>
              <div className="flex flex-col gap-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.messageType === "user"
                        ? "flex-row-reverse"
                        : "flex-row"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} alt={message.messageType} />
                      <AvatarFallback>
                        {message.messageType === "user" ? "U" : "AI"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        message.messageType === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.message}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                name="message"
                placeholder="Type your message..."
                className="flex-1"
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
      <AINodeSettings open={open} onOpenChange={setOpen} nodeId={id} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              node and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const AINode = (props: NodeProps<AINodeData>) => (
  <AIProvider
    roomId={props.id}
    serverUrl={`wss://canvas-ai.uoruc5.workers.dev`}
    // serverUrl={`wss://localhost:8787`}
  >
    <AINodeBase {...props} />
  </AIProvider>
);
