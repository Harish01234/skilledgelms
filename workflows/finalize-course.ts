import { FatalError } from "workflow";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import * as unzipper from "unzipper";
import crypto from "crypto";

import { b2, B2_BUCKET_NAME } from "@/lib/b2";
import { prisma } from "@/lib/prisma";
import { parseManifest } from "@/lib/scorm/manifestParser";

// ---------------------------------------------------------
// same config you already had
// ---------------------------------------------------------

const CONCURRENCY = 10;
const MAX_RETRIES = 4;
const RETRY_DELAYS = [1000, 2000, 4000, 8000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getContentType(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();

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
// THE WORKFLOW: only decides the order. Everything below marked
// "use step" is a step Vercel runs and retries on its own.
// ---------------------------------------------------------

type FinalizeInput = {
  key: string; // where the raw zip is sitting in B2, e.g. uploads/xxxx.zip
  title: string;
  description: string | null;
  userId: string;
};

export async function finalizeCourseWorkflow(input: FinalizeInput) {
  "use workflow";

  // 1. ONE step does everything that needs the zip's bytes: download it
  //    (once), read the manifest, upload every file. This used to be
  //    spread across readPackage + one uploadBatch step per 10 files,
  //    which meant the whole 200MB zip got re-downloaded from B2 once
  //    per batch — for a 90-file package that's 9 full re-downloads,
  //    which is what blew through the B2 daily download cap.
  // a step of its own, not generated directly in the workflow function —
  // "use workflow" code can't use Node modules like crypto at all, and a
  // step's result is cached as soon as it succeeds, so this never
  // re-generates on a later retry elsewhere in the workflow
  const courseId = await generateCourseId();

  const { entryPoint, scormVersion, storageBasePath } = await processPackage(
    input.key,
    courseId
  );

  // 2. small step, no zip involved — just a database write
  await saveCourse({
    courseId,
    title: input.title,
    description: input.description,
    userId: input.userId,
    entryPoint,
    scormVersion,
    storageBasePath,
  });

  // 3. remove the temporary zip
  await deleteStagingZip(input.key);

  return { courseId };
}

// ---------------------------------------------------------
// STEP: just generates an id. This has to be a step (not plain code in
// the workflow function) because crypto is a Node module and only steps
// run in Node. It can never fail, so once it succeeds its result is
// cached and this never runs a second time for this run.
// ---------------------------------------------------------

async function generateCourseId() {
  "use step";

  return crypto.randomUUID();
}

// ---------------------------------------------------------
// STEP: download the zip ONCE, parse the manifest, upload every
// file. Internally still uploads in batches of 10 with your same
// per-file retry logic — that part didn't need to change, only how
// many times the zip itself gets downloaded.
// ---------------------------------------------------------

async function processPackage(key: string, courseId: string) {
  "use step";

  // ---- download once ----
  const object = await b2.send(new GetObjectCommand({ Bucket: B2_BUCKET_NAME, Key: key }));

  if (!object.Body) {
    throw new FatalError("Could not read uploaded ZIP from B2");
  }

  const bytes = await object.Body.transformToByteArray();
  const zipBuffer = Buffer.from(bytes);

  const directory = await unzipper.Open.buffer(zipBuffer);
  const files = directory.files.filter((entry) => entry.type !== "Directory");

  if (files.length === 0) {
    throw new FatalError("The uploaded ZIP contains no files");
  }

  // ---- parse manifest ----
  let entryPoint: string;
  let scormVersion: string;

  try {
    const parsed = await parseManifest(files);
    entryPoint = parsed.entryPoint;
    scormVersion = parsed.scormVersion;
  } catch (error) {
    // a broken package or missing manifest will never fix itself on retry
    throw new FatalError(
      error instanceof Error ? error.message : "Invalid SCORM package"
    );
  }

  // ---- upload every file, same batching + retry as before ----
  const storageBasePath = "courses/" + courseId;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((file) => uploadFileWithRetry(file, storageBasePath)));
  }

  return { entryPoint, scormVersion, storageBasePath };
}

async function uploadFileWithRetry(file: unzipper.File, storageBasePath: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fileBuffer = await file.buffer();
      const key = storageBasePath + "/" + file.path;

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

      if (attempt === MAX_RETRIES) break;

      const delay = RETRY_DELAYS[attempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await sleep(delay);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------
// STEP: save the course row — runs after every file is already
// uploaded, so this can include the real storageBasePath immediately
// ---------------------------------------------------------

async function saveCourse(input: {
  courseId: string;
  title: string;
  description: string | null;
  userId: string;
  entryPoint: string;
  scormVersion: string;
  storageBasePath: string;
}) {
  "use step";

  await prisma.course.create({
    data: {
      id: input.courseId,
      title: input.title,
      description: input.description,
      scormVersion: input.scormVersion,
      entryPoint: input.entryPoint,
      storageBasePath: input.storageBasePath,
      status: "draft",
      createdById: input.userId,
    },
  });
}

// ---------------------------------------------------------
// STEP: delete the temporary zip
// ---------------------------------------------------------

async function deleteStagingZip(key: string) {
  "use step";

  try {
    await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET_NAME, Key: key }));
  } catch (error) {
    // don't fail the whole run just because cleanup of the temp zip failed
    console.error("[FINALIZE] Failed to delete temporary ZIP:", error);
  }
}