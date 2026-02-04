"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DeletedPlant {
  id: string;
  name: string;
  nickname: string | null;
  deletedAt: string;
  daysUntilPermanentDelete: number;
  species: {
    commonName: string;
  } | null;
}

export function DeletedPlantsSection() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [deletedPlants, setDeletedPlants] = useState<DeletedPlant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Permanent delete dialog state
  const [permanentDeletePlant, setPermanentDeletePlant] = useState<DeletedPlant | null>(null);
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);

  // Fetch deleted plants every time the section is opened (to avoid stale data)
  useEffect(() => {
    if (isOpen) {
      fetchDeletedPlants();
    }
  }, [isOpen]);

  const fetchDeletedPlants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plants/deleted");
      if (!response.ok) {
        throw new Error("Failed to fetch deleted plants");
      }
      const plants = await response.json();
      setDeletedPlants(plants);
    } catch (err) {
      console.error("Error fetching deleted plants:", err);
      setError("Failed to load deleted plants");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (plantId: string) => {
    setRestoringId(plantId);

    try {
      const response = await fetch(`/api/plants/${plantId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to restore plant");
      }

      // Remove from list and refresh
      setDeletedPlants((prev) => prev.filter((p) => p.id !== plantId));
      router.refresh();
    } catch (err) {
      console.error("Error restoring plant:", err);
      alert("Failed to restore plant. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeletePlant) return;

    setIsDeletingPermanently(true);

    try {
      const response = await fetch(`/api/plants/${permanentDeletePlant.id}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to permanently delete plant");
      }

      // Remove from list
      setDeletedPlants((prev) => prev.filter((p) => p.id !== permanentDeletePlant.id));
      setPermanentDeletePlant(null);
    } catch (err) {
      console.error("Error permanently deleting plant:", err);
      alert("Failed to permanently delete plant. Please try again.");
    } finally {
      setIsDeletingPermanently(false);
    }
  };

  // Don't render if no deleted plants (after loading)
  if (!isOpen && deletedPlants.length === 0 && !isLoading) {
    // Check if we need to fetch first
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 px-8">Loading...</p>
          ) : (
            <p className="text-sm text-muted-foreground py-4 px-8">No deleted plants</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
            {deletedPlants.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {deletedPlants.length}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading deleted plants...</p>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : deletedPlants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No deleted plants</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deletedPlants.map((plant) => (
                <Card key={plant.id} className="opacity-75">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plant.name}</CardTitle>
                        {plant.nickname && (
                          <p className="text-sm text-muted-foreground">&quot;{plant.nickname}&quot;</p>
                        )}
                        {plant.species && (
                          <CardDescription>{plant.species.commonName}</CardDescription>
                        )}
                      </div>
                      <Badge variant="destructive">
                        {plant.daysUntilPermanentDelete === 0
                          ? "Today"
                          : plant.daysUntilPermanentDelete === 1
                          ? "1 day left"
                          : `${plant.daysUntilPermanentDelete} days left`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground/70 mb-3">
                      Deleted {new Date(plant.deletedAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(plant.id)}
                        disabled={restoringId === plant.id}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {restoringId === plant.id ? "Restoring..." : "Restore"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermanentDeletePlant(plant)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete Forever
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={!!permanentDeletePlant}
        onOpenChange={(open) => !open && setPermanentDeletePlant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Plant</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{permanentDeletePlant?.name}&quot;?
              This action cannot be undone. All photos, care logs, and health assessments will
              be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeletePlant(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isDeletingPermanently}
            >
              {isDeletingPermanently ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
