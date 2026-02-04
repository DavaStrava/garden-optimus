import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/header";
import { GardenForm } from "@/components/garden-form";
import { getUserGardenRole, hasPermission } from "@/lib/garden-permissions";

export default async function EditGardenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Check user has edit permission
  const role = await getUserGardenRole(session.user.id, id);

  if (!role || !hasPermission(role, "edit_garden")) {
    notFound();
  }

  const garden = await prisma.garden.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  if (!garden) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link
          href={`/gardens/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Garden
        </Link>

        <div className="max-w-lg">
          <GardenForm mode="edit" initialData={garden} />
        </div>
      </main>
    </div>
  );
}
