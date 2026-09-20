import { Play, FileCode2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ScormCourse = {
  courseId: string
  title: string
  launchFile: string
  launchUrl: string
}

type ScormCourseCardProps = {
  course: ScormCourse
  onPlay: (course: ScormCourse) => void
}

export function ScormCourseCard({
  course,
  onPlay,
}: ScormCourseCardProps) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Course visual area */}
      <div className="relative flex h-44 items-center justify-center bg-muted">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-sm">
          <FileCode2 className="h-8 w-8 text-primary" />
        </div>

        <Badge
          variant="secondary"
          className="absolute left-4 top-4"
        >
          SCORM
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg leading-6">
          {course.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="truncate text-xs text-muted-foreground">
          Course ID: {course.courseId}
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Launch file: {course.launchFile}
        </p>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onPlay(course)}
        >
          <Play className="mr-2 h-4 w-4" />
          Launch Course
        </Button>
      </CardFooter>
    </Card>
  )
}