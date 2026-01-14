"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
}

interface PhotoUploadProps {
  plantId: string;
  photos: Photo[];
}

export function PhotoUpload({ plantId, photos }: PhotoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("plantId", plantId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload photo");
        }
      }

      router.refresh();
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      setSelectedPhoto(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting photo:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={photo.url}
                alt="Plant photo"
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4 mb-4">No photos yet</p>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
        >
          {isUploading ? "Uploading..." : "Upload Photos"}
        </Button>
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
            <DialogDescription>
              Taken on {selectedPhoto && new Date(selectedPhoto.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative aspect-video w-full">
              <Image
                src={selectedPhoto.url}
                alt="Plant photo"
                fill
                className="object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeletePhoto}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
