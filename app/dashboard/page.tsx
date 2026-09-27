import { redirect } from "next/navigation";
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  CircleDashed,
  XCircle,
  CalendarDays,
  Clock,
  Award,
} from "lucide-react";

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

// Single source of truth for how each Attempt.status renders: label, icon,
// and a color pair (text+bg) used for both the badge and the card's accent
// bar, so the whole card reads as one color at a glance.
const statusConfig: Record<
  string,
  {
    label: string
    icon: typeof CheckCircle2
    text: string
    bg: string
    accent: string
  }
> = {
  "not-started": {
    label: "Not started",
    icon: CircleDashed,
    text: "text-muted-foreground",
    bg: "bg-muted",
    accent: "bg-border",
  },
  "incomplete": {
    label: "In progress",
    icon: CircleDashed,
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    accent: "bg-amber-500",
  },
  "completed": {
    label: "Completed",
    icon: CheckCircle2,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    accent: "bg-emerald-500",
  },
  "passed": {
    label: "Passed",
    icon: CheckCircle2,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    accent: "bg-emerald-500",
  },
  "failed": {
    label: "Failed",
    icon: XCircle,
    text: "text-destructive",
    bg: "bg-destructive/10",
    accent: "bg-destructive",
  },
};

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/signin");
  }

  const [enrollments, attempts] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: session.user.id },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.attempt.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const attemptByCourseId = new Map(
    attempts.map((attempt) => [attempt.courseId, attempt])
  );

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
                const attempt = attemptByCourseId.get(course.id);

                const status = attempt?.status ?? "not-started";
                const config = statusConfig[status] ?? statusConfig["not-started"];
                const StatusIcon = config.icon;

                const playUrl = "/courses/" + course.id + "/play";
                const launchLink = <a href={playUrl} />;

                const buttonLabel =
                  status === "not-started" ? "Start course" : "Resume course";

                return (
                  <Card
                    key={enrollment.id}
                    className="flex flex-col overflow-hidden py-0"
                  >
                    {/* color accent strip — same color family as the status
                        badge below, so the card's "state" reads before you
                        even read any text */}
                    <div className={`h-1.5 w-full ${config.accent}`} />

                    <div className="flex flex-1 flex-col p-6">
                      <CardHeader className="p-0">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">
                            {course.title}
                          </CardTitle>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            SCORM {course.scormVersion}
                          </Badge>
                        </div>
                        {course.description ? (
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                        ) : null}
                      </CardHeader>

                      <CardContent className="flex-1 space-y-4 p-0 pt-4">
                        {/* status pill — bigger, colored background instead
                            of a plain outline badge, so it's the first thing
                            the eye lands on */}
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.bg} ${config.text}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </div>

                        {attempt?.score !== null && attempt?.score !== undefined ? (
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            Score: <span className="font-medium">{attempt.score}</span>
                          </div>
                        ) : null}

                        <div className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Assigned{" "}
                            {new Intl.DateTimeFormat("en-US", {
                              dateStyle: "medium",
                            }).format(enrollment.enrolledAt)}
                          </div>

                          {attempt?.lastAccessedAt ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Last accessed{" "}
                              {new Intl.DateTimeFormat("en-US", {
                                dateStyle: "medium",
                              }).format(attempt.lastAccessedAt)}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>

                      <CardFooter className="p-0 pt-5">
                        <Button
                          className="w-full"
                          nativeButton={false}
                          render={launchLink}
                        >
                          <PlayCircle className="h-4 w-4" />
                          {buttonLabel}
                        </Button>
                      </CardFooter>
                    </div>
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