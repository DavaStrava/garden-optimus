import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { PlantForm } from "@/components/plant-form";
import { PageHeader } from "@/components/page-header";

export default async function EditPlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const [plant, species] = await Promise.all([
    prisma.plant.findFirst({
      where: { id, userId: session.user.id },
    }),
    prisma.plantSpecies.findMany({
      orderBy: { commonName: "asc" },
    }),
  ]);

  if (!plant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <PageHeader
          title="Edit Plant"
          backHref={`/plants/${id}`}
          backLabel="Back to Plant"
        />
        <PlantForm species={species} plant={plant} />
      </main>
    </div>
  );
}
