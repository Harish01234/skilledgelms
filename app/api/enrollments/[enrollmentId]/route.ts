// app/api/enrollments/[enrollmentId]/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const session = await getServerSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { enrollmentId } = await params;

  await prisma.enrollment.delete({ where: { id: enrollmentId } });

  return Response.json({ success: true });
}