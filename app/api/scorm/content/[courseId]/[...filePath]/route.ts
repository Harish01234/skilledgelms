import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type RouteParams = {
  params: Promise<{
    courseId: string
    filePath: string[]
  }>
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    // 1. Get courseId and requested file path from URL
    const { courseId, filePath } = await params

    // 2. Find this course's folder
    const courseFolder = path.resolve(
      process.cwd(),
      'storage',
      'scorm',
      courseId
    )

    // 3. Build the actual file path
    const requestedFile = path.resolve(
      courseFolder,
      ...filePath
    )

    // 4. Security check:
    // Don't allow access outside this course folder
    const relativePath = path.relative(
      courseFolder,
      requestedFile
    )

    if (
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath)
    ) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // 5. Read the actual file
    const file = await fs.readFile(requestedFile)

    // 6. Work out what type of file it is
    const extension = path
      .extname(requestedFile)
      .toLowerCase()

    const contentTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    }

    const contentType =
      contentTypes[extension] ??
      'application/octet-stream'

    // 7. Send the actual file to the browser
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    console.error('SCORM file serving error:', error)

    return NextResponse.json(
      {
        error: 'SCORM file not found',
      },
      {
        status: 404,
      }
    )
  }
}