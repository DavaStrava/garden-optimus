"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Plant {
  id: string;
  name: string;
  species: {
    commonName: string;
  } | null;
}

interface GardenPlantPickerProps {
  gardenId: string;
  availablePlants: Plant[];
}

export function GardenPlantPicker({ gardenId, availablePlants }: GardenPlantPickerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());

  const handleTogglePlant = (plantId: string) => {
    setSelectedPlants((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) {
        next.delete(plantId);
      } else {
        next.add(plantId);
      }
      return next;
    });
  };

  const handleAddPlants = async () => {
    if (selectedPlants.size === 0) return;

    setIsSubmitting(true);

    try {
      // Add each selected plant to the garden
      const results = await Promise.all(
        Array.from(selectedPlants).map((plantId) =>
          fetch(`/api/gardens/${gardenId}/plants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plantId }),
          })
        )
      );

      const allSuccess = results.every((r) => r.ok);

      if (!allSuccess) {
        throw new Error("Some plants failed to add");
      }

      setIsOpen(false);
      setSelectedPlants(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error adding plants:", error);
      alert("Failed to add some plants. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Plants
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Plants to Garden</DialogTitle>
          <DialogDescription>
            Select plants from your collection to add to this garden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {availablePlants.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              All your plants are already in gardens or you don&apos;t have any plants yet.
            </p>
          ) : (
            availablePlants.map((plant) => (
              <div
                key={plant.id}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Checkbox
                  id={plant.id}
                  checked={selectedPlants.has(plant.id)}
                  onCheckedChange={() => handleTogglePlant(plant.id)}
                />
                <Label htmlFor={plant.id} className="flex-1 cursor-pointer">
                  <span className="font-medium">{plant.name}</span>
                  {plant.species && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({plant.species.commonName})
                    </span>
                  )}
                </Label>
              </div>
            ))
          )}
        </div>

        {availablePlants.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPlants}
              disabled={selectedPlants.size === 0 || isSubmitting}
            >
              {isSubmitting
                ? "Adding..."
                : `Add ${selectedPlants.size} Plant${selectedPlants.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
