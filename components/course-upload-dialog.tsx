"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function CourseUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  function reset() {
    setLoading(false);
    setError(null);
    setPercent(0);
    setCurrentFile(null);
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

    const formData = new FormData(e.currentTarget);
    formData.set("file", file);

    const res = await fetch("/api/courses", {
      method: "POST",
      body: formData,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed. Check the package and try again.");
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // ndjson: split on newlines, keep any partial line in buffer
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
          setError(event.message);
          setLoading(false);
          return;
        }

        if (event.type === "complete") {
          setOpen(false);
          setFile(null);
          reset();
          router.refresh();
          return;
        }
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          setOpen(next);
          if (!next) reset();
        }
      }}
    >
      <DialogTrigger render={<Button />}>Upload course</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a SCORM package</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              disabled={loading}
              placeholder="Intro to Excel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
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
              <p className="text-xs text-muted-foreground">{file.name}</p>
            )}
          </div>

          {loading && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {percent}%{currentFile ? ` — ${currentFile}` : ""}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? `Uploading… ${percent}%` : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}