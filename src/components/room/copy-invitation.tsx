"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyInvitationProps {
  invitationCode: string;
}

export function CopyInvitation({ invitationCode }: CopyInvitationProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-accent"
            onClick={() => {
              navigator.clipboard.writeText(invitationCode);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy invitation code</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
