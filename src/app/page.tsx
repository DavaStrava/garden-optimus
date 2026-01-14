import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const [plants, recentCareLogs, recentAssessments] = await Promise.all([
    prisma.plant.findMany({
      where: { userId: session.user.id },
      include: {
        species: true,
        photos: { take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { careLogs: true, assessments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.careLog.findMany({
      where: { plant: { userId: session.user.id } },
      include: { plant: true },
      orderBy: { loggedAt: "desc" },
      take: 5,
    }),
    prisma.healthAssessment.findMany({
      where: { plant: { userId: session.user.id } },
      include: { plant: true },
      orderBy: { assessedAt: "desc" },
      take: 3,
    }),
  ]);

  const totalPlants = await prisma.plant.count({
    where: { userId: session.user.id },
  });

  const indoorCount = await prisma.plant.count({
    where: { userId: session.user.id, location: "INDOOR" },
  });

  const outdoorCount = await prisma.plant.count({
    where: { userId: session.user.id, location: "OUTDOOR" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {session.user.name?.split(" ")[0] || "Gardener"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here&apos;s an overview of your garden
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Plants</CardDescription>
              <CardTitle className="text-4xl">{totalPlants}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Indoor Plants</CardDescription>
              <CardTitle className="text-4xl">{indoorCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outdoor Plants</CardDescription>
              <CardTitle className="text-4xl">{outdoorCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Plants */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Plants</h2>
              <Button asChild>
                <Link href="/plants/new">Add Plant</Link>
              </Button>
            </div>
            {plants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plants.map((plant) => (
                  <Link key={plant.id} href={`/plants/${plant.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{plant.name}</CardTitle>
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
                        {plant.area && (
                          <p className="text-sm text-gray-500">{plant.area}</p>
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
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">You haven&apos;t added any plants yet</p>
                  <Button asChild>
                    <Link href="/plants/new">Add Your First Plant</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {totalPlants > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/plants">View All Plants</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="py-4">
                {recentCareLogs.length > 0 || recentAssessments.length > 0 ? (
                  <div className="space-y-4">
                    {recentCareLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="text-lg">
                          {log.type === "WATERING" && "💧"}
                          {log.type === "FERTILIZING" && "🌿"}
                          {log.type === "REPOTTING" && "🪴"}
                          {log.type === "PRUNING" && "✂️"}
                          {log.type === "PEST_TREATMENT" && "🐛"}
                          {log.type === "OTHER" && "📝"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.plant.name}</p>
                          <p className="text-xs text-gray-500">
                            {log.type.charAt(0) + log.type.slice(1).toLowerCase().replace("_", " ")}
                            {" • "}
                            {new Date(log.loggedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>

            {recentAssessments.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mt-6 mb-3">Recent Assessments</h3>
                <Card>
                  <CardContent className="py-4 space-y-3">
                    {recentAssessments.map((assessment) => (
                      <Link
                        key={assessment.id}
                        href={`/plants/${assessment.plantId}`}
                        className="block p-2 -mx-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <p className="text-sm font-medium">{assessment.plant.name}</p>
                        <p className="text-xs text-gray-500">
                          {assessment.healthStatus} •{" "}
                          {new Date(assessment.assessedAt).toLocaleDateString()}
                        </p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
