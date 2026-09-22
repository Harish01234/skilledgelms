// app/api/courses/[courseId]/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  return Response.json(course);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { courseId } = await params;
  const body = await req.json();
  const { title, description, thumbnailUrl, status } = body;

  const course = await prisma.course.update({
    where: { id: courseId },
    data: { title, description, thumbnailUrl, status },
  });

  return Response.json(course);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { courseId } = await params;

  await prisma.course.delete({ where: { id: courseId } });

  return Response.json({ success: true });
}