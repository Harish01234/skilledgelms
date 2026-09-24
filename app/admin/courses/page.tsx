import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CourseUploadDialog } from "@/components/course-upload-dialog";
import { CourseRowActions } from "@/components/course-row-actions";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Courses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload SCORM packages and manage what learners can see.
          </p>
        </div>
        <CourseUploadDialog />
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No courses yet. Upload a SCORM package to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>SCORM version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium text-foreground">
                    {course.title} 
                  </TableCell>

                  <TableCell>
                    {course.scormVersion}
                  </TableCell>
                  
                
                  <TableCell>
                    <Badge variant={statusVariant[course.status] ?? "outline"}>
                      {course.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                    }).format(course.createdAt)}
                  </TableCell>


                  <TableCell className="text-right">
                    <CourseRowActions
                      courseId={course.id}
                      status={course.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}