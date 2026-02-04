"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HealthAssessmentButtonProps {
  plantId: string;
}

export function HealthAssessmentButton({ plantId }: HealthAssessmentButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a photo first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("plantId", plantId);

      const response = await fetch("/api/assessments", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze plant");
      }

      setIsOpen(false);
      setSelectedFile(null);
      setPreview(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button>Assess Health</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Health Assessment</DialogTitle>
          <DialogDescription>
            Upload a photo of your plant and our AI will analyze its health and provide
            recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Choose Different Photo
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Photo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Choose a clear photo of your plant
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Analyze Plant"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
