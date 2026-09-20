'use client'

import React, { useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function FileUploader() {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) return

    setFile(selectedFile)

    console.log('Selected file:', selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return
  
    const formData = new FormData()
  
    formData.append('file', file)
  
    const response = await fetch('/api/scorm/upload', {
      method: 'POST',
      body: formData,
    })
  
    const result = await response.json()
  
    console.log(result)
  }

  return (
    <div className="w-full rounded-xl border border-dashed p-8">
      <div className="flex flex-col items-center justify-center gap-4 text-center">

        <UploadCloud className="size-10 text-muted-foreground" />

        <div>
          <h3 className="font-semibold">
            Upload SCORM Package
          </h3>

          <p className="text-sm text-muted-foreground">
            Select a SCORM ZIP file to upload
          </p>
        </div>

        <Input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
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

        <Button
          onClick={handleUpload}
          disabled={!file}
        >
          Upload Course
        </Button>

      </div>
    </div>
  )
}

export default FileUploader