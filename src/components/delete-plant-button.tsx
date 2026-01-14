"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface DeletePlantButtonProps {
  plantId: string;
  plantName: string;
}

export function DeletePlantButton({ plantId, plantName }: DeletePlantButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/plants/${plantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete plant");
      }

      router.push("/plants");
      router.refresh();
    } catch (error) {
      console.error("Error deleting plant:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Plant</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{plantName}&quot;? This action cannot be
            undone. All photos, care logs, and health assessments will be permanently
            deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
