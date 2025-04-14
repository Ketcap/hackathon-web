"use client";

import { type NodeProps } from "reactflow";

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
import { MoveIcon, Send, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AINodeSettings } from "./ai-settings";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AIProvider, useAI } from "./ai-provider";

export interface AINodeData {
  messages: Message[];
}

function AINodeBase({ id }: NodeProps<AINodeData>) {
  const [open, setOpen] = useState(false);
  const { sendMessage, messages, isRunning } = useAI();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const message = formData.get("message") as string;
    sendMessage(message);
  };
  return (
    <>
      <Card className="h-[450px] w-[500px] shadow-md">
        <CardHeader className="pb-2 ">
          <CardTitle className="text-sm font-medium">Chat</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" className="drag-handle">
              <MoveIcon />
            </Button>
            <Button onClick={() => setOpen(true)} variant="ghost" size="sm">
              <SettingsIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="h-[100%] flex flex-col justify-between">
          <form
            onSubmit={handleSubmit}
            className="h-[100%] flex flex-col justify-between"
          >
            <ScrollArea className="w-[100%] h-[280px] pr-4">
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
                        {message.messageType === "user" ? "User" : "AI"}
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
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                name="message"
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button size="icon" type="submit" disabled={isRunning}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <AINodeSettings open={open} onOpenChange={setOpen} nodeId={id} />
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
