import {
    GetObjectCommand,
  } from '@aws-sdk/client-s3'
  
  import {
    b2,
    B2_BUCKET_NAME,
  } from '@/lib/b2'
  
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
      const { courseId, filePath } =
        await params
  
      const key =
        `courses/${courseId}/${filePath.join('/')}`
  
      const result = await b2.send(
        new GetObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: key,
        })
      )
  
      if (!result.Body) {
        return new Response(
          'File not found',
          { status: 404 }
        )
      }
  
      const bytes =
        await result.Body.transformToByteArray()
  
      // Convert Uint8Array → ArrayBuffer
      const arrayBuffer =
        new ArrayBuffer(bytes.byteLength)
  
      new Uint8Array(arrayBuffer).set(bytes)
  
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type':
            result.ContentType ??
            'application/octet-stream',
        },
      })
    } catch (error) {
      console.error(
        'B2 SCORM content error:',
        error
      )
  
      return new Response(
        'SCORM file not found',
        { status: 404 }
      )
    }
  }