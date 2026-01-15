"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface QuickCareButtonProps {
  plantId: string;
  careType: string;
  onComplete?: () => void;
}

export function QuickCareButton({
  plantId,
  careType,
  onComplete,
}: QuickCareButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/care-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId,
          type: careType,
        }),
      });

      if (response.ok) {
        router.refresh();
        onComplete?.();
      }
    } catch (error) {
      console.error("Failed to log care:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? "..." : "Done"}
    </Button>
  );
}
