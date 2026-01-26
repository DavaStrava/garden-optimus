"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LeaveGardenButtonProps {
  gardenId: string;
  gardenName: string;
}

export function LeaveGardenButton({ gardenId, gardenName }: LeaveGardenButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async () => {
    setIsLeaving(true);

    try {
      const response = await fetch(`/api/gardens/${gardenId}/leave`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave garden");
      }

      router.push("/gardens");
      router.refresh();
    } catch (error) {
      console.error("Error leaving garden:", error);
      alert(error instanceof Error ? error.message : "Failed to leave garden");
      setIsLeaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogOut className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Garden</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave &quot;{gardenName}&quot;? You will no longer
            have access to this garden unless you are invited again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isLeaving}
          >
            {isLeaving ? "Leaving..." : "Leave Garden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
