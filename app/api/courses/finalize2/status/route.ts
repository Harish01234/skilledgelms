// app/api/courses/finalize/status/route.ts
//
// The upload dialog calls this every couple of seconds after starting
// the workflow, to ask: "is it done yet?"
import { getRun } from "workflow/api";

import { getServerSession } from "@/lib/get-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const runId = new URL(request.url).searchParams.get("runId");

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const run = getRun(runId);
  const status = await run.status;

  if (status === "completed") {
    const result = await run.returnValue; // { courseId }
    return Response.json({ status, result });
  }

  if (status === "failed") {
    return Response.json({ status, error: "Processing failed" });
  }

  // "running" or any other in-progress state
  return Response.json({ status });
}