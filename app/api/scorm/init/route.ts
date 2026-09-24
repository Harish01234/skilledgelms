// app/api/scorm/init/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await req.json();
  if (!courseId) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  let attempt = await prisma.attempt.findFirst({
    where: { userId: session.user.id, courseId },
  });

  if (!attempt) {
    attempt = await prisma.attempt.create({
      data: { userId: session.user.id, courseId, status: "not-started" },
    });
  }

  return Response.json(attempt);
}