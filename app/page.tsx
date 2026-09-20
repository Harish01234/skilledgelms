import FileUploader from '@/components/FileUploader'
import { ThemeToggle } from '@/components/theme-toggle'
import { Input } from '@/components/ui/input'
import React from 'react'
import ScormPlayer from '@/components/ScormPlayer'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <h1 className="mb-8 text-4xl font-bold text-primary">
        It's an LMS
      </h1>

      <div className="w-full max-w-5xl space-y-6">

        {/* File upload section */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Upload SCORM Course
          </h2>

          {/* We will add file upload here */}
          <FileUploader />
         
        </div>

        {/* SCORM player section */}
        <div className="h-[500px] rounded-lg border">
          {/* SCORM iframe will come here */}
          <ScormPlayer 
          launchUrl="/api/scorm/content/1b6ced47-3ac7-4c7e-84e2-1c76ba2c9b42/index_lms.html"
          />
        </div>

      </div>
    </div>
  )
}

export default HomePage