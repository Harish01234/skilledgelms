import { S3Client } from '@aws-sdk/client-s3'

export const b2 = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: 'us-east-005',

  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
})

export const B2_BUCKET_NAME =
  process.env.B2_BUCKET_NAME!