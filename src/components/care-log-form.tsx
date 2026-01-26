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

interface CareLogFormProps {
  plantId: string;
}

const careTypes = [
  { value: "WATERING", label: "Watering", emoji: "💧" },
  { value: "FERTILIZING", label: "Fertilizing", emoji: "🌿" },
  { value: "REPOTTING", label: "Repotting", emoji: "🪴" },
  { value: "PRUNING", label: "Pruning", emoji: "✂️" },
  { value: "PEST_TREATMENT", label: "Pest Treatment", emoji: "🐛" },
  { value: "OTHER", label: "Other", emoji: "📝" },
];

export function CareLogForm({ plantId }: CareLogFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      plantId,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string || null,
      notes: formData.get("notes") as string || null,
    };

    try {
      const response = await fetch("/api/care-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to log care");
      }

      // Reset form
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Care Type *</Label>
          <Select name="type" required defaultValue="WATERING">
            <SelectTrigger>
              <SelectValue placeholder="Select care type" />
            </SelectTrigger>
            <SelectContent>
              {careTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.emoji} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (optional)</Label>
          <Input
            id="amount"
            name="amount"
            placeholder="e.g., 200ml, 1 cup"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Logging..." : "Log Care"}
      </Button>
    </form>
  );
}
