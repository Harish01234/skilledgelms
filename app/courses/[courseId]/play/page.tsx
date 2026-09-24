// app/courses/[courseId]/play/page.tsx
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import ScormPlayer from "@/components/ScormPlayer";
import ScormPlayerV2 from "@/components/scorm-player-v2";
export default async function PlayCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const session = await getServerSession();
  if (!session) {
    redirect("/signin");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    notFound();
  }

  // only admins or an enrolled student may play this course
  if (session.user.role !== "admin") {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      redirect("/dashboard");
    }
  }

  const folderId = course.storageBasePath
    .replace(/^courses\//, "")
    .replace(/\/$/, "");

  const launchUrl =
    "/api/b2/scorm/content/" + folderId + "/" + course.entryPoint;

  return (
    <div className="min-h-svh bg-background">
      
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {course.title}
          </h1>
          {course.description ? (
            <p className="text-sm text-muted-foreground">
              {course.description}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <ScormPlayerV2 launchUrl={launchUrl} courseId={courseId} />
        </div>
      </main>
    </div>
  );
}