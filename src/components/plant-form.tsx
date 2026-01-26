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
import { SpeciesCombobox } from "@/components/species-combobox";
import { SpeciesPreviewCard } from "@/components/species-preview-card";
import { AIIdentifyButton } from "@/components/ai-identify-button";
import type { SpeciesData } from "@/types/species";

interface PlantFormProps {
  species: SpeciesData[];
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

interface IdentificationPhoto {
  blob: Blob;
  mimeType: string;
}

export function PlantForm({ species, plant }: PlantFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(
    plant?.speciesId || null
  );
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesData | null>(
    plant?.speciesId ? species.find((s) => s.id === plant.speciesId) || null : null
  );
  const [location, setLocation] = useState<"INDOOR" | "OUTDOOR">(
    plant?.location || "INDOOR"
  );

  // Controlled state for auto-population
  const [plantName, setPlantName] = useState<string>(plant?.name || "");
  const [personalName, setPersonalName] = useState<string>(plant?.nickname || "");
  const [locationLocked, setLocationLocked] = useState<boolean>(false);

  // Store identification photo for auto-save
  const [identificationPhoto, setIdentificationPhoto] = useState<IdentificationPhoto | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const htmlFormData = new FormData(e.currentTarget);
    const data = {
      name: plantName,
      nickname: personalName || null,
      speciesId: selectedSpeciesId,
      location: location,
      area: (htmlFormData.get("area") as string) || null,
      acquiredAt: (htmlFormData.get("acquiredAt") as string) || null,
      notes: (htmlFormData.get("notes") as string) || null,
    };

    try {
      const url = plant ? `/api/plants/${plant.id}` : "/api/plants";
      const method = plant ? "PUT" : "POST";

      let response: Response;

      // Use FormData if we have an identification photo (new plants only)
      if (!plant && identificationPhoto) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        // Get file extension from mime type
        const ext = identificationPhoto.mimeType.split("/")[1] || "jpg";
        formData.append(
          "identificationPhoto",
          identificationPhoto.blob,
          `identification.${ext}`
        );

        response = await fetch(url, {
          method,
          body: formData,
        });
      } else {
        response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

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

  // Auto-populate form fields based on selected species (for new plants only)
  const applyAutoPopulation = (speciesData: SpeciesData | null) => {
    if (!speciesData) {
      setLocationLocked(false);
      return;
    }

    if (!plant) {
      // Auto-populate plant name if empty
      if (!plantName) {
        setPlantName(speciesData.commonName);
      }

      // Auto-set location based on suitableFor
      const suitableFor = speciesData.suitableFor || [];
      if (suitableFor.length === 1) {
        setLocation(suitableFor[0]);
        setLocationLocked(true);
      } else {
        setLocationLocked(false);
      }
    }
  };

  const handleSpeciesChange = (
    speciesId: string | null,
    speciesData: SpeciesData | null
  ) => {
    setSelectedSpeciesId(speciesId);
    setSelectedSpecies(speciesData);
    applyAutoPopulation(speciesData);
  };

  const handleAISpeciesSelect = (
    speciesId: string,
    speciesData: SpeciesData,
    photoData?: { blob: Blob; mimeType: string }
  ) => {
    setSelectedSpeciesId(speciesId);
    setSelectedSpecies(speciesData);
    applyAutoPopulation(speciesData);

    // Store the identification photo for auto-save
    if (photoData) {
      setIdentificationPhoto(photoData);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{plant ? "Edit Plant" : "Add New Plant"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Hero Section: Species Selection (Primary Action) */}
          <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">What kind of plant is this?</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Search or use AI to identify your plant
                  </p>
                </div>
                <AIIdentifyButton
                  onSpeciesSelect={handleAISpeciesSelect}
                  onSkip={() => {
                    setSelectedSpeciesId(null);
                    setSelectedSpecies(null);
                    setLocationLocked(false);
                  }}
                />
              </div>
              <SpeciesCombobox
                value={selectedSpeciesId}
                onValueChange={handleSpeciesChange}
                initialSpecies={species}
                // Don't filter by location - show all species so users can find what they're looking for
                // Location will auto-populate based on species.suitableFor after selection
              />
            </div>
          </div>

          {/* Species Preview Card (Expanded) */}
          {selectedSpecies && (
            <SpeciesPreviewCard species={selectedSpecies} />
          )}

          {/* Plant Name and Personal Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plant Name *</Label>
              <Input
                id="name"
                name="name"
                required
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="e.g., Golden Pothos"
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from species, customize if you like
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Personal Name</Label>
              <Input
                id="nickname"
                name="nickname"
                value={personalName}
                onChange={(e) => setPersonalName(e.target.value)}
                placeholder="e.g., Monty, Leafy, Fernando"
              />
              <p className="text-xs text-muted-foreground">
                Give your plant a pet name (optional)
              </p>
            </div>
          </div>

          {/* Location and Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                name="location"
                value={location}
                onValueChange={(value) => {
                  if (!locationLocked) {
                    setLocation(value as "INDOOR" | "OUTDOOR");
                  }
                }}
                disabled={locationLocked}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDOOR">Indoor</SelectItem>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                </SelectContent>
              </Select>
              {locationLocked && (
                <p className="text-xs text-muted-foreground">
                  This species is {location.toLowerCase()}-only
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area/Room</Label>
              <Input
                id="area"
                name="area"
                defaultValue={plant?.area || ""}
                placeholder="e.g., Living Room, Backyard"
              />
            </div>
          </div>

          {/* Date Acquired */}
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

          {/* Notes */}
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

          {/* Action Buttons */}
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
