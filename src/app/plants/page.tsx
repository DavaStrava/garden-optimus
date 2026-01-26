import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WaterStatusIndicator } from "@/components/water-status-indicator";
import { DeletedPlantsSection } from "@/components/deleted-plants-section";

export default async function PlantsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; search?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const locationFilter = params.location;
  const searchQuery = params.search;

  const plants = await prisma.plant.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      ...(locationFilter && locationFilter !== "all"
        ? { location: locationFilter as "INDOOR" | "OUTDOOR" }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { nickname: { contains: searchQuery, mode: "insensitive" } },
              { area: { contains: searchQuery, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      species: true,
      photos: { take: 1, orderBy: { createdAt: "desc" } },
      _count: { select: { careLogs: true, assessments: true } },
      careSchedules: {
        where: { careType: "WATERING", enabled: true },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Plants</h1>
          <Button asChild>
            <Link href="/plants/new">Add Plant</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <form className="flex-1 max-w-sm">
            <Input
              type="search"
              name="search"
              placeholder="Search plants..."
              defaultValue={searchQuery}
            />
          </form>
          <div className="flex gap-2">
            <Button
              variant={!locationFilter || locationFilter === "all" ? "default" : "outline"}
              asChild
            >
              <Link href="/plants">All</Link>
            </Button>
            <Button variant={locationFilter === "INDOOR" ? "default" : "outline"} asChild>
              <Link href="/plants?location=INDOOR">Indoor</Link>
            </Button>
            <Button variant={locationFilter === "OUTDOOR" ? "default" : "outline"} asChild>
              <Link href="/plants?location=OUTDOOR">Outdoor</Link>
            </Button>
          </div>
        </div>

        {/* Plants Grid */}
        {plants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map((plant) => (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plant.name}</CardTitle>
                        {plant.nickname && (
                          <p className="text-sm text-gray-500">&quot;{plant.nickname}&quot;</p>
                        )}
                        {plant.species && (
                          <CardDescription>{plant.species.commonName}</CardDescription>
                        )}
                      </div>
                      <Badge variant={plant.location === "INDOOR" ? "default" : "secondary"}>
                        {plant.location === "INDOOR" ? "Indoor" : "Outdoor"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plant.area && <p className="text-sm text-gray-500 mb-2">{plant.area}</p>}
                    {plant.acquiredAt && (
                      <p className="text-xs text-gray-400">
                        Added {new Date(plant.acquiredAt).toLocaleDateString()}
                      </p>
                    )}
                    {plant.careSchedules?.[0] && (
                      <WaterStatusIndicator nextDueDate={plant.careSchedules[0].nextDueDate} />
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{plant._count.careLogs} care logs</span>
                      <span>{plant._count.assessments} assessments</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                {searchQuery || locationFilter
                  ? "No plants match your search"
                  : "You haven't added any plants yet"}
              </p>
              <Button asChild>
                <Link href="/plants/new">Add Your First Plant</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deleted Plants Section */}
        <div className="mt-8 pt-6 border-t">
          <DeletedPlantsSection />
        </div>
      </main>
    </div>
  );
}
