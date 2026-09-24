// app/api/enrollments/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { courseId, userId } = await req.json();

  if (!userId || !courseId) {
    return Response.json(
      { error: "userId and courseId are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) {
    return Response.json({ error: "Already enrolled" }, { status: 409 });
  }

  const enrollment = await prisma.enrollment.create({
    data: { userId, courseId },
  });

  return Response.json(enrollment, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  // admin viewing a specific course's enrollments; student sees only their own
  const where =
    session.user.role === "admin" && courseId
      ? { courseId }
      : { userId: session.user.id };

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: { user: true, course: true },
  });

  return Response.json(enrollments);
}