"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Sun, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeciesMatch, AIIdentification } from "@/types/species";

interface SpeciesMatchPickerProps {
  identification: AIIdentification;
  matches: SpeciesMatch[];
  onSelect: (speciesId: string, species: SpeciesMatch) => void;
  onSkip: () => void;
}

function getConfidenceBadge(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return <Badge className="bg-green-500">High Confidence</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    case "low":
      return <Badge className="bg-red-500">Low Confidence</Badge>;
  }
}

export function SpeciesMatchPicker({
  identification,
  matches,
  onSelect,
  onSkip,
}: SpeciesMatchPickerProps) {
  if (matches.length === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-base">Species Not Found in Library</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm">
              AI identified this as <strong>{identification.species}</strong>
              {identification.scientificName && (
                <span className="italic text-muted-foreground">
                  {" "}
                  ({identification.scientificName})
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {identification.reasoning}
            </p>
          </div>

          {identification.careHints && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">AI Suggested Care:</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {identification.careHints.lightNeeds && (
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <span>{identification.careHints.lightNeeds}</span>
                  </div>
                )}
                {identification.careHints.waterFrequency && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span>{identification.careHints.waterFrequency}</span>
                  </div>
                )}
                {identification.careHints.humidity && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    <span>Humidity: {identification.careHints.humidity}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={onSkip}>
              Continue without selecting a species
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base">Select Matching Species</CardTitle>
          </div>
          {getConfidenceBadge(identification.confidence)}
        </div>
        <p className="text-sm text-muted-foreground mt-1 break-words">
          AI identified this as <strong>{identification.species}</strong>.{" "}
          {identification.reasoning}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match, index) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelect(match.id, match)}
            className={cn(
              "w-full text-left p-3 rounded-lg border transition-colors",
              "hover:border-primary hover:bg-primary/5",
              index === 0 && match.matchConfidence === "high"
                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                : "border-border"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{match.commonName}</span>
                  {index === 0 && match.matchConfidence === "high" && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Best Match
                    </Badge>
                  )}
                </div>
                {match.scientificName && (
                  <p className="text-sm text-muted-foreground italic">
                    {match.scientificName}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {match.lightNeeds && (
                    <span className="flex items-center gap-1">
                      <Sun className="h-3 w-3" />
                      {match.lightNeeds}
                    </span>
                  )}
                  {match.waterFrequency && (
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      {match.waterFrequency}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {match.suitableFor?.map((loc) => (
                  <Badge key={loc} variant="outline" className="text-xs">
                    {loc === "INDOOR" ? "Indoor" : "Outdoor"}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        ))}

        <div className="pt-2 border-t">
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Skip - Select species manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
