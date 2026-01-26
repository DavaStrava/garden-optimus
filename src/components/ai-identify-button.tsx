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
import { Camera, Upload, Loader2, Sparkles, X, Plus } from "lucide-react";
import { SpeciesMatchPicker } from "./species-match-picker";
import {
  validateImageFileAsync,
  compressImage,
  createImagePreview,
  revokeImagePreview,
} from "@/lib/image-compression";
import type { SpeciesMatch, IdentificationResult } from "@/types/species";

export type { SpeciesMatch };

interface SelectedFile {
  file: File;
  previewUrl: string;
}

interface AIIdentifyButtonProps {
  onSpeciesSelect: (speciesId: string, species: SpeciesMatch, photoData?: { blob: Blob; mimeType: string }) => void;
  onSkip: () => void;
}

type Step = "upload" | "identifying" | "results";

const MAX_IMAGES = 2;

export function AIIdentifyButton({ onSpeciesSelect, onSkip }: AIIdentifyButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("upload");
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<SelectedFile[]>([]);
  const [result, setResult] = React.useState<IdentificationResult | null>(null);
  const [compressedBlob, setCompressedBlob] = React.useState<Blob | null>(null);
  const [compressedMimeType, setCompressedMimeType] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const additionalFileInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setError(null);
    setResult(null);
    setCompressedBlob(null);
    setCompressedMimeType(null);
    // Clean up all preview URLs
    selectedFiles.forEach((sf) => revokeImagePreview(sf.previewUrl));
    setSelectedFiles([]);
  };

  const handleClose = () => {
    setOpen(false);
    resetState();
  };

  const addFile = async (file: File): Promise<boolean> => {
    setError(null);

    // Validate file (async to check magic bytes for HEIC/AVIF)
    const validation = await validateImageFileAsync(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return false;
    }

    // Create preview
    const preview = createImagePreview(file);
    setSelectedFiles((prev) => [...prev, { file, previewUrl: preview }]);
    return true;
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed) {
        revokeImagePreview(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleIdentify = async () => {
    if (selectedFiles.length === 0) return;

    setError(null);
    setStep("identifying");

    try {
      // Compress all images
      const compressedFiles: File[] = [];
      for (const sf of selectedFiles) {
        const compressed = await compressImage(sf.file);
        compressedFiles.push(compressed);
      }

      // Store first compressed file for later use (Story 5)
      if (compressedFiles.length > 0) {
        setCompressedBlob(compressedFiles[0]);
        setCompressedMimeType(compressedFiles[0].type);
      }

      // Send to API
      const formData = new FormData();
      if (compressedFiles.length === 1) {
        formData.append("image", compressedFiles[0]);
      } else {
        compressedFiles.forEach((file, index) => {
          formData.append(`image${index + 1}`, file);
        });
      }

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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await addFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSpeciesSelect = (speciesId: string, species: SpeciesMatch) => {
    // Pass photo data for Story 5
    if (compressedBlob && compressedMimeType) {
      onSpeciesSelect(speciesId, species, { blob: compressedBlob, mimeType: compressedMimeType });
    } else {
      onSpeciesSelect(speciesId, species);
    }
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

              {/* Image previews */}
              {selectedFiles.length > 0 && (
                <div className="flex gap-3 justify-center">
                  {selectedFiles.map((sf, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <img
                        src={sf.previewUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => additionalFileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">Add</span>
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone (only show when no images selected) */}
              {selectedFiles.length === 0 && (
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
              )}

              {/* Buttons */}
              {selectedFiles.length === 0 ? (
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
              ) : (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleIdentify}
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Identify Plant
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    {selectedFiles.length === 1
                      ? "Add another photo for better accuracy (optional)"
                      : `${selectedFiles.length} photos selected`}
                  </p>
                </div>
              )}

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
              <input
                ref={additionalFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />

              <p className="text-xs text-center text-muted-foreground">
                For best results, take clear, close-up photos of leaves and stem.
                Supported formats: JPEG, PNG, WebP. Max 10MB per image.
              </p>
            </div>
          )}

          {step === "identifying" && (
            <div className="py-8 text-center space-y-4">
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 justify-center">
                  {selectedFiles.map((sf, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <img
                        src={sf.previewUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="font-medium">Identifying your plant...</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length > 1
                    ? `Analyzing ${selectedFiles.length} photos for better accuracy`
                    : "This may take a few seconds"}
                </p>
              </div>
            </div>
          )}

          {step === "results" && result && (
            <div className="space-y-4">
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 justify-center">
                  {selectedFiles.map((sf, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                      <img
                        src={sf.previewUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={resetState}
                    className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span className="text-xs">Retry</span>
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
