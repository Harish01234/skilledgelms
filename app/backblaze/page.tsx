'use client'

import { useEffect, useState } from 'react'

import ScormUploadWithProgress from '@/components/ScormUploadWithProgress'
import { ScormCourseCard } from '@/components/ScormCourseCard'
import ScormPlayer from '@/components/ScormPlayer'

type ScormCourse = {
  courseId: string
  title: string
  launchFile: string
  launchUrl: string
}

function Backblaze() {
  const [courses, setCourses] = useState<ScormCourse[]>([])
  const [selectedCourse, setSelectedCourse] =
    useState<ScormCourse | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch(
          '/api/b2/scorm/courses'
        )

        if (!response.ok) {
          throw new Error('Failed to load courses')
        }

        const data = await response.json()

        setCourses(data.courses)
      } catch (error) {
        console.error(
          'Failed to load courses:',
          error
        )
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  return (
    <div className="space-y-10 p-6">
      {/* Upload */}
      <section>
        <h1 className="mb-6 text-2xl font-bold">
          Backblaze SCORM Upload
        </h1>

        <ScormUploadWithProgress />
      </section>

      {/* Courses */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">
            My Courses
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            SCORM courses uploaded to Backblaze B2
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading courses...
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <ScormCourseCard
                key={course.courseId}
                course={course}
                onPlay={(course) => {
                  setSelectedCourse(course)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* SCORM Player */}
      {selectedCourse && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {selectedCourse.title}
            </h2>

            <p className="text-sm text-muted-foreground">
              SCORM Player
            </p>
          </div>

          <div className="h-[700px] overflow-hidden rounded-lg border">
            <ScormPlayer
              launchUrl={selectedCourse.launchUrl}
            />
          </div>
        </section>
      )}
    </div>
  )
}

export default Backblaze