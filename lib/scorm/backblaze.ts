// lib/scorm/backblaze.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { File as ZipEntry } from "unzipper";
import { b2, B2_BUCKET_NAME } from "@/lib/b2";

type ProgressCallback = (data: {
  uploadedFiles: number;
  totalFiles: number;
  currentFile: string;
}) => void;

export async function extractAndUpload(
  files: ZipEntry[],
  courseId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const totalFiles = files.length;
  const batchSize = 40;
  let uploadedFiles = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (entry) => {
        const entryPath = entry.path.replace(/\\/g, "/");
        const pathParts = entryPath.split("/");

        if (entryPath.startsWith("/") || pathParts.includes("..")) {
          throw new Error(`Unsafe ZIP path: ${entryPath}`);
        }

        const content = await entry.buffer();
        const key = `courses/${courseId}/${entryPath}`;

        await b2.send(
          new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key,
            Body: content,
            ContentType: getContentType(entryPath),
          })
        );

        uploadedFiles++;
        onProgress?.({ uploadedFiles, totalFiles, currentFile: entryPath });
      })
    );
  }

  return `courses/${courseId}/`;
}

function getContentType(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";

  const contentTypes: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
  };

  return contentTypes[extension] ?? "application/octet-stream";
}