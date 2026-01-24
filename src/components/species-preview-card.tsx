"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sun, Thermometer, AlertTriangle } from "lucide-react";
import type { SpeciesData } from "@/types/species";

interface SpeciesPreviewCardProps {
  species: SpeciesData;
  compact?: boolean;
}

export function SpeciesPreviewCard({ species, compact = false }: SpeciesPreviewCardProps) {
  if (compact) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{species.commonName}</p>
            {species.scientificName && (
              <p className="text-xs text-muted-foreground italic">
                {species.scientificName}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {species.suitableFor?.map((loc) => (
              <Badge key={loc} variant="outline" className="text-xs">
                {loc === "INDOOR" ? "Indoor" : "Outdoor"}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {species.lightNeeds && (
            <span className="flex items-center gap-1">
              <Sun className="h-3 w-3" />
              {species.lightNeeds}
            </span>
          )}
          {species.waterFrequency && (
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {species.waterFrequency}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{species.commonName}</CardTitle>
            {species.scientificName && (
              <p className="text-sm text-muted-foreground italic mt-1">
                {species.scientificName}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {species.suitableFor?.map((loc) => (
              <Badge key={loc} variant="secondary" className="text-xs">
                {loc === "INDOOR" ? "Indoor" : "Outdoor"}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {species.description && (
          <p className="text-sm text-muted-foreground">{species.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {species.lightNeeds && (
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Light</p>
                <p className="text-sm">{species.lightNeeds}</p>
              </div>
            </div>
          )}

          {species.waterFrequency && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Water</p>
                <p className="text-sm">{species.waterFrequency}</p>
              </div>
            </div>
          )}

          {species.humidity && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="text-sm">{species.humidity}</p>
              </div>
            </div>
          )}

          {species.temperature && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="text-sm">{species.temperature}</p>
              </div>
            </div>
          )}
        </div>

        {species.toxicity && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {species.toxicity}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
