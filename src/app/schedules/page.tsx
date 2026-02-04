import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Header } from "@/components/header";
import { ScheduleList } from "@/components/schedule-list";
import { getReminderStatus } from "@/lib/care-reminders";

export default async function SchedulesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const schedules = await prisma.careSchedule.findMany({
    where: {
      enabled: true,
      plant: {
        userId: session.user.id,
        deletedAt: null,
      },
    },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { nextDueDate: "asc" },
  });

  const schedulesWithStatus = schedules.map((schedule) => ({
    id: schedule.id,
    careType: schedule.careType,
    intervalDays: schedule.intervalDays,
    nextDueDate: schedule.nextDueDate.toISOString(),
    plant: schedule.plant,
    statusInfo: getReminderStatus(schedule.nextDueDate),
  }));

  return (
    <div className="min-h-screen bg-muted/50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-7 w-7 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Schedules</h1>
          </div>
        </div>

        {schedulesWithStatus.length > 0 ? (
          <ScheduleList schedules={schedulesWithStatus} />
        ) : (
          <div className="text-center py-16">
            <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No care schedules yet</h2>
            <p className="text-muted-foreground mb-4">
              Set up care reminders on your plant detail pages to see them here.
            </p>
            <Link
              href="/plants"
              className="text-primary hover:underline font-medium"
            >
              Go to My Plants
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
