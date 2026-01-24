"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Loader2, Sparkles, X } from "lucide-react";
import { SpeciesMatchPicker } from "./species-match-picker";
import {
  validateImageFileAsync,
  compressImage,
  createImagePreview,
  revokeImagePreview,
} from "@/lib/image-compression";
import type { SpeciesMatch, AIIdentification, IdentificationResult } from "@/types/species";

export type { SpeciesMatch };

interface AIIdentifyButtonProps {
  onSpeciesSelect: (speciesId: string, species: SpeciesMatch) => void;
  onSkip: () => void;
}

type Step = "upload" | "identifying" | "results";

export function AIIdentifyButton({ onSpeciesSelect, onSkip }: AIIdentifyButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("upload");
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<IdentificationResult | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setError(null);
    setResult(null);
    if (previewUrl) {
      revokeImagePreview(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    resetState();
  };

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file (async to check magic bytes for HEIC/AVIF)
    const validation = await validateImageFileAsync(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    try {
      // Create preview
      const preview = createImagePreview(file);
      setPreviewUrl(preview);

      // Compress image
      setStep("identifying");
      const compressedFile = await compressImage(file);

      // Send to API
      const formData = new FormData();
      formData.append("image", compressedFile);

      const response = await fetch("/api/species/identify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Identification failed");
      }

      setResult({
        identification: data.identification,
        matches: data.matches,
      });
      setStep("results");
    } catch (err) {
      console.error("Identification error:", err);
      setError(err instanceof Error ? err.message : "Failed to identify plant");
      setStep("upload");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSpeciesSelect = (speciesId: string, species: SpeciesMatch) => {
    onSpeciesSelect(speciesId, species);
    handleClose();
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Identify with AI</span>
        <span className="sm:hidden">AI ID</span>
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Plant Identification
            </DialogTitle>
            <DialogDescription>
              Upload a photo of your plant and we'll identify the species.
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 bg-muted rounded-full">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop an image here</p>
                    <p className="text-sm text-muted-foreground">
                      or use the buttons below
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleInputChange}
                className="hidden"
              />

              <p className="text-xs text-center text-muted-foreground">
                For best results, take a clear, close-up photo of the plant leaves or stem.
                Supported formats: JPEG, PNG, WebP. Max 10MB.
              </p>
            </div>
          )}

          {step === "identifying" && (
            <div className="py-8 text-center space-y-4">
              {previewUrl && (
                <div className="relative mx-auto w-48 h-48 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Plant being identified"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
              )}
              <div>
                <p className="font-medium">Identifying your plant...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds
                </p>
              </div>
            </div>
          )}

          {step === "results" && result && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Your plant"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={resetState}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              <SpeciesMatchPicker
                identification={result.identification}
                matches={result.matches}
                onSelect={handleSpeciesSelect}
                onSkip={handleSkip}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
