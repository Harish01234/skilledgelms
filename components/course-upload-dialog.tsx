"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Mode = "normal" | "presigned";
type Stage = "idle" | "presign" | "upload" | "finalize";

type UploadEvent =
  | { type: "started"; courseId: string; totalFiles: number; fileName: string }
  | {
      type: "progress";
      uploadedFiles: number;
      totalFiles: number;
      currentFile: string;
      percent: number;
    }
  | { type: "complete"; success: true; course: unknown }
  | { type: "error"; message: string };

// The 3 steps shown in presigned mode, in order
const presignedSteps: { key: Exclude<Stage, "idle">; label: string }[] = [
  { key: "presign", label: "Get upload link" },
  { key: "upload", label: "Upload to storage" },
  { key: "finalize", label: "Create course" },
];

// PUT the zip straight to B2. XMLHttpRequest is used instead of fetch
// because fetch cannot report upload progress.
function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // must match the ContentType the server signed in the presign route
    xhr.setRequestHeader("Content-Type", "application/zip");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload to storage failed (status " + xhr.status + ")."));
      }
    };

    xhr.onerror = () =>
      reject(
        new Error("Upload to storage failed. Check the CORS rules on your B2 bucket.")
      );

    xhr.send(file);
  });
}

export function CourseUploadDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("normal");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // normal mode progress (server -> B2)
  const [percent, setPercent] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // presigned mode progress (browser -> B2)
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);

  function resetAll() {
    setTitle("");
    setDescription("");
    setFile(null);
    setLoading(false);
    setError(null);
    setPercent(0);
    setCurrentFile(null);
    setStage("idle");
    setUploadPercent(0);
  }

  // ---------- NORMAL: browser -> your API -> B2 ----------
  async function submitNormal(selectedFile: File) {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("file", selectedFile);

    const res = await fetch("/api/courses", {
      method: "POST",
      body: formData,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error ?? "Upload failed. Files over about 4 MB need Presigned upload."
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // ndjson: one JSON object per line, keep any partial line for next chunk
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const event: UploadEvent = JSON.parse(line);

        if (event.type === "progress") {
          setPercent(event.percent);
          setCurrentFile(event.currentFile);
        }

        if (event.type === "error") {
          throw new Error(event.message);
        }

        if (event.type === "complete") {
          return;
        }
      }
    }
  }

  // ---------- PRESIGNED: browser -> B2 directly ----------
  async function submitPresigned(selectedFile: File) {
    // step 1: ask your server for the temporary upload link
    setStage("presign");

    const presignRes = await fetch("/api/courses/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: selectedFile.name }),
    });

    if (!presignRes.ok) {
      const body = await presignRes.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not get an upload link.");
    }

    const { url, key } = await presignRes.json();

    // step 2: upload the zip straight to B2 with that link
    setStage("upload");
    setUploadPercent(0);
    await putWithProgress(url, selectedFile, setUploadPercent);

    // step 3: tell your server the zip is there, so it creates the course
    setStage("finalize");

    const finalizeRes = await fetch("/api/courses/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, title, description }),
    });

    if (!finalizeRes.ok) {
      const body = await finalizeRes.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not create the course.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setError("Choose a SCORM .zip file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setPercent(0);

    try {
      if (mode === "normal") {
        await submitNormal(file);
      } else {
        await submitPresigned(file);
      }

      setOpen(false);
      resetAll();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
      setStage("idle");
    }
  }

  const activeStepIndex = presignedSteps.findIndex((s) => s.key === stage);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // block closing while an upload is running
        if (loading) return;
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger render={<Button />}>Upload course</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a SCORM package</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* mode toggle */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  { value: "normal", label: "Normal upload" },
                  { value: "presigned", label: "Presigned upload" },
                ] as { value: Mode; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={loading}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                    mode === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {mode === "normal"
                ? "The file goes through the app. Best for small packages, under about 4 MB."
                : "The file goes straight to storage. Use this for large packages."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              placeholder="Intro to Excel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="What the learner will get out of this course"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">SCORM package (.zip)</Label>
            <Input
              id="file"
              type="file"
              accept=".zip"
              disabled={loading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            {file && !loading && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>

          {/* NORMAL mode: single progress bar */}
          {loading && mode === "normal" && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: percent + "%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {percent}%{currentFile ? " - " + currentFile : ""}
              </p>
            </div>
          )}

          {/* PRESIGNED mode: 3-step checklist */}
          {loading && mode === "presigned" && (
            <ul className="space-y-2 rounded-lg border border-border p-3">
              {presignedSteps.map((step, index) => {
                const isDone = index < activeStepIndex;
                const isActive = index === activeStepIndex;

                return (
                  <li key={step.key} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          isActive || isDone
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                        {step.key === "upload" && isActive
                          ? " - " + uploadPercent + "%"
                          : ""}
                      </span>
                    </div>

                    {step.key === "upload" && isActive && (
                      <div className="ml-6 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: uploadPercent + "%" }}
                        />
                      </div>
                    )}

                    {step.key === "finalize" && isActive && (
                      <p className="ml-6 text-xs text-muted-foreground">
                        Unzipping and saving files. This can take a minute for large packages.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}