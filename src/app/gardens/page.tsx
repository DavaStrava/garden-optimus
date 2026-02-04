import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Flower2 } from "lucide-react";

export default async function GardensPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Get gardens the user owns
  const ownedGardens = await prisma.garden.findMany({
    where: { ownerId: session.user.id },
    include: {
      _count: { select: { plants: { where: { deletedAt: null } }, members: true } },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get gardens the user is a member of
  const memberships = await prisma.gardenMember.findMany({
    where: { userId: session.user.id },
    include: {
      garden: {
        include: {
          _count: { select: { plants: { where: { deletedAt: null } }, members: true } },
          owner: { select: { name: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  const ownedGardensWithRole = ownedGardens.map((garden) => ({
    ...garden,
    role: "OWNER" as const,
  }));

  const sharedGardens = memberships.map((m) => ({
    ...m.garden,
    role: m.role,
  }));

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gardens</h1>
            <p className="text-muted-foreground mt-1">
              Organize your plants into collections and share with others
            </p>
          </div>
          <Button asChild>
            <Link href="/gardens/new">
              <Plus className="h-4 w-4 mr-2" />
              New Garden
            </Link>
          </Button>
        </div>

        {/* My Gardens */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">My Gardens</h2>
          {ownedGardensWithRole.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedGardensWithRole.map((garden) => (
                <Link key={garden.id} href={`/gardens/${garden.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{garden.name}</CardTitle>
                          {garden.description && (
                            <CardDescription className="line-clamp-2">
                              {garden.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge>Owner</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flower2 className="h-4 w-4" />
                          {garden._count.plants} plants
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {garden._count.members} members
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">You haven&apos;t created any gardens yet</p>
                <Button asChild>
                  <Link href="/gardens/new">Create Your First Garden</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Shared with Me */}
        {sharedGardens.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Shared with Me</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedGardens.map((garden) => (
                <Link key={garden.id} href={`/gardens/${garden.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{garden.name}</CardTitle>
                          {garden.description && (
                            <CardDescription className="line-clamp-2">
                              {garden.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {garden.role === "ADMIN" ? "Admin" : "Viewer"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flower2 className="h-4 w-4" />
                          {garden._count.plants} plants
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {garden._count.members + 1} people
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        Owned by {garden.owner.name}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
