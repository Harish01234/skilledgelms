'use client'

import { useEffect, useState } from 'react'

type ScormPlayerV2Props = {
  launchUrl: string
  courseId: string
}

export default function ScormPlayerV2({
  launchUrl,
  courseId,
}: ScormPlayerV2Props) {
  const [apiReady, setApiReady] = useState(false)

  useEffect(() => {
    let attemptId: string | null = null

    // in-memory buffer, same role as your original runtimeData object —
    // filled by SetValue, flushed to the server by Commit
    const runtimeData: Record<string, string> = {}

    function buildCommitPayload() {
      return {
        attemptId,
        status: runtimeData['cmi.core.lesson_status'],
        score: runtimeData['cmi.core.score.raw']
          ? Number(runtimeData['cmi.core.score.raw'])
          : undefined,
        lessonLocation: runtimeData['cmi.core.lesson_location'],
        suspendData: runtimeData['cmi.suspend_data'],
      }
    }

    // Fires when the tab is actually closing / being navigated away from.
    // LMSFinish only runs if the SCORM content itself calls it (e.g. an
    // "Exit" button inside the course) — a plain tab close never reaches
    // that code, so nothing would get saved without this.
    function handleBeforeUnload() {
      if (!attemptId) return

      // navigator.sendBeacon instead of fetch: a normal fetch can get
      // killed mid-flight when the browser is closing the page, but
      // sendBeacon is built specifically to reliably deliver a small
      // payload even as the page unloads.
      const payload = JSON.stringify(buildCommitPayload())

      navigator.sendBeacon(
        '/api/scorm/commit',
        new Blob([payload], { type: 'application/json' })
      )
    }

    async function setup() {
      // 1. Ask the server for this student's attempt on this course.
      //    This REPLACES localStorage.getItem('scorm-runtime').
      //    The server creates one if it doesn't exist yet.
      const res = await fetch('/api/scorm/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })

      const attempt = await res.json()

      console.log('Loaded attempt from server:', attempt)

      // 2. Remember the attempt's id — every future commit needs it
      //    to know WHICH row to update.
      attemptId = attempt.id

      // 3. Pre-fill the in-memory buffer with whatever the server
      //    already had saved, so GetValue can answer correctly
      //    the moment the course asks.
      runtimeData['cmi.core.student_id'] = attempt.userId ?? ''
      runtimeData['cmi.core.lesson_status'] = attempt.status ?? 'not attempted'
      runtimeData['cmi.core.lesson_location'] = attempt.lessonLocation ?? ''
      runtimeData['cmi.core.score.raw'] =
        attempt.score !== null && attempt.score !== undefined
          ? String(attempt.score)
          : ''
      runtimeData['cmi.suspend_data'] = attempt.suspendData ?? ''

      // 4. Create the SCORM 1.2 API — same shape as before, only the
      //    inside of LMSCommit/LMSFinish changed (network call instead
      //    of localStorage.setItem).
      window.API = {
        LMSInitialize: () => {
          console.log('LMSInitialize')
          return 'true'
        },

        LMSGetValue: (element: string) => {
          const value = runtimeData[element] ?? ''
          console.log('LMSGetValue:', element, '→', value)
          return value
        },

        LMSSetValue: (element: string, value: string) => {
          console.log('LMSSetValue:', element, value)
          runtimeData[element] = value
          return 'true'
        },

        LMSCommit: () => {
          console.log('LMSCommit:', runtimeData)

          // 5. THIS is the actual replacement for
          //    localStorage.setItem('scorm-runtime', ...).
          //    Fire-and-forget is fine for a Commit — SCORM doesn't
          //    wait for it, it just expects "true" back immediately.
          fetch('/api/scorm/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildCommitPayload()),
          }).then(() => {
            console.log('Saved to server')
          })

          return 'true'
        },

        LMSFinish: () => {
          console.log('LMSFinish:', runtimeData)

          // Same save, one last time on a proper in-course exit.
          fetch('/api/scorm/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildCommitPayload()),
          })

          return 'true'
        },

        LMSGetLastError: () => {
          return '0'
        },

        LMSGetErrorString: () => {
          return 'No error'
        },

        LMSGetDiagnostic: () => {
          return 'No error'
        },
      }

      // 6. Only now allow the iframe to load — same rule as before,
      //    just gated on an awaited fetch instead of a sync localStorage read.
      setApiReady(true)
    }

    setup()

    // Catches the "just closed the tab" case that LMSFinish can't.
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      delete window.API
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [courseId])

  if (!apiReady) {
    return <p>Loading SCORM...</p>
  }

  return (
    <iframe
      src={launchUrl}
      className="h-[700px] w-full border-0"
      title="SCORM Course"
    />
  )
}