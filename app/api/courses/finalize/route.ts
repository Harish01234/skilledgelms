import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
  } from "@aws-sdk/client-s3";
  import * as unzipper from "unzipper";
  
  import { b2, B2_BUCKET_NAME } from "@/lib/b2";
  import { prisma } from "@/lib/prisma";
  import { getServerSession } from "@/lib/get-session";
  import { parseManifest } from "@/lib/scorm/manifestParser";
  
  export const runtime = "nodejs";
  export const maxDuration = 300;
  
  // ---------------------------------------------------------
  // Upload configuration
  // ---------------------------------------------------------
  
  const CONCURRENCY = 10;
  const MAX_RETRIES = 4;
  
  const RETRY_DELAYS = [
    1000,
    2000,
    4000,
    8000,
  ];
  
  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  function getContentType(filePath: string): string {
    const extension = filePath
      .split(".")
      .pop()
      ?.toLowerCase();
  
    switch (extension) {
      case "html":
      case "htm":
        return "text/html";
  
      case "css":
        return "text/css";
  
      case "js":
        return "application/javascript";
  
      case "json":
        return "application/json";
  
      case "xml":
        return "application/xml";
  
      case "svg":
        return "image/svg+xml";
  
      case "png":
        return "image/png";
  
      case "jpg":
      case "jpeg":
        return "image/jpeg";
  
      case "gif":
        return "image/gif";
  
      case "webp":
        return "image/webp";
  
      case "mp3":
        return "audio/mpeg";
  
      case "wav":
        return "audio/wav";
  
      case "mp4":
        return "video/mp4";
  
      case "webm":
        return "video/webm";
  
      case "pdf":
        return "application/pdf";
  
      case "woff":
        return "font/woff";
  
      case "woff2":
        return "font/woff2";
  
      case "ttf":
        return "font/ttf";
  
      case "ico":
        return "image/x-icon";
  
      default:
        return "application/octet-stream";
    }
  }
  
  // ---------------------------------------------------------
  // Upload one file with retry
  // ---------------------------------------------------------
  
  async function uploadFileWithRetry(
    file: unzipper.File,
    storageBasePath: string
  ) {
    let lastError: unknown;
  
    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {
      try {
        const fileBuffer = await file.buffer();
  
        const key = `${storageBasePath}/${file.path}`;
  
        await b2.send(
          new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: getContentType(file.path),
          })
        );
  
        return key;
      } catch (error) {
        lastError = error;
  
        console.error(
          `[B2 UPLOAD] Failed ${file.path} ` +
            `attempt ${attempt}/${MAX_RETRIES}`,
          error
        );
  
        if (attempt === MAX_RETRIES) {
          break;
        }
  
        const delay =
          RETRY_DELAYS[attempt - 1] ??
          RETRY_DELAYS[RETRY_DELAYS.length - 1];
  
        console.log(
          `[B2 UPLOAD] Retrying ${file.path} ` +
            `in ${delay}ms`
        );
  
        await sleep(delay);
      }
    }
  
    throw lastError;
  }
  
  // ---------------------------------------------------------
  // Upload all files with controlled concurrency
  // ---------------------------------------------------------
  
  async function uploadFiles(
    files: unzipper.File[],
    storageBasePath: string,
    onProgress?: (progress: {
      uploadedFiles: number;
      totalFiles: number;
      currentFile: string;
    }) => void
  ) {
    let uploadedFiles = 0;
  
    for (
      let start = 0;
      start < files.length;
      start += CONCURRENCY
    ) {
      const batch = files.slice(
        start,
        start + CONCURRENCY
      );
  
      console.log(
        `[B2 UPLOAD] Batch ${
          Math.floor(start / CONCURRENCY) + 1
        } started ` +
          `(${batch.length} files)`
      );
  
      await Promise.all(
        batch.map(async (file) => {
          await uploadFileWithRetry(
            file,
            storageBasePath
          );
  
          uploadedFiles++;
  
          onProgress?.({
            uploadedFiles,
            totalFiles: files.length,
            currentFile: file.path,
          });
        })
      );
  
      console.log(
        `[B2 UPLOAD] Batch completed: ` +
          `${uploadedFiles}/${files.length}`
      );
    }
  
    return storageBasePath;
  }
  
  // ---------------------------------------------------------
  // POST /api/courses/finalize
  // ---------------------------------------------------------
  
  export async function POST(request: Request) {
    const startedAt = Date.now();
  
    let createdCourseId: string | null = null;
  
    const log = (message: string) => {
      console.log(
        `[FINALIZE +${(
          (Date.now() - startedAt) /
          1000
        ).toFixed(1)}s] ${message}`
      );
    };
  
    try {
      // -------------------------------------------------------
      // 1. Authentication
      // -------------------------------------------------------
  
      log("Checking session...");
  
      const session = await getServerSession();
  
      if (!session?.user) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
  
      if (session.user.role !== "admin") {
        return Response.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
  
      // -------------------------------------------------------
      // 2. Request body
      // -------------------------------------------------------
  
      const body = await request.json();
  
      const {
        key,
        title,
        description,
      }: {
        key?: string;
        title?: string;
        description?: string;
      } = body;
  
      if (!key || !title) {
        return Response.json(
          {
            error: "key and title are required",
          },
          { status: 400 }
        );
      }
  
      // -------------------------------------------------------
      // 3. Validate temporary ZIP key
      // -------------------------------------------------------
  
      if (
        !key.startsWith("uploads/") ||
        !key.toLowerCase().endsWith(".zip")
      ) {
        return Response.json(
          {
            error: "Invalid upload key",
          },
          { status: 400 }
        );
      }
  
      log(`Starting finalize: ${key}`);
  
      // -------------------------------------------------------
      // 4. Download ZIP from B2
      // -------------------------------------------------------
  
      log("Downloading ZIP from B2...");
  
      const downloadStartedAt = Date.now();
  
      const object = await b2.send(
        new GetObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: key,
        })
      );
  
      if (!object.Body) {
        throw new Error(
          "Could not read uploaded ZIP from B2"
        );
      }
  
      const bytes =
        await object.Body.transformToByteArray();
  
      const zipBuffer = Buffer.from(bytes);
  
      log(
        `ZIP downloaded: ${(
          zipBuffer.length /
          1024 /
          1024
        ).toFixed(2)} MB in ${(
          (Date.now() - downloadStartedAt) /
          1000
        ).toFixed(1)}s`
      );
  
      // -------------------------------------------------------
      // 5. Open ZIP
      // -------------------------------------------------------
  
      log("Opening ZIP...");
  
      const directory =
        await unzipper.Open.buffer(zipBuffer);
  
      const files = directory.files.filter(
        (entry) => entry.type !== "Directory"
      );
  
      log(`Found ${files.length} files`);
  
      if (files.length === 0) {
        throw new Error(
          "The uploaded ZIP contains no files"
        );
      }
  
      // -------------------------------------------------------
      // 6. Parse SCORM manifest
      // -------------------------------------------------------
  
      log("Parsing SCORM manifest...");
  
      const {
        entryPoint,
        scormVersion,
      } = await parseManifest(files);
  
      log(
        `SCORM ${scormVersion}, entry point: ${entryPoint}`
      );
  
      // -------------------------------------------------------
      // 7. Create course FIRST
      //
      // We need course.id before uploading files because
      // the SCORM content API expects:
      //
      // courses/{courseId}/{filePath}
      // -------------------------------------------------------
  
      log("Creating course record...");
  
      const course = await prisma.course.create({
        data: {
          title,
          description: description || null,
          scormVersion,
          entryPoint,
  
          // Temporary value.
          // We update it immediately after creation.
          storageBasePath: "",
  
          status: "draft",
          createdById: session.user.id,
        },
      });
  
      createdCourseId = course.id;
  
      // -------------------------------------------------------
      // 8. IMPORTANT:
      // This MUST match the B2 content API:
      //
      // app/api/b2/scorm/content/[courseId]/[...filePath]
      //
      // which requests:
      //
      // courses/{courseId}/{filePath}
      // -------------------------------------------------------
  
      const storageBasePath =
        `courses/${course.id}`;
  
      log(
        `Storage base path: ${storageBasePath}`
      );
  
      // -------------------------------------------------------
      // 9. Upload extracted SCORM files
      // -------------------------------------------------------
  
      log(
        `Starting upload of ${files.length} files ` +
          `with concurrency=${CONCURRENCY}`
      );
  
      const uploadStartedAt = Date.now();
  
      await uploadFiles(
        files,
        storageBasePath,
        (progress) => {
          log(
            `Upload progress: ${JSON.stringify(
              progress
            )}`
          );
        }
      );
  
      log(
        `All files uploaded in ${(
          (Date.now() - uploadStartedAt) /
          1000
        ).toFixed(1)}s`
      );
  
      // -------------------------------------------------------
      // 10. Update course with final storage path
      // -------------------------------------------------------
  
      log("Updating course storage path...");
  
      const updatedCourse =
        await prisma.course.update({
          where: {
            id: course.id,
          },
          data: {
            storageBasePath,
          },
        });
  
      // -------------------------------------------------------
      // 11. Delete temporary ZIP
      // -------------------------------------------------------
  
      log("Deleting temporary ZIP...");
  
      try {
        await b2.send(
          new DeleteObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key,
          })
        );
  
        log("Temporary ZIP deleted.");
      } catch (deleteError) {
        // Course is already successfully created.
        // Don't fail the request because cleanup failed.
        console.error(
          "[FINALIZE] Failed to delete temporary ZIP:",
          deleteError
        );
      }
  
      // -------------------------------------------------------
      // 12. Success
      // -------------------------------------------------------
  
      const totalSeconds =
        (Date.now() - startedAt) / 1000;
  
      log(
        `FINALIZE COMPLETE in ${totalSeconds.toFixed(
          1
        )}s`
      );
  
      return Response.json(updatedCourse, {
        status: 201,
      });
    } catch (error) {
      const totalSeconds =
        (Date.now() - startedAt) / 1000;
  
      console.error(
        `[FINALIZE FAILED after ${totalSeconds.toFixed(
          1
        )}s]`,
        error
      );
  
      // -------------------------------------------------------
      // Cleanup partially-created course
      // -------------------------------------------------------
  
      if (createdCourseId) {
        try {
          await prisma.course.delete({
            where: {
              id: createdCourseId,
            },
          });
  
          console.log(
            `[FINALIZE] Deleted incomplete course ${createdCourseId}`
          );
        } catch (cleanupError) {
          console.error(
            "[FINALIZE] Failed to delete incomplete course:",
            cleanupError
          );
        }
      }
  
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error";
  
      return Response.json(
        {
          error: "Failed to process uploaded package",
          details:
            process.env.NODE_ENV === "development"
              ? errorMessage
              : undefined,
        },
        { status: 500 }
      );
    }
  }