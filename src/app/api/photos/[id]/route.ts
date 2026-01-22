import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePhoto } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find the photo and verify ownership
    const photo = await prisma.plantPhoto.findFirst({
      where: { id },
      include: { plant: true },
    });

    if (!photo || photo.plant.userId !== session.user.id) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete file from storage
    try {
      await deletePhoto(photo.url);
    } catch (err) {
      console.error("Error deleting file from storage:", err);
    }

    // Delete from database
    await prisma.plantPhoto.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
