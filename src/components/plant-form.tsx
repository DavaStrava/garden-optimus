"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantSpecies {
  id: string;
  commonName: string;
  scientificName: string | null;
}

interface PlantFormProps {
  species: PlantSpecies[];
  plant?: {
    id: string;
    name: string;
    nickname: string | null;
    speciesId: string | null;
    location: "INDOOR" | "OUTDOOR";
    area: string | null;
    acquiredAt: Date | null;
    notes: string | null;
  };
}

export function PlantForm({ species, plant }: PlantFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      nickname: formData.get("nickname") as string || null,
      speciesId: formData.get("speciesId") as string || null,
      location: formData.get("location") as "INDOOR" | "OUTDOOR",
      area: formData.get("area") as string || null,
      acquiredAt: formData.get("acquiredAt") as string || null,
      notes: formData.get("notes") as string || null,
    };

    try {
      const url = plant ? `/api/plants/${plant.id}` : "/api/plants";
      const method = plant ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save plant");
      }

      const result = await response.json();
      router.push(`/plants/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{plant ? "Edit Plant" : "Plant Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plant Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={plant?.name}
                placeholder="e.g., My Monstera"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                name="nickname"
                defaultValue={plant?.nickname || ""}
                placeholder="e.g., Monty"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="speciesId">Species</Label>
              <Select name="speciesId" defaultValue={plant?.speciesId || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a species (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None selected</SelectItem>
                  {species.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.commonName}
                      {s.scientificName && ` (${s.scientificName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select name="location" defaultValue={plant?.location || "INDOOR"} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDOOR">Indoor</SelectItem>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area/Room</Label>
              <Input
                id="area"
                name="area"
                defaultValue={plant?.area || ""}
                placeholder="e.g., Living Room, Backyard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquiredAt">Date Acquired</Label>
              <Input
                id="acquiredAt"
                name="acquiredAt"
                type="date"
                defaultValue={
                  plant?.acquiredAt
                    ? new Date(plant.acquiredAt).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={plant?.notes || ""}
              placeholder="Any additional notes about this plant..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : plant ? "Update Plant" : "Add Plant"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
