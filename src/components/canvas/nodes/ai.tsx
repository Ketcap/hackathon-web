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
import { Send, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AINodeSettings, AINodeSettingsProps } from "./ai-settings";
import { useState } from "react";
import { Input } from "@/components/ui/input";
interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
}

export interface AINodeData {
  messages: Message[];
  settings: AINodeSettingsProps["data"];
}

export function AINode({ data, id }: NodeProps<AINodeData>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="h-[450px] w-[500px] shadow-md">
        <CardHeader className="pb-2 ">
          <CardTitle className="text-sm font-medium">Chat</CardTitle>
          <CardAction>
            <Button onClick={() => setOpen(true)} variant="ghost" size="sm">
              <SettingsIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="h-[100%] flex flex-col justify-between">
          <ScrollArea className="w-[100%] h-[100%]pr-4">
            <div className="flex flex-col gap-3">
              {(data.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.sender === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        message.sender === "bot"
                          ? "/placeholder.svg?height=32&width=32"
                          : undefined
                      }
                      alt={message.sender}
                    />
                    <AvatarFallback>
                      {message.sender === "user" ? "U" : "B"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input placeholder="Type your message..." className="flex-1" />
            <Button size="icon" type="button">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <AINodeSettings
        open={open}
        onOpenChange={setOpen}
        nodeId={id}
        data={data.settings}
      />
    </>
  );
}
