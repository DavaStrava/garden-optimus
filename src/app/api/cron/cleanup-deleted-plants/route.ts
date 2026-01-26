import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePhoto } from "@/lib/storage";
import { TRASH_RETENTION_DAYS } from "@/lib/soft-delete";

/**
 * GET /api/cron/cleanup-deleted-plants
 * Cron job to permanently delete plants that have been in trash for more than 7 days.
 * This endpoint is called by Vercel Cron.
 *
 * Security: Vercel Cron automatically sends CRON_SECRET in the Authorization header.
 */
export async function GET(request: Request) {
  // Verify this is a legitimate cron request (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Calculate the cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);

    // Find all plants that have been deleted for more than 7 days
    const expiredPlants = await prisma.plant.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
      include: {
        photos: true,
        assessments: true,
      },
    });

    console.log(`[Cron] Found ${expiredPlants.length} expired plants to clean up`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const plant of expiredPlants) {
      try {
        // Collect all photo URLs
        const photoUrls: string[] = [];

        for (const photo of plant.photos) {
          photoUrls.push(photo.url);
        }

        for (const assessment of plant.assessments) {
          if (assessment.photoUrl) {
            photoUrls.push(assessment.photoUrl);
          }
        }

        // Delete photos from storage
        for (const url of photoUrls) {
          try {
            await deletePhoto(url);
          } catch (err) {
            console.error(`[Cron] Failed to delete photo: ${url}`, err);
          }
        }

        // Hard delete the plant (cascades to related records)
        await prisma.plant.delete({ where: { id: plant.id } });
        deletedCount++;

        console.log(`[Cron] Permanently deleted plant: ${plant.id} (${plant.name})`);
      } catch (err) {
        console.error(`[Cron] Error deleting plant ${plant.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} plants, ${errorCount} errors.`,
      deletedCount,
      errorCount,
    });
  } catch (error) {
    console.error("[Cron] Error in cleanup job:", error);
    return NextResponse.json(
      { error: "Cleanup job failed" },
      { status: 500 }
    );
  }
}
