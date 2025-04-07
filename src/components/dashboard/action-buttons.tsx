"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/app/actions/room";
import { useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ActionButtons() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const supabase = createSupabaseBrowserClient();

  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      const result = await createRoom();

      if (result.success && result.room) {
        toast.success("Room created successfully!");
        router.push(`/room/${result.room.id}`);
      } else {
        toast.error("Failed to create room");
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!invitationCode.trim()) {
      toast.error("Please enter an invitation code");
      return;
    }

    try {
      setIsJoining(true);
      const result = await joinRoom(invitationCode.trim());

      if (result.success && result.room) {
        toast.success("Joined room successfully!");
        router.push(`/room/${result.room.id}`);
      } else {
        toast.error(result.error || "Failed to join room");
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error("Error joining room:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <Button
        variant="default"
        className="w-full"
        onClick={handleCreateRoom}
        disabled={isCreating}
      >
        {isCreating ? "Creating..." : "Create Room"}
      </Button>

      <div className="flex gap-2">
        <Input
          placeholder="Enter invitation code"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value)}
          disabled={isJoining}
        />
        <Button variant="outline" onClick={handleJoinRoom} disabled={isJoining}>
          {isJoining ? "Joining..." : "Join"}
        </Button>
      </div>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
