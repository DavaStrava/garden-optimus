import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function SpeciesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const searchQuery = params.search;
  const filterQuery = params.filter; // "indoor", "outdoor", or undefined for all

  const species = await prisma.plantSpecies.findMany({
    where: {
      AND: [
        searchQuery
          ? {
              OR: [
                { commonName: { contains: searchQuery, mode: "insensitive" } },
                { scientificName: { contains: searchQuery, mode: "insensitive" } },
              ],
            }
          : {},
        filterQuery
          ? {
              suitableFor: {
                has: filterQuery.toUpperCase() as "INDOOR" | "OUTDOOR",
              },
            }
          : {},
      ],
    },
    orderBy: { commonName: "asc" },
    include: {
      _count: { select: { plants: true } },
    },
  });

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Plant Library</h1>
          <p className="text-muted-foreground">
            Browse care information for {species.length} plant species
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <Badge
              variant={!filterQuery ? "default" : "outline"}
              className="cursor-pointer"
            >
              <a href="/species">All Plants</a>
            </Badge>
            <Badge
              variant={filterQuery === "indoor" ? "default" : "outline"}
              className="cursor-pointer"
            >
              <a href="/species?filter=indoor">Indoor</a>
            </Badge>
            <Badge
              variant={filterQuery === "outdoor" ? "default" : "outline"}
              className="cursor-pointer"
            >
              <a href="/species?filter=outdoor">Outdoor</a>
            </Badge>
          </div>
          <form className="max-w-md">
            <Input
              type="search"
              name="search"
              placeholder="Search plants..."
              defaultValue={searchQuery}
            />
            {filterQuery && (
              <input type="hidden" name="filter" value={filterQuery} />
            )}
          </form>
        </div>

        {/* Species Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {species.map((s) => (
            <Card key={s.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{s.commonName}</CardTitle>
                    {s.scientificName && (
                      <CardDescription className="italic">
                        {s.scientificName}
                      </CardDescription>
                    )}
                    {/* Suitability badges */}
                    <div className="flex gap-1 mt-2">
                      {s.suitableFor?.map((location) => (
                        <Badge
                          key={location}
                          variant="outline"
                          className="text-xs"
                        >
                          {location === "INDOOR" ? "🏠 Indoor" : "🌳 Outdoor"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {s._count.plants > 0 && (
                    <Badge variant="secondary" className="shrink-0">
                      {s._count.plants} in your garden
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {s.description && (
                  <div>
                    <p className="text-foreground/80 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                )}
                <div className="border-t pt-3"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Light</p>
                    <p>{s.lightNeeds}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Water</p>
                    <p>{s.waterFrequency}</p>
                  </div>
                </div>
                {s.humidity && (
                  <div>
                    <p className="text-muted-foreground text-xs">Humidity</p>
                    <p>{s.humidity}</p>
                  </div>
                )}
                {s.temperature && (
                  <div>
                    <p className="text-muted-foreground text-xs">Temperature</p>
                    <p>{s.temperature}</p>
                  </div>
                )}
                {s.toxicity && (
                  <div>
                    <p className="text-muted-foreground text-xs">Pet Safety</p>
                    <p className={s.toxicity.toLowerCase().includes("non-toxic") ? "text-green-600" : "text-orange-600"}>
                      {s.toxicity}
                    </p>
                  </div>
                )}
                {s.careNotes && (
                  <div>
                    <p className="text-muted-foreground text-xs">Care Tips</p>
                    <p className="text-muted-foreground">{s.careNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {species.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No plants match your search"
                  : "No plant species in the database yet. Run the seed script to populate."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
