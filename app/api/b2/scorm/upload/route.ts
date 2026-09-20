import crypto from 'crypto'
import * as unzipper from 'unzipper'
import { XMLParser } from 'fast-xml-parser'
import { PutObjectCommand } from '@aws-sdk/client-s3'

import { b2, B2_BUCKET_NAME } from '@/lib/b2'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`${JSON.stringify(data)}\n`)
        )
      }

      try {
        // -----------------------------
        // 1. Receive ZIP
        // -----------------------------

        const formData = await request.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
          send({
            type: 'error',
            message: 'SCORM ZIP file is required',
          })

          controller.close()
          return
        }

        if (!file.name.toLowerCase().endsWith('.zip')) {
          send({
            type: 'error',
            message: 'Only ZIP files are allowed',
          })

          controller.close()
          return
        }

        // -----------------------------
        // 2. Generate course ID
        // -----------------------------

        const courseId = crypto.randomUUID()

        // -----------------------------
        // 3. Open ZIP
        // -----------------------------

        const arrayBuffer = await file.arrayBuffer()
        const zipBuffer = Buffer.from(arrayBuffer)

        const directory =
          await unzipper.Open.buffer(zipBuffer)

        const files = directory.files.filter(
          (entry) => entry.type !== 'Directory'
        )

        const totalFiles = files.length

        send({
          type: 'started',
          courseId,
          totalFiles,
          fileName: file.name,
        })

        // -----------------------------
        // 4. Find manifest
        // -----------------------------

        const manifestEntry = files.find(
          (entry) =>
            entry.path
              .replace(/\\/g, '/')
              .toLowerCase() === 'imsmanifest.xml'
        )

        if (!manifestEntry) {
          send({
            type: 'error',
            message: 'imsmanifest.xml not found',
          })

          controller.close()
          return
        }

        const manifestBuffer =
          await manifestEntry.buffer()

        const manifestXml =
          manifestBuffer.toString('utf-8')

        // -----------------------------
        // 5. Parse manifest
        // -----------------------------

        const parser = new XMLParser({
          ignoreAttributes: false,
        })

        const manifest = parser.parse(manifestXml)

        const resources =
          manifest?.manifest?.resources?.resource

        if (!resources) {
          send({
            type: 'error',
            message: 'No SCORM resources found',
          })

          controller.close()
          return
        }

        const resource = Array.isArray(resources)
          ? resources.find(
              (item) => item['@_href']
            )
          : resources

        const launchFile = resource?.['@_href']

        if (!launchFile) {
          send({
            type: 'error',
            message: 'Launch file not found',
          })

          controller.close()
          return
        }

        // -----------------------------
        // 6. Upload to B2
        // 4 files simultaneously
        // -----------------------------

        const batchSize = 40

        let uploadedFiles = 0

        for (
          let i = 0;
          i < files.length;
          i += batchSize
        ) {
          const batch = files.slice(
            i,
            i + batchSize
          )

          await Promise.all(
            batch.map(async (entry) => {
              const entryPath =
                entry.path.replace(/\\/g, '/')

              const pathParts =
                entryPath.split('/')

              if (
                entryPath.startsWith('/') ||
                pathParts.includes('..')
              ) {
                throw new Error(
                  `Unsafe ZIP path: ${entryPath}`
                )
              }

              const content =
                await entry.buffer()

              const key =
                `courses/${courseId}/${entryPath}`

              await b2.send(
                new PutObjectCommand({
                  Bucket: B2_BUCKET_NAME,
                  Key: key,
                  Body: content,
                  ContentType:
                    getContentType(entryPath),
                })
              )

              uploadedFiles++

              const percent = Math.round(
                (uploadedFiles / totalFiles) * 100
              )

              console.log(
                `B2: ${uploadedFiles}/${totalFiles}`
              )

              // IMPORTANT:
              // send B2 progress to browser
              send({
                type: 'progress',
                uploadedFiles,
                totalFiles,
                percent,
                currentFile: entryPath,
              })
            })
          )
        }

        // -----------------------------
        // 7. Finished
        // -----------------------------

        const launchUrl =
          `/api/b2/scorm/content/${courseId}/${launchFile}`

        send({
          type: 'complete',
          success: true,
          courseId,
          totalFiles,
          uploadedFiles,
          launchFile,
          launchUrl,
        })

        controller.close()
      } catch (error) {
        console.error(
          'B2 SCORM upload failed:',
          error
        )

        send({
          type: 'error',
          message: 'Failed to upload SCORM package',
        })

        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':
        'application/x-ndjson; charset=utf-8',

      'Cache-Control': 'no-cache',
    },
  })
}

function getContentType(
  filePath: string
): string {
  const extension =
    filePath
      .split('.')
      .pop()
      ?.toLowerCase() ?? ''

  const contentTypes: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',

    js: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',

    json: 'application/json',
    xml: 'application/xml',

    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',

    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',

    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  }

  return (
    contentTypes[extension] ??
    'application/octet-stream'
  )
}