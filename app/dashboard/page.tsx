import { redirect } from "next/navigation";
import { BookOpen, PlayCircle } from "lucide-react";

import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/signin");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div className="min-h-svh bg-background">
     
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here is what is happening with your account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{session.user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Signed in</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Assigned courses
            </h2>
            <p className="text-sm text-muted-foreground">
              Training courses that have been assigned to you.
            </p>
          </div>

          {enrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No courses have been assigned to you yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => {
                const course = enrollment.course;

                const playUrl = "/courses/" + course.id + "/play";

                const launchLink = (
                  <a href={playUrl} />
                );

                return (
                  <Card key={enrollment.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {course.title}
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0">
                          SCORM {course.scormVersion}
                        </Badge>
                      </div>
                      {course.description ? (
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>

                    <CardContent className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Assigned{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                        }).format(enrollment.enrolledAt)}
                      </p>
                    </CardContent>

                    <CardFooter>
                      <Button className="w-full" nativeButton={false} render={launchLink}>
                        <PlayCircle className="h-4 w-4" />
                        Launch course
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}