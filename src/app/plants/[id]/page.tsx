import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
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
    where: { id, userId: session.user.id },
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

  // Calculate status for each schedule
  const schedulesWithStatus = plant.careSchedules.map((schedule) => ({
    ...schedule,
    statusInfo: getReminderStatus(schedule.nextDueDate),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
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
              <p className="text-gray-500 mt-1">&quot;{plant.nickname}&quot;</p>
            )}
            {plant.species && (
              <p className="text-gray-600 dark:text-gray-400">
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
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                                <p className="text-sm text-gray-500">Amount: {log.amount}</p>
                              )}
                              {log.notes && (
                                <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(log.loggedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No care logs yet</p>
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
                              <span className="text-xs text-gray-500">
                                {new Date(assessment.assessedAt).toLocaleString()}
                              </span>
                            </div>
                            {assessment.issues && (
                              <div className="mb-2">
                                <p className="text-sm font-medium">Issues identified:</p>
                                <p className="text-sm text-gray-600">{assessment.issues}</p>
                              </div>
                            )}
                            {assessment.recommendations && (
                              <div>
                                <p className="text-sm font-medium">Recommendations:</p>
                                <p className="text-sm text-gray-600">{assessment.recommendations}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No health assessments yet</p>
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
            {schedulesWithStatus.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Upcoming Care</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedulesWithStatus
                    .filter((s) => s.enabled)
                    .map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {schedule.careType === "WATERING" && "💧 "}
                          {schedule.careType === "FERTILIZING" && "🌿 "}
                          {schedule.careType === "REPOTTING" && "🪴 "}
                          {schedule.careType === "PRUNING" && "✂️ "}
                          {schedule.careType === "PEST_TREATMENT" && "🐛 "}
                          {schedule.careType === "OTHER" && "📝 "}
                          {schedule.careType.charAt(0) +
                            schedule.careType.slice(1).toLowerCase().replace("_", " ")}
                        </span>
                        <ReminderStatusBadge
                          status={schedule.statusInfo.status}
                          label={schedule.statusInfo.label}
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Plant Info */}
            <Card>
              <CardHeader>
                <CardTitle>Plant Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plant.area && (
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{plant.area}</p>
                  </div>
                )}
                {plant.acquiredAt && (
                  <div>
                    <p className="text-sm text-gray-500">Date Acquired</p>
                    <p className="font-medium">
                      {new Date(plant.acquiredAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {plant.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
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
                  <div>
                    <p className="text-sm text-gray-500">Light</p>
                    <p className="font-medium">{plant.species.lightNeeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Water</p>
                    <p className="font-medium">{plant.species.waterFrequency}</p>
                  </div>
                  {plant.species.humidity && (
                    <div>
                      <p className="text-sm text-gray-500">Humidity</p>
                      <p className="font-medium">{plant.species.humidity}</p>
                    </div>
                  )}
                  {plant.species.temperature && (
                    <div>
                      <p className="text-sm text-gray-500">Temperature</p>
                      <p className="font-medium">{plant.species.temperature}</p>
                    </div>
                  )}
                  {plant.species.toxicity && (
                    <div>
                      <p className="text-sm text-gray-500">Toxicity</p>
                      <p className="font-medium">{plant.species.toxicity}</p>
                    </div>
                  )}
                  {plant.species.careNotes && (
                    <div>
                      <p className="text-sm text-gray-500">Care Notes</p>
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
