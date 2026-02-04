import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CareLogForm } from "@/components/care-log-form";
import { DeletePlantButton } from "@/components/delete-plant-button";
import { PhotoUpload } from "@/components/photo-upload";
import { HealthAssessmentButton } from "@/components/health-assessment-button";
import { CareScheduleForm } from "@/components/care-schedule-form";
import { UpcomingCareCard } from "@/components/upcoming-care-card";
import { getReminderStatus } from "@/lib/care-reminders";

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const plant = await prisma.plant.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    include: {
      species: true,
      photos: { orderBy: { createdAt: "desc" } },
      careLogs: { orderBy: { loggedAt: "desc" } },
      assessments: { orderBy: { assessedAt: "desc" } },
      careSchedules: { orderBy: { careType: "asc" } },
    },
  });

  if (!plant) {
    notFound();
  }

  // Calculate status for each schedule, serialize dates for client component
  const schedulesWithStatus = plant.careSchedules.map((schedule) => ({
    id: schedule.id,
    careType: schedule.careType,
    intervalDays: schedule.intervalDays,
    nextDueDate: schedule.nextDueDate.toISOString(),
    enabled: schedule.enabled,
    statusInfo: getReminderStatus(schedule.nextDueDate),
  }));

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link
          href="/plants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          All Plants
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{plant.name}</h1>
              <Badge variant={plant.location === "INDOOR" ? "default" : "secondary"}>
                {plant.location === "INDOOR" ? "Indoor" : "Outdoor"}
              </Badge>
            </div>
            {plant.nickname && (
              <p className="text-muted-foreground mt-1">&quot;{plant.nickname}&quot;</p>
            )}
            {plant.species && (
              <p className="text-muted-foreground">
                {plant.species.commonName}
                {plant.species.scientificName && (
                  <span className="italic ml-1">({plant.species.scientificName})</span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <HealthAssessmentButton plantId={plant.id} />
            <Button variant="outline" asChild>
              <Link href={`/plants/${plant.id}/edit`}>Edit</Link>
            </Button>
            <DeletePlantButton plantId={plant.id} plantName={plant.name} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload plantId={plant.id} photos={plant.photos} />
              </CardContent>
            </Card>

            {/* Tabs for Care Logs and Assessments */}
            <Tabs defaultValue="care" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="care">Care History</TabsTrigger>
                <TabsTrigger value="assessments">Health Assessments</TabsTrigger>
              </TabsList>
              <TabsContent value="care">
                <Card>
                  <CardHeader>
                    <CardTitle>Care Log</CardTitle>
                    <CardDescription>Track watering, fertilizing, and other care</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CareLogForm plantId={plant.id} />
                    <Separator className="my-6" />
                    {plant.careLogs.length > 0 ? (
                      <div className="space-y-4">
                        {plant.careLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl">
                              {log.type === "WATERING" && "💧"}
                              {log.type === "FERTILIZING" && "🌿"}
                              {log.type === "REPOTTING" && "🪴"}
                              {log.type === "PRUNING" && "✂️"}
                              {log.type === "PEST_TREATMENT" && "🐛"}
                              {log.type === "OTHER" && "📝"}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {log.type.charAt(0) + log.type.slice(1).toLowerCase().replace("_", " ")}
                              </p>
                              {log.amount && (
                                <p className="text-sm text-muted-foreground">Amount: {log.amount}</p>
                              )}
                              {log.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {new Date(log.loggedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No care logs yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="assessments">
                <Card>
                  <CardHeader>
                    <CardTitle>Health Assessments</CardTitle>
                    <CardDescription>AI-powered plant health analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {plant.assessments.length > 0 ? (
                      <div className="space-y-4">
                        {plant.assessments.map((assessment) => (
                          <div
                            key={assessment.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant={
                                  assessment.healthStatus === "Healthy"
                                    ? "default"
                                    : assessment.healthStatus === "Needs attention"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {assessment.healthStatus}
                              </Badge>
                              <span className="text-xs text-muted-foreground/70">
                                {new Date(assessment.assessedAt).toLocaleString()}
                              </span>
                            </div>
                            {assessment.issues && (
                              <div className="mb-2">
                                <p className="text-sm font-medium">Issues identified:</p>
                                <p className="text-sm text-muted-foreground">{assessment.issues}</p>
                              </div>
                            )}
                            {assessment.recommendations && (
                              <div>
                                <p className="text-sm font-medium">Recommendations:</p>
                                <p className="text-sm text-muted-foreground">{assessment.recommendations}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No health assessments yet</p>
                        <HealthAssessmentButton plantId={plant.id} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Care Schedules */}
            <CareScheduleForm
              plantId={plant.id}
              existingSchedules={plant.careSchedules.map((s) => ({
                id: s.id,
                careType: s.careType,
                intervalDays: s.intervalDays,
                enabled: s.enabled,
              }))}
            />

            {/* Upcoming Care - only show if schedules exist */}
            <UpcomingCareCard
              plantId={plant.id}
              plantName={plant.name}
              schedules={schedulesWithStatus}
            />

            {/* Plant Info */}
            <Card>
              <CardHeader>
                <CardTitle>Plant Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plant.area && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{plant.area}</p>
                  </div>
                )}
                {plant.acquiredAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date Acquired</p>
                    <p className="font-medium">
                      {new Date(plant.acquiredAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {plant.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{plant.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Species Info */}
            {plant.species && (
              <Card>
                <CardHeader>
                  <CardTitle>Care Guide</CardTitle>
                  <CardDescription>{plant.species.commonName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plant.species.description && (
                    <div>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {plant.species.description}
                      </p>
                      <Separator className="my-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Light</p>
                    <p className="font-medium">{plant.species.lightNeeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Water</p>
                    <p className="font-medium">{plant.species.waterFrequency}</p>
                  </div>
                  {plant.species.humidity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Humidity</p>
                      <p className="font-medium">{plant.species.humidity}</p>
                    </div>
                  )}
                  {plant.species.temperature && (
                    <div>
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className="font-medium">{plant.species.temperature}</p>
                    </div>
                  )}
                  {plant.species.toxicity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Toxicity</p>
                      <p className="font-medium">{plant.species.toxicity}</p>
                    </div>
                  )}
                  {plant.species.careNotes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Care Notes</p>
                      <p className="text-sm">{plant.species.careNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
