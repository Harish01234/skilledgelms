// app/api/courses/route.ts
import crypto from "crypto";
import * as unzipper from "unzipper";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";
import { parseManifest } from "@/lib/scorm/manifestParser";
import { extractAndUpload } from "@/lib/scorm/backblaze";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
      };

      try {
        // 1. Receive ZIP + course fields
        const formData = await request.formData();
        const file = formData.get("file");
        const title = formData.get("title") as string;
        const description = formData.get("description") as string | null;

        if (!(file instanceof File)) {
          send({ type: "error", message: "SCORM ZIP file is required" });
          controller.close();
          return;
        }
        if (!file.name.toLowerCase().endsWith(".zip")) {
          send({ type: "error", message: "Only ZIP files are allowed" });
          controller.close();
          return;
        }
        if (!title) {
          send({ type: "error", message: "Title is required" });
          controller.close();
          return;
        }

        // 2. Open ZIP once
        const courseId = crypto.randomUUID();
        const arrayBuffer = await file.arrayBuffer();
        const zipBuffer = Buffer.from(arrayBuffer);
        const directory = await unzipper.Open.buffer(zipBuffer);
        const files = directory.files.filter(
          (entry) => entry.type !== "Directory"
        );

        send({
          type: "started",
          courseId,
          totalFiles: files.length,
          fileName: file.name,
        });

        // 3. Parse manifest (pure function, reused elsewhere later)
        const { entryPoint, scormVersion } = await parseManifest(files);

        // 4. Upload to B2, 40 files per batch, streaming progress back
        const storageBasePath = await extractAndUpload(
          files,
          courseId,
          (progress) => {
            const percent = Math.round(
              (progress.uploadedFiles / progress.totalFiles) * 100
            );
            send({ type: "progress", ...progress, percent });
          }
        );

        // 5. Save Course row
        const course = await prisma.course.create({
          data: {
            title,
            description,
            scormVersion,
            entryPoint,
            storageBasePath,
            status: "draft",
            createdById: session.user.id,
          },
        });

        // 6. Done
        send({ type: "complete", success: true, course });
        controller.close();
      } catch (error) {
        console.error("SCORM upload failed:", error);
        send({ type: "error", message: "Failed to upload SCORM package" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function GET(req: Request) {
  const session = await getServerSession();
  const isAdmin = session?.user?.role === "admin";

  const courses = await prisma.course.findMany({
    where: isAdmin ? {} : { status: "published" },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(courses);
}