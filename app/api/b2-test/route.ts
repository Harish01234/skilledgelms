import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { b2, B2_BUCKET_NAME } from '@/lib/b2'

export async function GET() {
  try {
    await b2.send(
      new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: 'test.txt',
        Body: 'Hello from my Next.js LMS!',
        ContentType: 'text/plain',
      })
    )

    return NextResponse.json({
      success: true,
      message: 'File uploaded to B2',
    })
  } catch (error) {
    console.error('B2 upload error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'B2 upload failed',
      },
      { status: 500 }
    )
  }
}