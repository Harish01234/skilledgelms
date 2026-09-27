
import Link from 'next/link'

import { AdminUsers } from '@/components/admin-users'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function AdminPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
          <CardDescription>
            Create and manage courses for your learners.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Link
            href="/admin/courses"
            className={buttonVariants()}
          >
            Create Course
          </Link>
        </CardContent>
      </Card>

      <AdminUsers />
    </div>
  )
}

export default AdminPage

