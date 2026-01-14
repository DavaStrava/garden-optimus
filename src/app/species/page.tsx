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
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const searchQuery = params.search;

  const species = await prisma.plantSpecies.findMany({
    where: searchQuery
      ? {
          OR: [
            { commonName: { contains: searchQuery, mode: "insensitive" } },
            { scientificName: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { commonName: "asc" },
    include: {
      _count: { select: { plants: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Plant Library</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse care information for {species.length} plant species
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <form className="max-w-md">
            <Input
              type="search"
              name="search"
              placeholder="Search plants..."
              defaultValue={searchQuery}
            />
          </form>
        </div>

        {/* Species Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {species.map((s) => (
            <Card key={s.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{s.commonName}</CardTitle>
                    {s.scientificName && (
                      <CardDescription className="italic">
                        {s.scientificName}
                      </CardDescription>
                    )}
                  </div>
                  {s._count.plants > 0 && (
                    <Badge variant="secondary">
                      {s._count.plants} in your garden
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs">Light</p>
                    <p>{s.lightNeeds}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Water</p>
                    <p>{s.waterFrequency}</p>
                  </div>
                </div>
                {s.humidity && (
                  <div>
                    <p className="text-gray-500 text-xs">Humidity</p>
                    <p>{s.humidity}</p>
                  </div>
                )}
                {s.temperature && (
                  <div>
                    <p className="text-gray-500 text-xs">Temperature</p>
                    <p>{s.temperature}</p>
                  </div>
                )}
                {s.toxicity && (
                  <div>
                    <p className="text-gray-500 text-xs">Pet Safety</p>
                    <p className={s.toxicity.toLowerCase().includes("non-toxic") ? "text-green-600" : "text-orange-600"}>
                      {s.toxicity}
                    </p>
                  </div>
                )}
                {s.careNotes && (
                  <div>
                    <p className="text-gray-500 text-xs">Care Tips</p>
                    <p className="text-gray-600 dark:text-gray-400">{s.careNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {species.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
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
