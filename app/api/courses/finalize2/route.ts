// app/api/courses/finalize/route.ts
//
// Step 3 of the presigned-upload flow. This route used to do all the
// heavy work itself (download, unzip, upload, save). Now it only starts
// the workflow and answers right away with a run id — the actual work
// happens in the background in workflows/finalize-course.ts.
import { start } from "workflow/api";

import { getServerSession } from "@/lib/get-session";
import { finalizeCourseWorkflow } from "@/workflows/finalize-course";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { key, title, description } = body;

  if (!key || !title) {
    return Response.json(
      { error: "key and title are required" },
      { status: 400 }
    );
  }

  if (!key.startsWith("uploads/") || !key.toLowerCase().endsWith(".zip")) {
    return Response.json({ error: "Invalid upload key" }, { status: 400 });
  }

  const run = await start(finalizeCourseWorkflow, [
    {
      key,
      title,
      description: description || null,
      userId: session.user.id,
    },
  ]);

  // 202 = accepted, still processing — not 201, since nothing is
  // actually created yet at this point
  return Response.json({ runId: run.runId }, { status: 202 });
}