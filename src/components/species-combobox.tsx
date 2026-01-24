"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { SpeciesData } from "@/types/species";

interface SpeciesComboboxProps {
  value: string | null;
  onValueChange: (value: string | null, species: SpeciesData | null) => void;
  initialSpecies?: SpeciesData[];
  location?: "INDOOR" | "OUTDOOR" | null;
  disabled?: boolean;
}

export function SpeciesCombobox({
  value,
  onValueChange,
  initialSpecies = [],
  location,
  disabled = false,
}: SpeciesComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [species, setSpecies] = React.useState<SpeciesData[]>(initialSpecies);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedSpecies, setSelectedSpecies] = React.useState<SpeciesData | null>(
    initialSpecies.find((s) => s.id === value) || null
  );

  // Debounce search and abort controller for canceling stale requests
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const searchSpecies = React.useCallback(
    async (query: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (location) params.set("location", location);
        params.set("limit", "20");

        const response = await fetch(`/api/species/search?${params}`, {
          signal: abortControllerRef.current.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setSpecies(data.species);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Failed to search species:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [location]
  );

  // Load initial species when popover opens
  React.useEffect(() => {
    if (open && species.length === 0) {
      searchSpecies("");
    }
  }, [open, species.length, searchSpecies]);

  // Debounced search on input change
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!open) return;

    searchTimeoutRef.current = setTimeout(() => {
      searchSpecies(search);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, open, searchSpecies]);

  // Update selected species when value changes externally
  React.useEffect(() => {
    if (value) {
      const found = species.find((s) => s.id === value);
      if (found) {
        setSelectedSpecies(found);
      }
    } else {
      setSelectedSpecies(null);
    }
  }, [value, species]);

  const handleSelect = (speciesId: string) => {
    if (speciesId === value) {
      // Deselect
      onValueChange(null, null);
      setSelectedSpecies(null);
    } else {
      const selected = species.find((s) => s.id === speciesId);
      if (selected) {
        onValueChange(speciesId, selected);
        setSelectedSpecies(selected);
      }
    }
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(null, null);
    setSelectedSpecies(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select species"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedSpecies ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedSpecies.commonName}</span>
              {selectedSpecies.scientificName && (
                <span className="text-muted-foreground text-xs italic truncate hidden sm:inline">
                  ({selectedSpecies.scientificName})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">
              Search for a species...
            </span>
          )}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {selectedSpecies && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-muted rounded"
              >
                <span className="sr-only">Clear</span>
                <span className="text-xs">x</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search species by name..."
              value={search}
              onValueChange={setSearch}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </div>
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Searching..." : "No species found."}
            </CommandEmpty>
            <CommandGroup>
              {species.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => handleSelect(s.id)}
                  className="flex items-start gap-2 py-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      value === s.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {s.commonName}
                      </span>
                      <div className="flex gap-1">
                        {s.suitableFor?.map((loc) => (
                          <Badge
                            key={loc}
                            variant="outline"
                            className="text-[10px] px-1 py-0"
                          >
                            {loc === "INDOOR" ? "In" : "Out"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {s.scientificName && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        {s.scientificName}
                      </p>
                    )}
                    {s.lightNeeds && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {s.lightNeeds}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
