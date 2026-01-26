import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deletePhoto } from "@/lib/storage";

/**
 * DELETE /api/plants/[id]/permanent
 * Permanently delete a plant and all associated data (photos, care logs, assessments, schedules).
 * Only works on plants that are already soft-deleted (in trash).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the deleted plant owned by this user (must be in trash)
  const deletedPlant = await prisma.plant.findFirst({
    where: {
      id,
      userId: session.user.id,
      deletedAt: { not: null },
    },
    include: {
      photos: true,
      assessments: true,
    },
  });

  if (!deletedPlant) {
    return NextResponse.json(
      { error: "Deleted plant not found" },
      { status: 404 }
    );
  }

  try {
    // Collect all photo URLs to delete from storage
    const photoUrls: string[] = [];

    // Plant photos
    for (const photo of deletedPlant.photos) {
      photoUrls.push(photo.url);
    }

    // Assessment photos
    for (const assessment of deletedPlant.assessments) {
      if (assessment.photoUrl) {
        photoUrls.push(assessment.photoUrl);
      }
    }

    // Delete photos from storage (do this before database deletion)
    const deletePromises = photoUrls.map((url) =>
      deletePhoto(url).catch((err) => {
        console.error(`Failed to delete photo from storage: ${url}`, err);
        // Continue even if storage deletion fails
      })
    );
    await Promise.all(deletePromises);

    // Hard delete the plant (cascades to photos, care logs, assessments, schedules)
    await prisma.plant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting plant:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete plant" },
      { status: 500 }
    );
  }
}
