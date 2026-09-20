'use client'

import React, { useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function ScormUploadWithProgress() {
  const [file, setFile] =
    useState<File | null>(null)

  const [b2Progress, setB2Progress] =
    useState(0)

  const [uploadedFiles, setUploadedFiles] =
    useState(0)

  const [totalFiles, setTotalFiles] =
    useState(0)

  const [uploading, setUploading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0]

    if (!selectedFile) return

    setFile(selectedFile)

    setB2Progress(0)
    setUploadedFiles(0)
    setTotalFiles(0)
    setMessage('')
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setB2Progress(0)
      setUploadedFiles(0)
      setTotalFiles(0)

      setMessage(
        'Sending package to server...'
      )

      const formData = new FormData()

      formData.append('file', file)

      const response = await fetch(
        '/api/b2/scorm/upload',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(
          'Upload request failed'
        )
      }

      if (!response.body) {
        throw new Error(
          'Streaming response not available'
        )
      }

      // -----------------------------
      // Read server stream
      // -----------------------------

      const reader =
        response.body.getReader()

      const decoder =
        new TextDecoder()

      let buffer = ''

      while (true) {
        const { done, value } =
          await reader.read()

        if (done) break

        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        )

        const lines =
          buffer.split('\n')

        // Last item may be incomplete JSON
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue

          const data =
            JSON.parse(line)

          // ---------------------------
          // Server started processing
          // ---------------------------

          if (data.type === 'started') {
            setTotalFiles(
              data.totalFiles
            )

            setMessage(
              'Uploading extracted files to B2...'
            )
          }

          // ---------------------------
          // B2 progress
          // ---------------------------

          if (data.type === 'progress') {
            setUploadedFiles(
              data.uploadedFiles
            )

            setTotalFiles(
              data.totalFiles
            )

            setB2Progress(
              data.percent
            )
          }

          // ---------------------------
          // Finished
          // ---------------------------

          if (data.type === 'complete') {
            setB2Progress(100)

            setMessage(
              'SCORM course uploaded successfully'
            )

            console.log(
              'SCORM result:',
              data
            )
          }

          // ---------------------------
          // Error
          // ---------------------------

          if (data.type === 'error') {
            throw new Error(
              data.message
            )
          }
        }
      }
    } catch (error) {
      console.error(error)

      setMessage(
        'SCORM upload failed'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-xl rounded-xl border border-dashed p-8">

      <div className="flex flex-col items-center gap-4 text-center">

        <UploadCloud className="size-10 text-muted-foreground" />

        <div>
          <h3 className="font-semibold">
            Upload SCORM Package
          </h3>

          <p className="text-sm text-muted-foreground">
            Upload a SCORM ZIP package to
            Backblaze B2
          </p>
        </div>

        <Input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={uploading}
          className="max-w-sm"
        />

        {file && (
          <p className="text-sm text-muted-foreground">
            Selected:{' '}
            <span className="font-medium">
              {file.name}
            </span>
          </p>
        )}

        {/* B2 progress */}

        {uploading && (
          <div className="w-full max-w-sm space-y-3">

            <div className="flex justify-between text-sm">
              <span>
                Uploading to B2
              </span>

              <span>
                {b2Progress}%
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">

              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width:
                    `${b2Progress}%`,
                }}
              />

            </div>

            {totalFiles > 0 && (
              <p className="text-sm text-muted-foreground">
                {uploadedFiles} /{' '}
                {totalFiles} files uploaded
              </p>
            )}

          </div>
        )}

        {message && (
          <p className="text-sm">
            {message}
          </p>
        )}

        <Button
          onClick={handleUpload}
          disabled={
            !file || uploading
          }
        >
          {uploading
            ? `Uploading ${b2Progress}%`
            : 'Upload Course'}
        </Button>

      </div>

    </div>
  )
}

export default ScormUploadWithProgress