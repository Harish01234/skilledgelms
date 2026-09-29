// app/api/courses/presign/route.ts
// Step 1 of the presigned-upload flow: hand the browser a short-lived URL
// it can PUT the raw zip to, directly on B2 — this request itself carries
// no file, so it never touches Vercel's request-body size limit.
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { b2, B2_BUCKET_NAME } from "@/lib/b2";
import { getServerSession } from "@/lib/get-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fileName } = await request.json();

  if (!fileName || !fileName.toLowerCase().endsWith(".zip")) {
    return Response.json(
      { error: "A .zip fileName is required" },
      { status: 400 }
    );
  }

  // raw upload lands in its own "uploads/" prefix, separate from the
  // "courses/<id>/" prefix your extracted files end up in — this is a
  // temporary staging object, not the final course content.
  const key = `uploads/${crypto.randomUUID()}.zip`;

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    ContentType: "application/zip",
  });

  // 10 minutes is generous for a large-file upload over a slow connection
  const url = await getSignedUrl(b2, command, { expiresIn: 600 });

  return Response.json({ url, key });
}