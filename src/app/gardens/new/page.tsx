import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/header";
import { GardenForm } from "@/components/garden-form";

export default async function NewGardenPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/gardens"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          All Gardens
        </Link>

        <div className="max-w-lg">
          <GardenForm mode="create" />
        </div>
      </main>
    </div>
  );
}
