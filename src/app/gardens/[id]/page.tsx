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
import { getUserGardenRole, hasPermission } from "@/lib/garden-permissions";
import { GardenPlantPicker } from "@/components/garden-plant-picker";
import { GardenMemberList } from "@/components/garden-member-list";
import { LeaveGardenButton } from "@/components/leave-garden-button";
import { DeleteGardenButton } from "@/components/delete-garden-button";

export default async function GardenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Check user has access
  const role = await getUserGardenRole(session.user.id, id);

  if (!role) {
    notFound();
  }

  const garden = await prisma.garden.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { invitedAt: "asc" },
      },
      plants: {
        where: { deletedAt: null },
        include: {
          species: true,
          photos: { take: 1, orderBy: { createdAt: "desc" } },
          user: { select: { id: true, name: true } },
          _count: { select: { careLogs: true, assessments: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!garden) {
    notFound();
  }

  // Get user's plants that aren't in any garden (for adding to this garden)
  const userPlantsNotInGarden = await prisma.plant.findMany({
    where: {
      userId: session.user.id,
      gardenId: null,
      deletedAt: null,
    },
    include: {
      species: true,
    },
    orderBy: { name: "asc" },
  });

  const canEditGarden = hasPermission(role, "edit_garden");
  const canManagePlants = hasPermission(role, "add_plants");
  const canManageMembers = hasPermission(role, "manage_members");
  const canDelete = hasPermission(role, "delete_garden");
  const isOwner = role === "OWNER";

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link
          href="/gardens"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          All Gardens
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{garden.name}</h1>
              <Badge>
                {role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Viewer"}
              </Badge>
            </div>
            {garden.description && (
              <p className="text-muted-foreground mt-1">{garden.description}</p>
            )}
            {!isOwner && (
              <p className="text-sm text-muted-foreground mt-1">
                Owned by {garden.owner.name || garden.owner.email}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canEditGarden && (
              <Button variant="outline" asChild>
                <Link href={`/gardens/${id}/edit`}>Edit</Link>
              </Button>
            )}
            {!isOwner && <LeaveGardenButton gardenId={id} gardenName={garden.name} />}
            {canDelete && <DeleteGardenButton gardenId={id} gardenName={garden.name} />}
          </div>
        </div>

        <Tabs defaultValue="plants" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plants">
              Plants ({garden.plants.length})
            </TabsTrigger>
            <TabsTrigger value="members">
              Members ({garden.members.length + 1})
            </TabsTrigger>
          </TabsList>

          {/* Plants Tab */}
          <TabsContent value="plants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plants in this Garden</CardTitle>
                    <CardDescription>
                      {garden.plants.length === 0
                        ? "No plants added yet"
                        : `${garden.plants.length} plant${garden.plants.length === 1 ? "" : "s"}`}
                    </CardDescription>
                  </div>
                  {canManagePlants && userPlantsNotInGarden.length > 0 && (
                    <GardenPlantPicker
                      gardenId={id}
                      availablePlants={userPlantsNotInGarden}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {garden.plants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {garden.plants.map((plant) => (
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
                            <p className="text-xs text-muted-foreground/70">
                              Added by {plant.user.name || "Unknown"}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground/70">
                              <span>{plant._count.careLogs} care logs</span>
                              <span>{plant._count.assessments} assessments</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No plants in this garden yet</p>
                    {canManagePlants && userPlantsNotInGarden.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Use the &quot;Add Plant&quot; button above to add plants from your collection
                      </p>
                    )}
                    {canManagePlants && userPlantsNotInGarden.length === 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">
                          You don&apos;t have any plants available to add
                        </p>
                        <Button asChild>
                          <Link href="/plants/new">Add a New Plant</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <GardenMemberList
              gardenId={id}
              owner={garden.owner}
              members={garden.members}
              canManage={canManageMembers}
              currentUserId={session.user.id}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
