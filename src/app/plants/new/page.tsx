import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { PlantForm } from "@/components/plant-form";

export default async function NewPlantPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const species = await prisma.plantSpecies.findMany({
    orderBy: { commonName: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Add New Plant</h1>
        <PlantForm species={species} />
      </main>
    </div>
  );
}
