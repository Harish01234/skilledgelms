// app/api/attempts/route.ts
// admin reads attempts — by courseId (everyone's progress on one course)
// or by userId (one student's progress across all courses)
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const userId = searchParams.get("userId");

  const where: Record<string, string> = {};
  if (courseId) where.courseId = courseId;
  if (userId) where.userId = userId;

  const attempts = await prisma.attempt.findMany({
    where,
    include: { user: true, course: true },
    orderBy: { lastAccessedAt: "desc" },
  });

  return Response.json(attempts);
}