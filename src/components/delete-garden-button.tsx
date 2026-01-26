"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

interface DeleteGardenButtonProps {
  gardenId: string;
  gardenName: string;
}

export function DeleteGardenButton({ gardenId, gardenName }: DeleteGardenButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/gardens/${gardenId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete garden");
      }

      router.push("/gardens");
      router.refresh();
    } catch (error) {
      console.error("Error deleting garden:", error);
      alert(error instanceof Error ? error.message : "Failed to delete garden");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Garden</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{gardenName}&quot;? This action cannot
            be undone. All members will lose access. Plants in this garden will
            remain in your collection but will no longer be associated with this garden.
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
            {isDeleting ? "Deleting..." : "Delete Garden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
