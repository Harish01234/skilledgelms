// app/api/scorm/attempt/route.ts
// student reads their OWN attempt for one course — e.g. dashboard progress
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { userId: session.user.id, courseId },
  });

  return Response.json(attempt);
}