"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MessageSquare, Image, Video, Mic, FileText } from "lucide-react";
import { NodeType } from "@prisma/client";

interface CanvasContextMenuProps {
  onNodeCreate: (type: NodeType) => void;
  children: React.ReactNode;
}

export function CanvasContextMenu({
  onNodeCreate,
  children,
}: CanvasContextMenuProps) {
  const handleNodeCreate = (type: NodeType) => {
    onNodeCreate(type);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => handleNodeCreate(NodeType.Chat)}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Chat Node
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleNodeCreate(NodeType.Image)}
          className="flex items-center gap-2"
        >
          <Image className="h-4 w-4" />
          Image Node
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleNodeCreate(NodeType.Video)}
          className="flex items-center gap-2"
        >
          <Video className="h-4 w-4" />
          Video Node
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleNodeCreate(NodeType.Voice)}
          className="flex items-center gap-2"
        >
          <Mic className="h-4 w-4" />
          Voice Node
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleNodeCreate(NodeType.Doc)}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Document Node
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
