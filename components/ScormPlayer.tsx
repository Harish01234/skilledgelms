'use client'

import { useEffect, useState } from 'react'

type ScormPlayerProps = {
  launchUrl: string
}

export default function ScormPlayer({
  launchUrl,
}: ScormPlayerProps) {
  const [apiReady, setApiReady] = useState(false)

  useEffect(() => {
    // 1. Try to get previously saved SCORM data
    const savedData = localStorage.getItem('scorm-runtime')

    // 2. If saved data exists, restore it.
    // Otherwise create fresh runtime data.
    const runtimeData: Record<string, string> = savedData
      ? JSON.parse(savedData)
      : {
          'cmi.core.student_id': '1',
          'cmi.core.student_name': 'Demo User',
          'cmi.core.lesson_status': 'not attempted',
          'cmi.core.lesson_location': '',
          'cmi.core.score.raw': '',
          'cmi.suspend_data': '',
        }

    console.log('Initial runtime data:', runtimeData)

    // 3. Create SCORM 1.2 API
    window.API = {
      LMSInitialize: () => {
        console.log('LMSInitialize')

        return 'true'
      },

      LMSGetValue: (element: string) => {
        const value = runtimeData[element] ?? ''

        console.log(
          'LMSGetValue:',
          element,
          '→',
          value
        )

        return value
      },

      LMSSetValue: (
        element: string,
        value: string
      ) => {
        console.log(
          'LMSSetValue:',
          element,
          value
        )

        runtimeData[element] = value

        return 'true'
      },

      LMSCommit: () => {
        console.log(
          'LMSCommit:',
          runtimeData
        )

        // 4. Save latest runtime data
        localStorage.setItem(
          'scorm-runtime',
          JSON.stringify(runtimeData)
        )

        console.log('Saved to localStorage')

        return 'true'
      },

      LMSFinish: () => {
        console.log(
          'LMSFinish:',
          runtimeData
        )

        // Also save when course finishes
        localStorage.setItem(
          'scorm-runtime',
          JSON.stringify(runtimeData)
        )

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

    // 5. Only now allow iframe to load
    setApiReady(true)

    return () => {
      delete window.API
    }
  }, [])

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