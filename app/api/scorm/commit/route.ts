// app/api/scorm/commit/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { attemptId, status, score, lessonLocation, suspendData, sessionTime } = body;

  if (!attemptId) {
    return Response.json({ error: "attemptId is required" }, { status: 400 });
  }

  const attempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status,
      score,
      lessonLocation,
      suspendData,
      sessionTime,
      lastAccessedAt: new Date(),
      ...(status === "completed" && { completedAt: new Date() }),
    },
  });

  return Response.json(attempt);
}