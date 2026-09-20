import {
    GetObjectCommand,
    ListObjectsV2Command,
  } from '@aws-sdk/client-s3'
  
  import { XMLParser } from 'fast-xml-parser'
  
  import {
    b2,
    B2_BUCKET_NAME,
  } from '@/lib/b2'
  
  export const runtime = 'nodejs'
  
  export async function GET() {
    try {
      // --------------------------------
      // 1. Find course folders in B2
      // --------------------------------
  
      const result = await b2.send(
        new ListObjectsV2Command({
          Bucket: B2_BUCKET_NAME,
          Prefix: 'courses/',
          Delimiter: '/',
        })
      )
  
      /*
        CommonPrefixes should look like:
  
        courses/abc123/
        courses/xyz456/
      */
  
      const folders =
        result.CommonPrefixes ?? []
  
      const courses = []
  
      // --------------------------------
      // 2. Loop through each course
      // --------------------------------
  
      for (const folder of folders) {
        if (!folder.Prefix) continue
  
        const parts =
          folder.Prefix.split('/')
  
        const courseId = parts[1]
  
        if (!courseId) continue
  
        // --------------------------------
        // 3. Read imsmanifest.xml
        // --------------------------------
  
        const manifestKey =
          `courses/${courseId}/imsmanifest.xml`
  
        try {
          const manifestResult =
            await b2.send(
              new GetObjectCommand({
                Bucket: B2_BUCKET_NAME,
                Key: manifestKey,
              })
            )
  
          if (!manifestResult.Body) {
            continue
          }
  
          const manifestXml =
            await manifestResult.Body.transformToString()
  
          // --------------------------------
          // 4. Parse manifest
          // --------------------------------
  
          const parser = new XMLParser({
            ignoreAttributes: false,
          })
  
          const manifest =
            parser.parse(manifestXml)
  
          const resources =
            manifest?.manifest
              ?.resources
              ?.resource
  
          if (!resources) continue
  
          const resource =
            Array.isArray(resources)
              ? resources.find(
                  (item) =>
                    item['@_href']
                )
              : resources
  
          const launchFile =
            resource?.['@_href']
  
          if (!launchFile) continue
  
          // --------------------------------
          // 5. Try to get course title
          // --------------------------------
  
          const organizations =
            manifest?.manifest
              ?.organizations
              ?.organization
  
          const organization =
            Array.isArray(organizations)
              ? organizations[0]
              : organizations
  
          const title =
            organization?.title ??
            `Course ${courseId}`
  
          // --------------------------------
          // 6. Add course
          // --------------------------------
  
          courses.push({
            courseId,
            title,
            launchFile,
  
            launchUrl:
              `/api/b2/scorm/content/${courseId}/${launchFile}`,
          })
        } catch (error) {
          console.error(
            `Failed to read course ${courseId}:`,
            error
          )
        }
      }
  
      // --------------------------------
      // 7. Return course catalogue
      // --------------------------------
  
      return Response.json({
        success: true,
        total: courses.length,
        courses,
      })
    } catch (error) {
      console.error(
        'Failed to load B2 courses:',
        error
      )
  
      return Response.json(
        {
          success: false,
          error: 'Failed to load courses',
        },
        {
          status: 500,
        }
      )
    }
  }