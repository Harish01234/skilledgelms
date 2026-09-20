import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import * as unzipper from 'unzipper'
import { XMLParser } from 'fast-xml-parser'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // 1. Get uploaded FormData
    const formData = await request.formData()

    // "file" must match formData.append("file", file)
    const file = formData.get('file')

    // 2. Make sure a file was provided
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'SCORM ZIP file is required' },
        { status: 400 }
      )
    }

    // 3. Only allow ZIP files
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only ZIP files are allowed' },
        { status: 400 }
      )
    }

    // 4. Generate unique ID for this course
    const courseId = crypto.randomUUID()

    // 5. Create course storage folder
    const courseFolder = path.join(
      process.cwd(),
      'storage',
      'scorm',
      courseId
    )

    await fs.mkdir(courseFolder, {
      recursive: true,
    })

    // 6. Convert uploaded File into a Buffer
    const arrayBuffer = await file.arrayBuffer()
    const zipBuffer = Buffer.from(arrayBuffer)

    // 7. Open ZIP
    const directory = await unzipper.Open.buffer(zipBuffer)

    // 8. Extract files
    for (const entry of directory.files) {
      const entryPath = entry.path

      // Basic protection against unsafe absolute paths
      if (path.isAbsolute(entryPath)) {
        continue
      }

      const destination = path.resolve(
        courseFolder,
        entryPath
      )

      const relative = path.relative(
        courseFolder,
        destination
      )

      // Prevent files escaping our course folder
      if (
        relative.startsWith('..') ||
        path.isAbsolute(relative)
      ) {
        continue
      }

      // If it's a folder, create it
      if (entry.type === 'Directory') {
        await fs.mkdir(destination, {
          recursive: true,
        })

        continue
      }

      // Make sure parent folder exists
      await fs.mkdir(path.dirname(destination), {
        recursive: true,
      })

      // Extract file
      const content = await entry.buffer()

      await fs.writeFile(
        destination,
        content
      )
    }

    // 9. Find imsmanifest.xml
    const manifestPath = path.join(
      courseFolder,
      'imsmanifest.xml'
    )

    // 10. Read XML as text
    const manifestXml = await fs.readFile(
      manifestPath,
      'utf-8'
    )

    // 11. Create XML parser
    const parser = new XMLParser({
      ignoreAttributes: false,
    })

    // 12. Convert XML into JavaScript object
    const manifest = parser.parse(manifestXml)

    // For now, inspect what your real SCORM package contains
    console.log(
      'PARSED SCORM MANIFEST:',
      JSON.stringify(manifest, null, 2)
    )

    const resource =
  manifest.manifest.resources.resource

const launchFile = resource['@_href']

console.log('SCORM LAUNCH FILE:', launchFile)

const launchUrl =
  `/api/scorm/content/${courseId}/${launchFile}`

    // 13. Send response back to FileUploader
    return NextResponse.json({
        success: true,
        courseId,
        originalFileName: file.name,
        launchFile,
        launchUrl,
      })
  } catch (error) {
    console.error(
      'SCORM upload failed:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload SCORM package',
      },
      { status: 500 }
    )
  }
}