"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type User = { id: string; name: string; email: string };
type Enrollment = { id: string; user: User };

export function CourseAssignDialog({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch(`/api/enrollments?courseId=${courseId}`).then((r) => r.json()),
    ]).then(([usersData, enrollmentsData]) => {
      setUsers(usersData);
      setEnrollments(enrollmentsData);
    });
  }, [open, courseId]);

  const enrolledIds = new Set(enrollments.map((e) => e.user.id));
  const availableUsers = users.filter((u) => !enrolledIds.has(u.id));

  async function handleAssign() {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, userId: selectedUserId }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to assign student.");
      return;
    }

    const newEnrollment = await res.json();
    const assignedUser = users.find((u) => u.id === selectedUserId);
    if (assignedUser) {
      setEnrollments((prev) => [
        ...prev,
        { id: newEnrollment.id, user: assignedUser },
      ]);
    }
    setSelectedUserId("");
  }

  async function handleRemove(enrollmentId: string) {
    await fetch(`/api/enrollments/${enrollmentId}`, { method: "DELETE" });
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign students</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a student…</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || loading}
            >
              Assign
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Enrolled ({enrollments.length})
            </p>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {enrollments.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      {e.user.name}{" "}
                      <span className="text-muted-foreground">
                        ({e.user.email})
                      </span>
                    </span>
                    <button
                      onClick={() => handleRemove(e.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}